import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';

import loadingGif from './gif/loading.gif';
import './CustomerBookingModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function utcToLocalTimeLabel(utcHHmm, dateYYYYMMDD) {
  const [year, month, day] = dateYYYYMMDD.split('-').map(Number);
  const [utcH, utcM] = utcHHmm.split(':').map(Number);

  const utcDate = new Date(Date.UTC(year, month - 1, day, utcH, utcM, 0));
  const localH = utcDate.getHours();
  const localM = utcDate.getMinutes();

  return `${String(localH).padStart(2, '0')}:${String(localM).padStart(2, '0')}`;
}

function localToUTCISO(dateYYYYMMDD, localHHmm) {
  const [year, month, day] = dateYYYYMMDD.split('-').map(Number);
  const [h, m] = localHHmm.split(':').map(Number);

  const localDate = new Date(year, month - 1, day, h, m, 0);
  return localDate.toISOString();
}

function CustomerBookingModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [animationDirection, setAnimationDirection] = useState('next');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  // Basic form data
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    date: '',
    time: '',
  });

  // OTP
  const [otp, setOtp] = useState('');

  // Booking Types
  const [bookingTypes, setBookingTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');

  // Timeslots
  const [timeSlots, setTimeSlots] = useState([]);

  // React-Calendar
  const [calendarDate, setCalendarDate] = useState(null);

  // Fetch booking types on mount
  useEffect(() => {
    const fetchBookingTypes = async () => {
      try {
        const res = await fetch(`${API_URL}/api/booking-types`);
        if (!res.ok) throw new Error('Failed to fetch booking types');
        const types = await res.json();
        setBookingTypes(types);
      } catch (error) {
        console.error(error);
      }
    };
    fetchBookingTypes();
  }, []);

  // Validate email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(emailRegex.test(email) ? '' : 'Invalid email format');
  };

  // Close modal & reset
  const handleClose = () => {
    setCurrentStep(1);
    setIsLoading(false);
    setEmailError('');
    setErrorMessage('');
    setAnimationDirection('next');
    setIsRegenerating(false);
    setBookingSuccess(false);

    setFormData({
      fullName: '',
      email: '',
      phone: '',
      date: '',
      time: '',
    });
    setOtp('');
    setSelectedType('');
    setTimeSlots([]);
    setCalendarDate(null);

    onClose();
  };

  // Regenerate OTP
  const handleRegenerateOtp = async () => {
    setIsRegenerating(true);
    setErrorMessage('');
    try {
      const response = await fetch(`${API_URL}/api/otp/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          type: 'booking'
        }),
      });
      if (!response.ok) throw new Error('Failed to send new code');
      setErrorMessage('New verification code sent successfully');
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsRegenerating(false);
    }
  };

  // Step validations
  const isStep1Valid = () => {
    const { fullName, email, phone } = formData;
    return (
      fullName.trim() &&
      email.trim() &&
      phone.trim() &&
      selectedType &&
      !emailError
    );
  };
  const isStep2Valid = () => formData.date && formData.time;

  // Step nav
  const handleNext = async () => {
    if (isLoading) return;
    setAnimationDirection('next');
    setErrorMessage('');
    setIsLoading(true);

    try {
      if (currentStep === 1) {
        if (!isStep1Valid()) {
          setErrorMessage('Please fill all required fields correctly');
          return;
        }
        setCurrentStep(2);

      } else if (currentStep === 2) {
        if (!isStep2Valid()) {
          setErrorMessage('Please select both date and time');
          return;
        }
        // Generate OTP
        const otpRes = await fetch(`${API_URL}/api/otp/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            type: 'booking'
          }),
        });
        if (!otpRes.ok) {
          throw new Error('Failed to send verification code');
        }
        setCurrentStep(3);

      } else if (currentStep === 3) {
        if (!otp) {
          setErrorMessage('Please enter the OTP');
          return;
        }
        // Verify OTP
        const verifyRes = await fetch(`${API_URL}/api/otp/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            code: otp,
            type: 'booking'
          }),
        });
        if (!verifyRes.ok) {
          throw new Error('Invalid or expired verification code');
        }
        const { token } = await verifyRes.json();

        // Create event
        const startISO = localToUTCISO(formData.date, formData.time);
        const eventPayload = {
          eventData: {
            ...formData,
            bookingTypeId: selectedType,
            start: startISO
          },
          token
        };
        const eventResponse = await fetch(`${API_URL}/api/events`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(eventPayload),
        });
        if (!eventResponse.ok) {
          throw new Error(await eventResponse.text());
        }
        setBookingSuccess(true);
        setCurrentStep(4);
      }
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    setAnimationDirection('prev');
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Press Enter to proceed
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleNext();
    }
  };

  // Fetch times
  const fetchAvailableTimes = async (chosenDate, bookingTypeId) => {
    try {
      setErrorMessage('');
      setTimeSlots([]);
      if (!chosenDate || !bookingTypeId) return;

      const url = `${API_URL}/api/events/available?date=${chosenDate}&bookingTypeId=${bookingTypeId}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load available times');
      const data = await res.json();

      const mapped = (data.availableTimes || []).map((utcString) => {
        const localLabel = utcToLocalTimeLabel(utcString, chosenDate);
        return { utc: utcString, local: localLabel };
      });
      setTimeSlots(mapped);
    } catch (error) {
      setErrorMessage(error.message);
      setTimeSlots([]);
    }
  };

  // React-Calendar
  const handleCalendarChange = (date) => {
    setCalendarDate(date);
    if (!date) {
      setFormData({ ...formData, date: '', time: '' });
      setTimeSlots([]);
      return;
    }
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;

    setFormData({ ...formData, date: isoDate, time: '' });
    setTimeSlots([]);

    if (selectedType) {
      fetchAvailableTimes(isoDate, selectedType);
    }
  };

  if (!isOpen) return null;

  // If step2 => bigger width
  const modalClasses = `modal-content ${currentStep === 2 ? 'step2-expanded' : ''}`;

  return (
    <div className="modal-overlay">
      <div className={modalClasses}>
        <button onClick={handleClose} className="close-button">×</button>

        <h2 className="modal-title">Book Your Appointment</h2>
        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <div className={`animation-container ${animationDirection}`}>
          {/* STEP 1 */}
          {currentStep === 1 && (
            <div className="step-content">
              <div className="input-group">
                <label>Full Name:</label>
                <input
                  type="text"
                  value={formData.fullName}
                  required
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="e.g. Chan Tai Man"
                  onKeyDown={handleKeyPress}
                />
              </div>

              <div className="input-group">
                <label>Email:</label>
                <input
                  type="email"
                  value={formData.email}
                  required
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    validateEmail(e.target.value);
                  }}
                  placeholder="e.g. chantaiman@email.com"
                  onKeyDown={handleKeyPress}
                />
                {emailError && <p className="input-error">{emailError}</p>}
              </div>

              <div className="input-group">
                <label>Phone:</label>
                <PhoneInput
                  country={'hk'}
                  value={formData.phone}
                  required
                  onChange={(phone, country) =>
                    setFormData({
                      ...formData,
                      phone: `+${country.dialCode} ${phone.replace(country.dialCode, '')}`
                    })
                  }
                  inputClass="phone-input"
                  onKeyDown={handleKeyPress}
                />
              </div>

              <div className="input-group">
                <label>Select Booking Type:</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  required
                >
                  <option value="">-- Select a Booking Type --</option>
                  {bookingTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name} ({type.duration} mins)
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* STEP 2 => 3-column layout */}
          {currentStep === 2 && (
            <div className="step-content booking-layout">
              {/* Left panel: info */}
              <div className="left-panel">
                <h3 className="booking-title">
                  {bookingTypes.find(bt => bt.id === parseInt(selectedType))?.name || 'Booking'}
                </h3>
                <p className="booking-subtitle">
                  {bookingTypes.find(bt => bt.id === parseInt(selectedType))?.duration} mins
                </p>
                <p className="booking-subtitle">
                  Time Zone: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </p>
                <div className="booking-info">
                  <p><strong>Name:</strong> {formData.fullName}</p>
                  <p><strong>Email:</strong> {formData.email}</p>
                  <p><strong>Phone:</strong> {formData.phone}</p>
                </div>
              </div>

              {/* Middle panel: single-month Calendar */}
              <div className="middle-panel">
                <Calendar
                  onChange={handleCalendarChange}
                  value={calendarDate}
                  minDate={new Date()}

                  // Force single-month day selection
                  maxDetail="month"
                  minDetail="month"
                  // Monday start
                  locale="en-GB"
                  
                  // Hide default labels
                  prevLabel="<"
                  nextLabel=">"
                  prev2Label={null}
                  next2Label={null}

                  // Custom nav with < and >
                  renderNavigation={({
                    activeStartDate,
                    label,
                    onClickNext,
                    onClickPrev,
                  }) => (
                    <div className="custom-calendar-nav">
                      <button
                        className="calendar-nav-btn"
                        onClick={onClickPrev}
                        aria-label="Previous Month"
                      >
                      </button>
                      <span className="calendar-month-year">{label}</span>
                      <button
                        className="calendar-nav-btn"
                        onClick={onClickNext}
                        aria-label="Next Month"
                      >
                      </button>
                    </div>
                  )}
                />
              </div>

              {/* Right panel: timeslots */}
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
                        onClick={() => setFormData({ ...formData, time: local })}
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

          {/* STEP 3 => OTP */}
          {currentStep === 3 && (
            <div className="step-content">
              <p className="otp-instruction">
                Verification code sent to <strong>{formData.email}</strong>
                <button
                  type="button"
                  onClick={handleRegenerateOtp}
                  disabled={isRegenerating}
                  className="regenerate-button"
                >
                  {isRegenerating ? (
                    <img src={loadingGif} alt="Sending..." className="loading-icon" />
                  ) : (
                    'Resend Code'
                  )}
                </button>
              </p>
              <input
                type="text"
                placeholder="Enter OTP (e.g. 123456)"
                value={otp}
                required
                onChange={(e) => setOtp(e.target.value)}
                className="otp-input"
                onKeyDown={handleKeyPress}
              />
            </div>
          )}

          {/* STEP 4 => Success */}
          {currentStep === 4 && (
            <div className="step-content success-content">
              <h3 className="success-message">✓ Appointment Confirmed!</h3>
              <p className="success-text">
                Thank you for your booking!<br />
                <strong>Booking Type:</strong>{' '}
                {bookingTypes.find(bt => bt.id === parseInt(selectedType))?.name || ''}<br />
                <strong>Date:</strong> {formData.date}<br />
                <strong>Time:</strong> {formData.time}
              </p>
            </div>
          )}
        </div>

        {/* NAV BUTTONS */}
        <div className="button-container">
          {currentStep > 1 && currentStep < 4 && (
            <button className="back-button" onClick={handleBack}>
              Back
            </button>
          )}
          <div className="action-buttons">
            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={
                  isLoading ||
                  (currentStep === 1 && !isStep1Valid()) ||
                  (currentStep === 2 && !isStep2Valid()) ||
                  (currentStep === 3 && !otp)
                }
                className="next-button"
              >
                {isLoading ? (
                  <img src={loadingGif} alt="Loading" className="loading-icon" />
                ) : currentStep === 3 ? (
                  'Verify'
                ) : (
                  'Next'
                )}
              </button>
            ) : (
              <button className="done-button" onClick={handleClose}>
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerBookingModal;
