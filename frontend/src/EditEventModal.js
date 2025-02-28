import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import loadingGif from './gif/loading.gif';
import './ModalTheme.css';

dayjs.extend(utc);

/** Convert a UTC "HH:mm" + date => local "HH:mm" string. */
function utcToLocalTimeLabel(utcHHmm, dateYYYYMMDD) {
  const [year, month, day] = dateYYYYMMDD.split('-').map(Number);
  const [utcH, utcM] = utcHHmm.split(':').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, utcH, utcM, 0));
  const localH = utcDate.getHours();
  const localM = utcDate.getMinutes();
  return `${String(localH).padStart(2, '0')}:${String(localM).padStart(2, '0')}`;
}

/** Convert local date/time => UTC ISO. E.g. "2025-02-28" + "10:30" => "2025-02-28T02:30:00.000Z". */
function localToUTCISO(dateYYYYMMDD, localHHmm) {
  const [year, month, day] = dateYYYYMMDD.split('-').map(Number);
  const [h, m] = localHHmm.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, h, m, 0);
  return localDate.toISOString();
}

function EditEventModal({
  show,
  onClose,
  onUpdate,         // parent's handleUpdateEvent() => uses formData
  onDelete,         // parent's handleDeleteEvent()
  formData,
  setFormData,
  isAdmin,
  currentUserEmail,
}) {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  // Steps: 1=basic info, 2=calendar/time
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingTypes, setBookingTypes] = useState([]);
  const [emailError, setEmailError] = useState('');

  // The date the user has selected in the Calendar
  const [calendarDate, setCalendarDate] = useState(null);
  // Timeslots for the chosen date
  const [timeSlots, setTimeSlots] = useState([]);

  // Keep track of the event's original day so we only show "(current)" if the user remains on that day
  const originalDayRef = useRef('');
  const token = localStorage.getItem('token');

  const hasInitialized = useRef(false);

  /* ====================== 1) FETCH BOOKING TYPES ON MOUNT ====================== */
  useEffect(() => {
    const fetchBookingTypes = async () => {
      try {
        const res = await fetch(`${API_URL}/api/booking-types`);
        if (!res.ok) throw new Error('Failed to fetch booking types');
        const data = await res.json();
        setBookingTypes(data);
      } catch (err) {
        console.error('Error fetching booking types:', err);
      }
    };
    fetchBookingTypes();
  }, [API_URL]);

  /* ====================== 2) LOCK EMAIL IF NOT ADMIN, RESET STEPS WHEN HIDDEN ====================== */
  useEffect(() => {
    if (!isAdmin && currentUserEmail) {
      setFormData(prev => ({ ...prev, email: currentUserEmail }));
    }
    if (!show) {
      setCurrentStep(1);
    }
  }, [isAdmin, currentUserEmail, setFormData, show]);

  /* ====================== 3) PARSE formData.start => local date/time ONCE ON OPEN ====================== */
  useEffect(() => {
    if (show && formData.start) {
      const localStart = dayjs.utc(formData.start).local(); // e.g. 2025-02-27T20:00:00Z => local
      const dateStr = localStart.format('YYYY-MM-DD'); // e.g. "2025-02-28"
      const timeStr = localStart.format('HH:mm');      // e.g. "09:00"

      originalDayRef.current = dateStr; // store the original day
      setFormData(prev => ({
        ...prev,
        date: prev.date || dateStr,
        time: prev.time || timeStr,
      }));
      setCalendarDate(localStart.toDate());
      hasInitialized.current = true;
    }
  }, [show, formData.start, setFormData]);

  /* ====================== 4) FETCH TIME SLOTS WHEN date + bookingTypeID CHANGE ====================== */
  useEffect(() => {
    if (formData.date && formData.bookingTypeId) {
      fetchAvailableTimes(formData.date, formData.bookingTypeId);
    } else {
      setTimeSlots([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.date, formData.bookingTypeId]);

  /* ====================== 5) FETCH AVAILABLE TIMES ====================== */
  const fetchAvailableTimes = async (chosenDate, bookingTypeId) => {
    try {
      let url;
      if (isAdmin) {
        // offset in minutes => e.g. -300 for UTC-5
        const offset = -new Date().getTimezoneOffset();
        url = `${API_URL}/api/admin/events/available?date=${chosenDate}&bookingTypeId=${bookingTypeId}&offset=${offset}`;
      } else {
        url = `${API_URL}/api/events/available?date=${chosenDate}&bookingTypeId=${bookingTypeId}`;
      }

      // If admin => pass token in headers
      const headers = isAdmin
        ? { Authorization: `Bearer ${token}` }
        : {};

      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Failed to load available times (HTTP ${res.status})`);
      }
      const data = await res.json();

      // Convert returned UTC "HH:MM" => local times
      let mapped = (data.availableTimes || []).map(utcString => {
        const localLabel = utcToLocalTimeLabel(utcString, chosenDate);
        return { utc: utcString, local: localLabel, existing: false };
      });

      // Sort by local time ascending
      mapped.sort((a, b) => {
        const [aH, aM] = a.local.split(':').map(Number);
        const [bH, bM] = b.local.split(':').map(Number);
        return (aH * 60 + aM) - (bH * 60 + bM);
      });

      // Filter out times behind local now if it's "today" in local terms
      const now = new Date();
      const nowLocalYear  = now.getFullYear();
      const nowLocalMonth = now.getMonth();
      const nowLocalDay   = now.getDate();

      const chosenYear  = parseInt(chosenDate.slice(0, 4), 10);
      const chosenMonth = parseInt(chosenDate.slice(5, 7), 10) - 1;
      const chosenDay   = parseInt(chosenDate.slice(8, 10), 10);

      const isTodayLocal = (
        nowLocalYear === chosenYear &&
        nowLocalMonth === chosenMonth &&
        nowLocalDay === chosenDay
      );

      if (isTodayLocal) {
        const nowLocalTotalMins = now.getHours() * 60 + now.getMinutes();
        mapped = mapped.filter(slot => {
          const [h, m] = slot.local.split(':').map(Number);
          const slotTotal = h * 60 + m;
          return slotTotal >= nowLocalTotalMins;
        });
      }

      setTimeSlots(mapped);
    } catch (error) {
      console.error('Error fetching available times:', error);
      setTimeSlots([]);
    }
  };

  /* ====================== 6) SHOW "(current)" TIME ONLY IF STILL ON ORIGINAL DAY ====================== */
  useEffect(() => {
    if (!formData.time || !formData.date) return;
    // If user changed day away from original, don't show (current)
    if (originalDayRef.current !== formData.date) return;

    // If the user's chosen time isn't in the new list, add it
    const found = timeSlots.some(ts => ts.local === formData.time);
    if (!found) {
      setTimeSlots(prev => [
        { utc: 'CURRENT', local: formData.time, existing: true },
        ...prev
      ]);
    }
  }, [timeSlots, formData.time, formData.date]);

  /* ====================== 7) STOP IF NOT SHOWING ====================== */
  if (!show) return null;

  /* ====================== 8) VALIDATION ====================== */
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email)) {
      setEmailError('');
      return true;
    } else {
      setEmailError('Invalid email format');
      return false;
    }
  };

  const isStep1Valid = () => {
    const { fullName, phone, bookingTypeId, email } = formData;
    if (!fullName?.trim() || !phone?.trim() || !bookingTypeId) return false;
    if (isAdmin && (!email || emailError)) return false;
    return true;
  };

  const isStep2Valid = () => formData.date && formData.time;

  /* ====================== 9) CALENDAR ONCHANGE ====================== */
  const handleCalendarChange = (date) => {
    setCalendarDate(date);
    if (!date) {
      setFormData(prev => ({ ...prev, date: '', time: '' }));
      setTimeSlots([]);
      return;
    }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;

    // If user picks a new date, clear the old time
    setFormData(prev => ({ ...prev, date: isoDate, time: '' }));
    setTimeSlots([]);
  };

  /* ====================== 10) STEP NAVIGATION ====================== */
  const handleNext = async () => {
    if (loading) return;

    if (currentStep === 1) {
      // Step 1 => validate => go Step 2
      if (!isStep1Valid()) return;
      setCurrentStep(2);

    } else if (currentStep === 2) {
      // Final => parent's onUpdate
      if (!isStep2Valid()) return;
      setLoading(true);
      try {
        // Build new object with updated start
        const finalStart = localToUTCISO(formData.date, formData.time);
        const updatedData = { ...formData, start: finalStart };

        // Now call parent's handleUpdateEvent => sees updated parent's formData
        const result = await onUpdate(updatedData);
        if (result && !result.error) {
          setCurrentStep(1);
          onClose();
        }
      } catch (err) {
        console.error('Error updating event:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(s => s - 1);
    }
  };

  /* ====================== 11) DELETE ====================== */
  const handleDelete = async () => {
    if (loading) return;
    const confirmed = window.confirm(
      'Are you sure you want to delete this event? This cannot be undone.'
    );
    if (!confirmed) return;
    setLoading(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      console.error('Error deleting event:', err);
    } finally {
      setLoading(false);
    }
  };

  /* ====================== 12) RENDER ====================== */
  const modalClasses = `myModalContent ${currentStep === 2 ? 'step2-expanded' : ''}`;

  return (
    <div className="myModalOverlay" onClick={onClose}>
      <motion.div
        className={modalClasses}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* "X" close button */}
        <button
          type="button"
          className="myCloseButton"
          onClick={() => {
            setCurrentStep(1);
            onClose();
          }}
        >
          &times;
        </button>

        <h2 className="myModalTitle">Edit Event</h2>

        <div className="step-content-container">
          {/* STEP 1 => Basic Info */}
          {currentStep === 1 && (
            <div className="step-content">
              {/* FULL NAME */}
              <div className="myFormGroup">
                <label className="myLabel">Name:</label>
                <input
                  type="text"
                  className="myInput"
                  value={formData.fullName || ''}
                  onChange={(e) =>
                    setFormData(prev => ({ ...prev, fullName: e.target.value }))
                  }
                />
              </div>

              {/* EMAIL */}
              <div className="myFormGroup">
                <label className="myLabel">Email:</label>
                {isAdmin ? (
                  <>
                    <input
                      type="email"
                      className="myInput"
                      value={formData.email || ''}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, email: e.target.value }));
                        validateEmail(e.target.value);
                      }}
                    />
                    {emailError && (
                      <div style={{ color: 'red', marginTop: '4px', fontSize: '0.8em' }}>
                        {emailError}
                      </div>
                    )}
                  </>
                ) : (
                  <input
                    type="email"
                    className="myInput"
                    value={currentUserEmail}
                    readOnly
                  />
                )}
              </div>

              {/* PHONE */}
              <div className="myFormGroup">
                <label className="myLabel">Phone:</label>
                <div className="myPhoneContainer">
                  <PhoneInput
                    inputClass="myPhoneInput"
                    country="hk"
                    value={formData.phone || ''}
                    onChange={(phone, country) =>
                      setFormData(prev => ({
                        ...prev,
                        phone: `+${country.dialCode} ${phone.replace(country.dialCode, '').trim()}`
                      }))
                    }
                    priority={{ tw: 1, hk: 2 }}
                    enableSearch
                  />
                </div>
              </div>

              {/* BOOKING TYPE */}
              <div className="myFormGroup">
                <label className="myLabel">Booking Type:</label>
                <select
                  className="mySelect"
                  value={formData.bookingTypeId || ''}
                  onChange={(e) => {
                    const selectedId = e.target.value;
                    const selectedType = bookingTypes.find(
                      (bt) => String(bt.id) === selectedId
                    );
                    setFormData(prev => ({
                      ...prev,
                      bookingTypeId: selectedId,
                      title: selectedType ? selectedType.name : ''
                    }));
                    // If user already picked a date, refetch times
                    if (formData.date) {
                      fetchAvailableTimes(formData.date, selectedId);
                    }
                  }}
                >
                  <option value="">Select Booking Type</option>
                  {bookingTypes.map(bt => (
                    <option key={bt.id} value={bt.id}>
                      {bt.name} {bt.duration ? `(${bt.duration} mins)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* STEP 2 => Calendar & timeslots */}
          {currentStep === 2 && (
            <div className="step-content booking-layout">
              {/* Left panel => summary */}
              <div className="left-panel">
                <h3 className="booking-title">
                  {bookingTypes.find(bt => String(bt.id) === String(formData.bookingTypeId))?.name || 'Booking'}
                </h3>
                {bookingTypes.find(bt => String(bt.id) === String(formData.bookingTypeId))?.duration && (
                  <p className="booking-subtitle">
                    {bookingTypes.find(bt => String(bt.id) === String(formData.bookingTypeId)).duration} mins
                  </p>
                )}
                <p className="booking-subtitle">
                  Time Zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
                <div className="booking-info">
                  <p><strong>Name:</strong> {formData.fullName}</p>
                  <p><strong>Email:</strong> {isAdmin ? formData.email : currentUserEmail}</p>
                  <p><strong>Phone:</strong> {formData.phone}</p>
                </div>
              </div>

              {/* Middle panel => Calendar */}
              <div className="middle-panel">
                <Calendar
                  // Force a re-render if calendarDate changes
                  key={calendarDate ? calendarDate.toISOString() : 'no-date'}
                  onChange={handleCalendarChange}
                  value={calendarDate}
                  minDate={new Date()}
                  maxDetail="month"
                  minDetail="month"
                  locale="en-GB"
                  prevLabel="<"
                  nextLabel=">"
                  prev2Label={null}
                  next2Label={null}
                  renderNavigation={({ label, onClickNext, onClickPrev }) => (
                    <div className="custom-calendar-nav">
                      <button
                        className="calendar-nav-btn"
                        onClick={onClickPrev}
                        aria-label="Previous Month"
                      />
                      <span className="calendar-month-year">{label}</span>
                      <button
                        className="calendar-nav-btn"
                        onClick={onClickNext}
                        aria-label="Next Month"
                      />
                    </div>
                  )}
                />
              </div>

              {/* Right panel => timeslots */}
              <div className="right-panel">
                <h4 className="time-title">
                  {formData.date
                    ? `Available Times on ${formData.date}`
                    : 'Select a Date'}
                </h4>
                {timeSlots.length > 0 ? (
                  <div className="timeslot-container">
                    {timeSlots.map(({ utc, local, existing }) => (
                      <button
                        key={utc}
                        type="button"
                        className={`timeslot-btn ${formData.time === local ? 'active' : ''}`}
                        onClick={() =>
                          setFormData(prev => ({ ...prev, time: local }))
                        }
                      >
                        {existing ? `${local} (current)` : local}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="no-times-msg">
                    {formData.date ? 'No times available for this date' : 'Please select a date'}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Bottom => Delete on left, Step nav on right */}
        <div className="button-container" style={{ display: 'flex', justifyContent: 'space-between' }}>
          {/* Delete button (always visible) */}
          <button
            type="button"
            className="myDeleteButton"
            onClick={handleDelete}
            disabled={loading}
          >
            Delete
          </button>

          {/* Step nav => on the right */}
          <div>
            {currentStep === 2 && (
              <button
                type="button"
                className="mySecondaryButton"
                onClick={handleBack}
                disabled={loading}
                style={{ marginRight: '0.5rem' }}
              >
                Back
              </button>
            )}
            <button
              type="button"
              className="myPrimaryButton"
              onClick={handleNext}
              disabled={
                loading ||
                (currentStep === 1 && !isStep1Valid()) ||
                (currentStep === 2 && !isStep2Valid())
              }
            >
              {loading ? (
                <img src={loadingGif} alt="Loading..." className="myLoadingIcon" />
              ) : currentStep === 2 ? (
                'Save Changes'
              ) : (
                'Next'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default EditEventModal;
