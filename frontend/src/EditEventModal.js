import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateTimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import './ModalTheme.css';
import loadingGif from './gif/loading.gif';

function EditEventModal({
  show,
  onClose,
  formData,
  setFormData,
  onUpdate,
  onDelete
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [endTimeError, setEndTimeError] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (show) setIsEditing(false);
  }, [show]);

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(emailRegex.test(email) ? '' : 'Invalid email format');
  };

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
    if (!isFormValid || loading || deleting) return;
    
    try {
      setLoading(true);
      const updatedEvent = await onUpdate(formData);
      if (updatedEvent) setFormData(updatedEvent);
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating event:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (deleting || loading) return;
    try {
      setDeleting(true);
      await onDelete();
      onClose();
    } catch (err) {
      console.error('Error deleting event:', err);
    } finally {
      setDeleting(false);
    }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <motion.div
        className="modal-content modal-edit"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="close-btn" onClick={onClose}>×</button>

        <h3 className="modal-title">Event Details</h3>

        <form onSubmit={handleSubmit} className="modal-form">
          {/* If not editing, show read-only fields... */}
          {/* If editing, show inputs... */}
          {/* ... */}
          <div className="modal-buttons">
            {isEditing ? (
              <>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setIsEditing(false)}
                  disabled={deleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="primary-button"
                  disabled={loading || deleting /* or !isFormValid */}
                >
                  {loading ? (
                    <img src={loadingGif} alt="Loading..." className="loading-icon" />
                  ) : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="primary-button"
                  onClick={() => setIsEditing(true)}
                  disabled={loading || deleting}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="danger-button"
                  onClick={handleDelete}
                  disabled={loading || deleting}
                >
                  {deleting ? (
                    <img src={loadingGif} alt="Deleting..." className="loading-icon" />
                  ) : 'Delete'}
                </button>
              </>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default EditEventModal;