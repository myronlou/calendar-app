import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import loadingGif from './gif/loading.gif';
import './ModalTheme.css'; // Make sure you import the CSS file

dayjs.extend(utc);

// Helper: Convert a UTC time string (e.g. "09:00") into a local label based on the chosen date.
function utcToLocalTimeLabel(utcHHmm, dateYYYYMMDD) {
  const [year, month, day] = dateYYYYMMDD.split('-').map(Number);
  const [utcH, utcM] = utcHHmm.split(':').map(Number);
  const utcDate = new Date(Date.UTC(year, month - 1, day, utcH, utcM, 0));
  const localH = utcDate.getHours();
  const localM = utcDate.getMinutes();
  return `${String(localH).padStart(2, '0')}:${String(localM).padStart(2, '0')}`;
}

// Helper: Convert a local date and time (YYYY-MM-DD & HH:mm) into an ISO string in UTC.
function localToUTCISO(dateYYYYMMDD, localHHmm) {
  const [year, month, day] = dateYYYYMMDD.split('-').map(Number);
  const [h, m] = localHHmm.split(':').map(Number);
  const localDate = new Date(year, month - 1, day, h, m, 0);
  return localDate.toISOString();
}

/**
 * Convert the local day selected in the calendar => the correct UTC date param.
 * If the user picks 2025-03-01 local but that corresponds to 2025-03-02 in UTC, 
 * we pass "2025-03-02" to the server.
 */
function localDateToUtcDateParam(localDateObj) {
  // localDateObj is something like new Date(2025, 2, 1) => March 1, local time at 00:00
  // Convert it to an ISO string => "2025-03-01T05:00:00.000Z" (if user is UTC-5)
  // Then slice out the UTC day => "2025-03-02" if it's actually next day in UTC
  const utcString = localDateObj.toISOString(); 
  return utcString.slice(0, 10); // e.g. "2025-03-02"
}

