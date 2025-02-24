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

function CreateEventModal({
  show,
  onClose,
  onSubmit,
  formData,
  setFormData,
  currentUserEmail,
  isAdmin,
}) {
  const [loading, setLoading] = useState(false);
  const [bookingTypes, setBookingTypes] = useState([]);
  const [emailError, setEmailError] = useState('');
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

  // If the user is a customer, auto-fill the email with the current user email.
  useEffect(() => {
    if (!isAdmin && currentUserEmail) {
      setFormData((prev) => ({ ...prev, email: currentUserEmail }));
    }
  }, [isAdmin, currentUserEmail, setFormData]);

  // Email validation function
  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailRegex.test(email)) {
      setEmailError('');
      return true;
    } else {
      setEmailError('Invalid email format');
      return false;
    }
  };

  if (!show) return null;

  // Form validation: check for valid start time, a selected booking type, and for admins a valid email.
  const isFormValid = (() => {
    const startVal = formData.start ? dayjs(formData.start) : null;
    if (!startVal || !startVal.isValid()) return false;
    if (!formData.bookingTypeId) return false;
    if (isAdmin) {
      if (!formData.email) return false;
      if (emailError) return false;
    }
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
    <div className="myModalOverlay" onClick={onClose}>
      <motion.div
        className="myModalContent"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onClick={(e) => e.stopPropagation()} // Prevent click on content from closing
      >
        <h2 className="myModalTitle">Create Event</h2>

        <form onSubmit={handleSubmit} className="myModalForm">
          {/* FULL NAME */}
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

          {/* EMAIL */}
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
                  <div style={{ color: 'red', marginTop: '4px', fontSize: '0.8em'}}>
                    {emailError}
                  </div>
                )}
              </>
            ) : (
              <input
                type="email"
                className="myInput"
                value={currentUserEmail}
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
                    phone: `+${country.dialCode} ${phone
                      .replace(country.dialCode, '')
                      .trim()}`,
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
              value={formData.bookingTypeId || ''}
              required
              onChange={(e) => {
                const selectedId = e.target.value;
                const selectedType = bookingTypes.find(
                  (type) => String(type.id) === selectedId
                );
                setFormData((prev) => ({
                  ...prev,
                  bookingTypeId: selectedId,
                  title: selectedType ? selectedType.name : '',
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
                'Create Event'
              )}
            </button>
            <button
              type="button"
              className="mySecondaryButton"
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
