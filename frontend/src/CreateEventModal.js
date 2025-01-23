import React, { useState } from 'react';
import { motion } from 'framer-motion';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

function CreateEventModal({ show, onClose, onSubmit, formData, setFormData }) {
  const [emailError, setEmailError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!show) return null;

  // Basic email validation
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(emailRegex.test(email) ? '' : 'Invalid email format');
  };

  // Called when the user presses "Create Event"
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions
    setLoading(true);

    try {
      // Call the parent function that actually does the fetch
      // If `onSubmit()` returns a status or result, you can handle it here
      const result = await onSubmit();
      
      // If the creation was successful, we can close the modal or reset form
      // (Adjust logic depending on your parent's implementation)
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
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
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
            {emailError && (
              <p style={{ color: 'red' }}>{emailError}</p>
            )}
          </div>

          <div>
            <label>Phone:</label>
            <PhoneInput
              country={'tw'}
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
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
            />
          </div>

          <div>
            <label>Start Time:</label>
            <input
              type="datetime-local"
              value={formData.start}
              required
              onChange={(e) => setFormData({ ...formData, start: e.target.value })}
            />
          </div>

          <div>
            <label>End Time:</label>
            <input
              type="datetime-local"
              value={formData.end}
              required
              onChange={(e) => setFormData({ ...formData, end: e.target.value })}
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Event'}
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
