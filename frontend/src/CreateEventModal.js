import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { DateTimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';

// IMPORT your loading gif here:
import loadingGif from './gif/loading.gif'; // adjust path if needed

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
    <div
      style={{
        position: 'fixed', top: 0, left: 0,
        width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        display: 'flex', justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <motion.div
        style={{
          background: 'white',
          padding: '20px',
          borderRadius: '5px',
          minWidth: '350px',
          position: 'relative'
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3>Create Event</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Full Name:</label>
            <input
              type="text"
              value={formData.fullName}
              required
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div>
            <label>Email:</label>
            <input
              type="email"
              value={formData.email}
              required
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                validateEmail(e.target.value);
              }}
            />
            {emailError && <p style={{ color: 'red' }}>{emailError}</p>}
          </div>

          <div>
            <label>Phone:</label>
            <PhoneInput
              country={'hk'}
              value={formData.phone}
              onChange={(phone, country) =>
                setFormData({
                  ...formData,
                  phone: `+${country.dialCode} ${phone
                    .replace(country.dialCode, '')
                    .trim()}`
                })
              }
              priority={{ tw: 1, hk: 2 }}
              enableSearch={true}
            />
          </div>

          <div>
            <label>Title:</label>
            <input
              type="text"
              value={formData.title}
              required
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label>Start Time:</label>
            <DateTimePicker
              label="Pick Start"
              value={formData.start ? dayjs(formData.start) : null}
              onChange={(newVal) => {
                if (!newVal || !newVal.isValid()) {
                  setFormData({ ...formData, start: '' });
                  return;
                }
                // Check conflict if end time already set
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

          <div>
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
            {endTimeError && <p style={{ color: 'red' }}>{endTimeError}</p>}
          </div>

          <button type="submit" disabled={loading || !isFormValid}>
            {loading ? (
              <img src={loadingGif} alt="Loading..." style={{ width: '20px', height: '20px' }}/>
            ) : (
              'Create Event'
            )}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export default CreateEventModal;
