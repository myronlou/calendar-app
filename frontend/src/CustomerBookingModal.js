import React, { useState } from 'react';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import loadingGif from './gif/loading.gif';
import './CustomerBookingModal.css';

function CustomerBookingModal({ isOpen, onClose }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    title: '',
    date: '',
    time: '',
  });
  const [otp, setOtp] = useState('');
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [animationDirection, setAnimationDirection] = useState('next');
  const [isRegenerating, setIsRegenerating] = useState(false);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(emailRegex.test(email) ? '' : 'Invalid email format');
  };

  const handleRegenerateOtp = async () => {
    setIsRegenerating(true);
    setErrorMessage('');
    
    try {
      const response = await fetch('http://localhost:5001/api/otp/generate', {
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
      title: '',
      date: '',
      time: '',
    });
    setOtp('');
    setBookingSuccess(false);
    setErrorMessage('');
    onClose();
  };

  const isStep1Valid = () => {
    const { fullName, email, phone, title } = formData;
    return (
      fullName.trim() &&
      email.trim() &&
      phone.trim() &&
      title.trim() &&
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
        const otpResponse = await fetch('http://localhost:5001/api/otp/generate', {
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
        const verifyResponse = await fetch('http://localhost:5001/api/otp/verify', {
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

        // Create event after successful OTP verification
        const startISO = new Date(`${formData.date}T${formData.time}:00`).toISOString();
        const endISO = new Date(new Date(startISO).getTime() + 3600000).toISOString();

        const eventResponse = await fetch('http://localhost:5001/api/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            eventData: {
              ...formData,
              start: startISO,
              end: endISO,
            },
            token: token
          }),
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
                <label>Title:</label>
                <input
                  type="text"
                  value={formData.title}
                  required
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Consultation"
                  onKeyDown={handleKeyPress}
                />
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
              <p className="duration-note">* Appointments are scheduled for 1 hour duration</p>
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