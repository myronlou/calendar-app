import React, { useState, useEffect } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import loadingGif from './gif/loading.gif';
import './CustomerBookingModal.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function CustomerBookingModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    date: '',
    time: '',
  });
  const [otp, setOtp] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [animationDirection, setAnimationDirection] = useState('next');
  const [isRegenerating, setIsRegenerating] = useState(false);
  
  // New state for booking types
  const [bookingTypes, setBookingTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');

  // Fetch available booking types on mount
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

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(emailRegex.test(email) ? '' : 'Invalid email format');
  };

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

  const handleClose = () => {
    setCurrentStep(1);
    setIsLoading(false);
    setEmailError('');
    setFormData({
      fullName: '',
      email: '',
      phone: '',
      date: '',
      time: '',
    });
    setOtp('');
    setBookingSuccess(false);
    setErrorMessage('');
    onClose();
  };

  const isStep1Valid = () => {
    const { fullName, email, phone } = formData;
    return (
      fullName.trim() &&
      email.trim() &&
      phone.trim() &&
      selectedType && // booking type must be selected
      !emailError
    );
  };

  const isStep2Valid = () => formData.date && formData.time;

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
        // Generate booking OTP
        const otpResponse = await fetch(`${API_URL}/api/otp/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            type: 'booking'
          }),
        });

        if (!otpResponse.ok) {
          throw new Error('Failed to send verification code');
        }

        setCurrentStep(3);
      } else if (currentStep === 3) {
        if (!otp) {
          setErrorMessage('Please enter the OTP');
          return;
        }

        // Verify booking OTP
        const verifyResponse = await fetch(`${API_URL}/api/otp/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: formData.email,
            code: otp,
            type: 'booking'
          }),
        });

        if (!verifyResponse.ok) {
          throw new Error('Invalid or expired verification code');
        }

        const { token } = await verifyResponse.json();

        // Create event after OTP verification
        const startISO = new Date(`${formData.date}T${formData.time}:00`).toISOString();

        const eventPayload = {
          eventData: {
            ...formData,
            // Omit formData.title if it exists
            bookingTypeId: selectedType, // send the booking type identifier
            start: startISO,
            // "end" can be optionally computed on the client for display purposes,
            // but will be overridden on the server.
          },
          token: token
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
    setCurrentStep(prev => Math.max(1, prev - 1));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !isLoading) {
      e.preventDefault();
      handleNext();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button onClick={handleClose} className="close-button">×</button>

        <form onSubmit={(e) => e.preventDefault()} onKeyDown={handleKeyPress}></form>

        <h2 className="modal-title" style={{ color: '#000' }}>
          Book Your Appointment
        </h2>

        {errorMessage && <p className="error-message">{errorMessage}</p>}

        <div className={`animation-container ${animationDirection}`}>
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

          {currentStep === 2 && (
            <div className="step-content">
              <div className="input-group">
                <label>Date:</label>
                <input
                  type="date"
                  value={formData.date}
                  required
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  onKeyDown={handleKeyPress}
                />
              </div>

              <div className="input-group">
                <label>Time:</label>
                <input
                  type="time"
                  value={formData.time}
                  required
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  onKeyDown={handleKeyPress}
                />
              </div>
              <p className="duration-note">
                * Appointment duration is determined by the selected booking type
              </p>
            </div>
          )}

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

          {currentStep === 4 && (
            <div className="step-content success-content">
              <h3 className="success-message">✓ Appointment Confirmed!</h3>
              <p className="success-text">Thank you for your booking!</p>
            </div>
          )}
        </div>

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