function CreateEventModal({
  show,
  onClose,
  onSubmit,
  formData,
  setFormData,
  currentUserEmail,
  isAdmin,
}) {
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  // Local states for multi-step flow and calendar/time slot selection.
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [bookingTypes, setBookingTypes] = useState([]);
  const [emailError, setEmailError] = useState('');
  const [calendarDate, setCalendarDate] = useState(null);
  const [timeSlots, setTimeSlots] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');
  const token = localStorage.getItem('token');
  const [step2Expanded, setStep2Expanded] = useState(false);

  // Fetch available booking types from backend.
  useEffect(() => {
    const fetchBookingTypes = async () => {
      try {
        const res = await fetch(`${API_URL}/api/booking-types`);
        if (res.ok) {
          const data = await res.json();
          setBookingTypes(data);
        } else {
          console.error('Failed to fetch booking types');
        }
      } catch (err) {
        console.error('Error fetching booking types:', err);
      }
    };
    fetchBookingTypes();
  }, [API_URL]);

  // Auto-fill email for non-admin users.
  useEffect(() => {
    if (!isAdmin && currentUserEmail) {
      setFormData((prev) => ({ ...prev, email: currentUserEmail }));
    }
    if (!show) {
      setCurrentStep(1);
      setCalendarDate(null);
      setTimeSlots([]);
    }
  }, [isAdmin, currentUserEmail, setFormData, show]);

  if (!show) return null;

  // Email validation function.
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

  if (!show) return null;

  // 2) Handle closing the modal => reset error, step
  const handleClose = () => {
    setErrorMessage('');
    setCurrentStep(1);
    onClose();
    setStep2Expanded(false); 
  };

  // Step 1: Validate that full name, phone, and booking type (plus email for admin) are provided.
  const isStep1Valid = () => {
    const { fullName, phone, bookingTypeId } = formData;
    if (!fullName?.trim() || !phone?.trim() || !bookingTypeId) return false;
    if (isAdmin && !formData.email) return false;
    if (isAdmin && emailError) return false;
    return true;
  };

  // Step 2: Ensure a date and time slot have been selected.
  const isStep2Valid = () => {
    return formData.date && formData.time;
  };

  // Fetch available times for a given date and booking type.
  const fetchAvailableTimes = async (chosenDate, bookingTypeId) => {
    try {
      if (!chosenDate || !bookingTypeId) return;

      // We compute the local offset in minutes (e.g. -300 for UTC-5).
      const offset = -new Date().getTimezoneOffset(); 
      // If isAdmin => /api/admin/events/available + offset, else => /api/events/available
      let url;
      if (isAdmin) {
        url = `${API_URL}/api/admin/events/available?date=${chosenDate}&bookingTypeId=${bookingTypeId}&offset=${offset}`;
      } else {
        url = `${API_URL}/api/events/available?date=${chosenDate}&bookingTypeId=${bookingTypeId}`;
      }

      const headers = isAdmin
        ? { Authorization: `Bearer ${token}` }
        : {};

      console.log(url)

      const res = await fetch(url, { headers });
      if (!res.ok) throw new Error('Failed to load available times');
      const data = await res.json();
      const rawSlots = data.availableTimes || [];

      // Convert UTC "HH:MM" => local "HH:MM", then sort
      let mapped = rawSlots.map(utcString => {
        const localLabel = utcToLocalTimeLabel(utcString, chosenDate);
        return { utc: utcString, local: localLabel };
      });

      // Sort by local "HH:MM" ascending
      mapped.sort((a, b) => {
        const [aH, aM] = a.local.split(':').map(Number);
        const [bH, bM] = b.local.split(':').map(Number);
        return (aH * 60 + aM) - (bH * 60 + bM);
      });

      const now = new Date();
      const nowLocalDay   = now.getDate();
      const nowLocalMonth = now.getMonth();     // 0-based
      const nowLocalYear  = now.getFullYear();

      // chosenDate is a "YYYY-MM-DD" string. Compare to local now
      const chosenYear  = parseInt(chosenDate.slice(0, 4), 10);
      const chosenMonth = parseInt(chosenDate.slice(5, 7), 10) - 1;
      const chosenDay   = parseInt(chosenDate.slice(8, 10), 10);

      const isTodayLocal = (
        nowLocalDay === chosenDay &&
        nowLocalMonth === chosenMonth &&
        nowLocalYear === chosenYear
      );

      if (isTodayLocal) {
        // Filter out times behind local now
        const nowLocalTotalMins = now.getHours() * 60 + now.getMinutes();
        mapped = mapped.filter(slot => {
          const [h, m] = slot.local.split(':').map(Number);
          const slotTotal = h * 60 + m;
          return slotTotal >= nowLocalTotalMins;
        });
      }

      setTimeSlots(mapped);
    } catch (error) {
      console.error('fetchAvailableTimes error:', error);
      setTimeSlots([]);
    }
  };

  // Handle calendar date selection.
  const handleCalendarChange = (dateObj) => {
    // dateObj is the local date the user picks from the calendar
    setCalendarDate(dateObj);

    if (!dateObj) {
      setFormData(prev => ({ ...prev, date: '', time: '' }));
      setTimeSlots([]);
      return;
    }

    // Convert local date's midnight => UTC date param, e.g. "2025-03-02"
    const utcDateParam = localDateToUtcDateParam(
      new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate(), 0, 0, 0)
    );

    // Store that param in formData
    setFormData(prev => ({ ...prev, date: utcDateParam, time: '' }));
    setTimeSlots([]);

    // If we already picked a bookingType, fetch times
    if (formData.bookingTypeId) {
      fetchAvailableTimes(utcDateParam, formData.bookingTypeId);
    }
  };

  // Navigation: Go from step 1 to step 2.
  const handleNext = async () => {
    if (loading) return;

    if (currentStep === 1) {
      // Validate Step 1
      if (!isStep1Valid()) {
        return; // You could display an error if you want
      }
      setStep2Expanded(true); 
      setCurrentStep(2);

    } else if (currentStep === 2) {
      // Final submission
      if (!isStep2Valid()) {
        return; // You could display an error if you want
      }
      setLoading(true);
      setErrorMessage('');
      try {
        // Build updated data (including the final UTC start)
        const updatedData = {
          ...formData,
          start: localToUTCISO(formData.date, formData.time),
        };
        // Call parent's onSubmit with updatedData
        const result = await onSubmit(updatedData);
        if (result && result.error) {
          // If your handleCreateEvent returns { error: true, errorMessage: '...' }
          setErrorMessage(result.errorMessage || 'Failed to create event');
        } else {
          // success => close
          setCurrentStep(1);
          onClose();
        }
      } catch (err) {
        console.error('Error creating event:', err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleOverlayClick = (e) => {
    // If user clicks the overlay itself, close
    // But if user clicks the modal content, do not close
    if (e.target.className === 'myModalOverlay') {
      setCurrentStep(1);
      handleClose();
    }
  };

  // Navigation: Back to step 1.
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
      setErrorMessage('');
      setStep2Expanded(false); 
    }
  };

  // On final submission, convert the selected local date/time into a UTC ISO string, then call onSubmit.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isStep2Valid()) return;

    // Convert local date+time to UTC ISO.
    const startISO = localToUTCISO(formData.date, formData.time);
    setFormData((prev) => ({ ...prev, start: startISO }));

    setLoading(true);
    try {
      const result = await onSubmit();
      if (result && !result.error) {
        setCurrentStep(1); 
        onClose();
      }
    } catch (err) {
      console.error('Error creating event:', err);
    } finally {
      setLoading(false);
    }
  };

  // Construct the dynamic class name for the modal
  // const modalClasses = `myModalContent ${currentStep === 2 ? 'step2-expanded' : ''}`;

  return (
    <div className="myModalOverlay" onClick={handleOverlayClick}>
      <motion.div
        className={`myModalContent ${step2Expanded ? 'step2-expanded' : ''}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className="myCloseButton"
          onClick={handleClose}
        >
          &times;
        </button>
        <h2 className="myModalTitle">Create Event</h2>

        {errorMessage && (
          <div className="error-message" style={{ color: 'red', marginBottom: '1rem' }}>
            {errorMessage}
          </div>
        )}

        {/* Step content container */}
        <div className="step-content-container">
          {/* STEP 1 */}
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
                    setFormData((prev) => ({ ...prev, fullName: e.target.value }))
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
                        const email = e.target.value;
                        setFormData((prev) => ({ ...prev, email }));
                        validateEmail(email);
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
                      setFormData((prev) => ({
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
                      (type) => String(type.id) === selectedId
                    );
                    setFormData((prev) => ({
                      ...prev,
                      bookingTypeId: selectedId,
                      title: selectedType ? selectedType.name : ''
                    }));
                    // If user already picked a date, refresh times
                    if (formData.date) {
                      fetchAvailableTimes(formData.date, selectedId);
                    }
                  }}
                >
                  <option value="">Select Booking Type</option>
                  {bookingTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} {type.duration ? `(${type.duration} mins)` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {currentStep === 2 && (
            <div className="step-content booking-layout">
              {/* Left panel: Summary */}
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

              {/* Middle panel: Calendar */}
              <div className="middle-panel">
                <Calendar
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

              {/* Right panel: Available Time Slots */}
              <div className="right-panel">
                <h4 className="time-title">
                  {formData.date
                    ? `Available Times on ${formData.date}`
                    : 'Select a Date'}
                </h4>
                {timeSlots.length > 0 ? (
                  <div className="timeslot-container">
                    {timeSlots.map(({ utc, local }) => (
                      <button
                        key={utc}
                        type="button"
                        className={`timeslot-btn ${formData.time === local ? 'active' : ''}`}
                        onClick={() =>
                          setFormData((prev) => ({ ...prev, time: local }))
                        }
                      >
                        {local}
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

        {/* Bottom button container (like CustomerBookingModal) */}
        <div className="button-container">
          {/* Show Back if on Step 2 */}
          {currentStep > 1 && (
            <button
              type="button"
              className="mySecondaryButton"
              onClick={handleBack}
              disabled={loading}
            >
              Back
            </button>
          )}

          <div className="action-buttons">
            {/* Single main button => "Next" for Step 1, "Create Event" for Step 2 */}
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
                'Create Event'
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

export default CreateEventModal;