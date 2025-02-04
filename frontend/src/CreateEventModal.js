import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { DateTimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import './ModalTheme.css';
import loadingGif from './gif/loading.gif';

function CreateEventModal({ show, onClose, onSubmit, formData, setFormData }) {
  // Email & time range errors
  const [emailError, setEmailError] = useState('');
  const [endTimeError, setEndTimeError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  // Validate email on change
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(emailRegex.test(email) ? '' : 'Invalid email format');
  };

  // Check if the form is valid overall:
  // - no email error
  // - no endTimeError
  // - has valid start & end
  const isFormValid = (() => {
    if (emailError) return false;
    if (endTimeError) return false;

    const startVal = formData.start ? dayjs(formData.start) : null;
    const endVal = formData.end ? dayjs(formData.end) : null;
    if (!startVal || !endVal) return false;
    if (!startVal.isValid() || !endVal.isValid()) return false;
    if (endVal.isBefore(startVal)) return false;

    return true;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    // Also disallow if invalid:
    if (!isFormValid) return;

    setLoading(true);
    try {
      const result = await onSubmit();
      if (result && !result.error) {
        onClose();
      }
    } catch (err) {
      console.error('Error creating event:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="modal-title">Create Event</h3>
        
        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label>Full Name:</label>
            <input
              type="text"
              value={formData.fullName || ''}
              required
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={formData.email || ''}
              required
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                validateEmail(e.target.value);
              }}
            />
            {emailError && <p className="error-text">{emailError}</p>}
          </div>

          <div className="form-group">
            <label>Phone:</label>
            <PhoneInput
              country="hk"
              value={formData.phone || ''}
              onChange={(phone, country) =>
                setFormData({
                  ...formData,
                  phone: `+${country.dialCode} ${phone.replace(country.dialCode, '').trim()}`
                })
              }
              priority={{ tw: 1, hk: 2 }}
              enableSearch
            />
          </div>

          <div className="form-group">
            <label>Title:</label>
            <input
              type="text"
              value={formData.title || ''}
              required
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label>Start Time:</label>
            <DateTimePicker
              label="Pick Start"
              value={formData.start ? dayjs(formData.start) : null}
              onChange={(newVal) => {
                if (!newVal || !newVal.isValid()) {
                  setFormData({ ...formData, start: '' });
                  return;
                }
                const endVal = dayjs(formData.end);
                if (endVal.isValid() && newVal.isAfter(endVal)) {
                  setEndTimeError('Start time cannot be after end time');
                } else {
                  setEndTimeError('');
                }
                setFormData({ ...formData, start: newVal.toISOString() });
              }}
            />
          </div>

          <div className="form-group">
            <label>End Time:</label>
            <DateTimePicker
              label="Pick End"
              value={formData.end ? dayjs(formData.end) : null}
              onChange={(newVal) => {
                if (!newVal || !newVal.isValid()) {
                  setFormData({ ...formData, end: '' });
                  return;
                }
                const startVal = dayjs(formData.start);
                if (startVal.isValid() && newVal.isBefore(startVal)) {
                  setEndTimeError('End time cannot be before start time');
                } else {
                  setEndTimeError('');
                  setFormData({ ...formData, end: newVal.toISOString() });
                }
              }}
            />
            {endTimeError && <p className="error-text">{endTimeError}</p>}
          </div>

          <div className="modal-buttons">
            <button
              type="submit"
              className="primary-button"
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <img src={loadingGif} alt="Loading..." className="loading-icon" />
              ) : (
                'Create Event'
              )}
            </button>
            <button
              type="button"
              className="secondary-button"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default CreateEventModal;
