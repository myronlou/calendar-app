import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { DateTimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';

import loadingGif from './gif/loading.gif'; // adjust path

function EditEventModal({
  show,
  onClose,
  formData,
  setFormData,
  onUpdate,
  onDelete
}) {
  const [isEditing, setIsEditing] = useState(false);

  // For invalid email & time
  const [emailError, setEmailError] = useState('');
  const [endTimeError, setEndTimeError] = useState('');

  // Loading while saving changes
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  if (!show) return null;

  // Validate email
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(emailRegex.test(email) ? '' : 'Invalid email format');
  };

  // Check if form is valid
  // - no emailError
  // - no endTimeError
  // - start & end valid
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
    if (!isEditing || !isFormValid) return;
  
    if (!formData.id) {
      console.error("Error: Event ID is missing.");
      return;
    }
  
    try {
      setLoading(true);
      const updatedEvent = await onUpdate(formData);
      if (updatedEvent) {
        setFormData(updatedEvent);  
      }
      setIsEditing(false);
      onClose(); 
    } catch (err) {
      console.error('Error updating event:', err);
    } finally {
      setLoading(false);
    }
  };
  

  const handleDelete = async () => {
    try {
      setDeleting(true);
      await onDelete();
      onClose(); // Close modal after deleting
    } catch (err) {
      console.error('Error deleting event:', err);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
        justifyContent: 'center', alignItems: 'center',
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
        <h3>{isEditing ? 'Edit Event' : 'Event Details'}</h3>
        <form onSubmit={handleSubmit}>
          <div>
            <label>Full Name:</label>
            <input
              type="text"
              value={formData.fullName}
              disabled={!isEditing || loading}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            />
          </div>

          <div>
            <label>Email:</label>
            <input
              type="email"
              value={formData.email}
              disabled={!isEditing || loading}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                validateEmail(e.target.value);
              }}
            />
            {emailError && <p style={{ color: 'red' }}>{emailError}</p>}
          </div>

          <div>
            <label>Phone:</label>
            <input
              type="text"
              value={formData.phone}
              disabled={!isEditing || loading}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            />
          </div>

          <div>
            <label>Title:</label>
            <input
              type="text"
              value={formData.title}
              disabled={!isEditing || loading}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          <div>
            <label>Start Time:</label>
            <DateTimePicker
              label="Pick Start"
              value={formData.start ? dayjs(formData.start) : null}
              disabled={!isEditing || loading}
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

          <div>
            <label>End Time:</label>
            <DateTimePicker
              label="Pick End"
              value={formData.end ? dayjs(formData.end) : null}
              disabled={!isEditing || loading}
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

          {isEditing && (
            <>
              <button type="submit" disabled={loading || !isFormValid}>
                {loading ? <img src={loadingGif} alt="Loading..." style={{ width: '20px', height: '20px' }} /> : 'Save Changes'}
              </button>
              <button type="button" onClick={() => setIsEditing(false)} disabled={loading}>Cancel</button>
            </>
          )}
          
          {!isEditing && !loading && (
            <>
              <button type="button" onClick={() => setIsEditing(true)} disabled={loading}>Edit</button>
              <button type="button" onClick={handleDelete} style={{ color: 'red' }} disabled={deleting}>
                {deleting ? <img src={loadingGif} alt="Loading..." style={{ width: '20px', height: '20px' }} /> : 'Delete'}
              </button>
              <button type="button" onClick={onClose} disabled={loading}>Close</button>
            </>
          )}
        </form>
      </motion.div>
    </div>
  );
}

export default EditEventModal;