import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { DateTimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import './ModalTheme.css';
import loadingGif from './gif/loading.gif';

function CreateEventModal({ show, onClose, onSubmit, formData, setFormData, currentUserEmail }) {
  const [endTimeError, setEndTimeError] = useState('');
  const [loading, setLoading] = useState(false);

  // State to hold available booking types
  const [bookingTypes, setBookingTypes] = useState([]);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  useEffect(() => {
    // Fetch available booking types from the backend
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

  // Automatically set the email from the current user (if not already set)
  useEffect(() => {
    if (currentUserEmail && formData.email !== currentUserEmail) {
      setFormData(prev => ({ ...prev, email: currentUserEmail }));
    }
  }, [currentUserEmail, formData.email, setFormData]);

  if (!show) return null;

  // Overall form validation:
  // - Valid start & end times and proper order.
  // - A booking type is selected.
  const isFormValid = (() => {
    const startVal = formData.start ? dayjs(formData.start) : null;
    const endVal = formData.end ? dayjs(formData.end) : null;
    if (!startVal || !endVal) return false;
    if (!startVal.isValid() || !endVal.isValid()) return false;
    if (endVal.isBefore(startVal)) return false;
    if (!formData.bookingTypeId) return false;
    return true;
  })();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
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
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
            />
          </div>

          <div className="form-group">
            <label>Email:</label>
            {/* Display the current user’s email without allowing changes */}
            <input
              type="email"
              value={currentUserEmail}
              readOnly
              style={{ backgroundColor: '#eee', cursor: 'not-allowed' }}
            />
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
            <label>Booking Type:</label>
            <select
              value={formData.bookingTypeId || ''}
              required
              onChange={(e) => {
                const selectedId = e.target.value;
                setFormData({ ...formData, bookingTypeId: selectedId });
                // Automatically set the event title to the booking type's name
                const selectedType = bookingTypes.find(
                  (type) => String(type.id) === selectedId
                );
                if (selectedType) {
                  setFormData((prev) => ({ ...prev, title: selectedType.name }));
                }
              }}
            >
              <option value="">Select Booking Type</option>
              {bookingTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
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
