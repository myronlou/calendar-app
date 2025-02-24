import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import { DateTimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import './ModalTheme.css';
import loadingGif from './gif/loading.gif';

dayjs.extend(utc);

function EditEventModal({
  show,
  onClose,
  onUpdate,       // Function to update the event
  onDelete,       // Function to delete the event
  formData,
  setFormData,
  isAdmin,        // Optional: whether the user is admin (to allow email editing)
  currentUserEmail // Optional: to auto-fill email for non-admin users
}) {
  const [loading, setLoading] = useState(false);
  const [bookingTypes, setBookingTypes] = useState([]);
  const [emailError, setEmailError] = useState('');
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    setEmailError(emailRegex.test(email) ? '' : 'Invalid email format');
  };

  // Fetch available booking types
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

  // Auto-fill email for non-admin users if needed
  useEffect(() => {
    if (!isAdmin && currentUserEmail) {
      setFormData(prev => ({ ...prev, email: currentUserEmail }));
    }
  }, [isAdmin, currentUserEmail, setFormData]);

  if (!show) return null;

  // Basic form validation – ensure start time is valid, a booking type is chosen, and (for admins) no email error
  const isFormValid = (() => {
    const startVal = formData.start ? dayjs(formData.start) : null;
    if (!startVal || !startVal.isValid()) return false;
    if (!formData.bookingTypeId) return false;
    if (isAdmin && emailError) return false;
    return true;
  })();

  // Handler for updating the event
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading || !isFormValid) return;
    setLoading(true);
    try {
      const result = await onUpdate();
      if (result && !result.error) {
        onClose();
      }
    } catch (err) {
      console.error('Error updating event:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handler for deleting the event
  const handleDelete = async () => {
    if (loading) return;

    // **Change 1: Added a confirmation prompt**
    const confirmed = window.confirm(
      "Are you sure you want to delete this event? This action cannot be undone."
    );
    // **Change 2: Early return if the user did not confirm**
    if (!confirmed) return;

    if (loading) return;
    setLoading(true);
    try {
      await onDelete();
      onClose();
    } catch (err) {
      console.error('Error deleting event:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="myModalOverlay" onClick={onClose}>
      <motion.div
        className="myModalContent"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onClick={(e) => e.stopPropagation()}  // Prevent clicks inside the modal from closing it
      >
        {/* Close ("X") button in the top-right corner */}
        <button className="myCloseButton" onClick={onClose}>×</button>

        <h2 className="myModalTitle">Edit Event</h2>
        <form onSubmit={handleSubmit} className="myModalForm">
          {/* CUSTOMER NAME */}
          <div className="myFormGroup">
            <label className="myLabel">Name:</label>
            <input
              type="text"
              className="myInput"
              value={formData.fullName || ''}
              required
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
            />
          </div>

          {/* CUSTOMER EMAIL */}
          <div className="myFormGroup">
            <label className="myLabel">Email:</label>
            {isAdmin ? (
              <>
                <input
                  type="email"
                  className="myInput"
                  value={formData.email || ''}
                  required
                  onChange={(e) => {
                    const email = e.target.value;
                    setFormData({ ...formData, email });
                    validateEmail(email);
                  }}
                />
                {emailError && (
                  <span style={{ color: 'red', fontSize: '0.85rem', marginTop: '4px' }}>
                    {emailError}
                  </span>
                )}
              </>
            ) : (
              <input
                type="email"
                className="myInput"
                value={currentUserEmail || ''}
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
                  setFormData({
                    ...formData,
                    phone: `+${country.dialCode} ${phone.replace(country.dialCode, '').trim()}`
                  })
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
              value={formData.bookingTypeId}
              required
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

          {/* START TIME */}
          <div className="myFormGroup">
            <label className="myLabel">Start Time:</label>
            <DateTimePicker
              label=""
              value={formData.start ? dayjs(formData.start) : null}
              onChange={(newVal) => {
                if (!newVal || !newVal.isValid()) {
                  setFormData({ ...formData, start: '' });
                  return;
                }
                setFormData({ ...formData, start: newVal.utc().toISOString() });
              }}
              renderInput={(params) => (
                <input
                  {...params.inputProps}
                  className="myInput myDateTimeInput"
                  placeholder="Pick Date & Time"
                />
              )}
            />
          </div>

          {/* BUTTONS */}
          <div className="myModalButtons">
            <button
              type="submit"
              className="myPrimaryButton"
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <img
                  src={loadingGif}
                  alt="Loading..."
                  className="myLoadingIcon"
                />
              ) : (
                'Save Changes'
              )}
            </button>
            {/* Removed the Cancel button */}
            <button
              type="button"
              className="myDeleteButton"
              onClick={handleDelete}
              disabled={loading}
            >
              Delete
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

export default EditEventModal;
