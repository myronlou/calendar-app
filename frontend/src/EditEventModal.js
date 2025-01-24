import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { DateTimePicker } from '@mui/x-date-pickers';
import dayjs from 'dayjs';
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
    <div
      style={{
        position: 'fixed', top: 0, left: 0, 
        width: '100%', height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)', 
        display: 'flex', justifyContent: 'center', 
        alignItems: 'center', zIndex: 1000
      }}
      onClick={onClose}
    >
      <motion.div
        style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '12px',
          width: '90%',
          maxWidth: '500px',
          position: 'relative',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '1rem',
            right: '1rem',
            background: 'none',
            border: 'none',
            fontSize: '1.5rem',
            cursor: 'pointer',
            color: '#666',
            padding: '0 0.5rem'
          }}
        >
          ×
        </button>

        <h3 style={{ 
          textAlign: 'center', 
          margin: '1rem 0 1.5rem',
          color: '#000',
          fontSize: '1.8rem'
        }}>
          Event Details
        </h3>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {!isEditing ? (
            <>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                  Full Name:
                </label>
                <p style={{
                  padding: '0.75rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#f8f8f8',
                }}>{formData.fullName}</p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                  Email:
                </label>
                <p style={{
                  padding: '0.75rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#f8f8f8',
                }}>{formData.email}</p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                  Phone:
                </label>
                <p style={{
                  padding: '0.75rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#f8f8f8',
                }}>{formData.phone}</p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                  Title:
                </label>
                <p style={{
                  padding: '0.75rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#f8f8f8',
                }}>{formData.title}</p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                  Start Time:
                </label>
                <p style={{
                  padding: '0.75rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#f8f8f8',
                }}>
                  {dayjs(formData.start).format('YYYY-MM-DD HH:mm')}
                </p>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                  End Time:
                </label>
                <p style={{
                  padding: '0.75rem',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  backgroundColor: '#f8f8f8',
                }}>
                  {dayjs(formData.end).format('YYYY-MM-DD HH:mm')}
                </p>
              </div>
            </>
          ) : (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                  Full Name:
                </label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#f8f8f8',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                  Email:
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    validateEmail(e.target.value);
                  }}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#f8f8f8',
                    fontSize: '1rem'
                  }}
                />
                {emailError && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.5rem' }}>{emailError}</p>}
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                  Phone:
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#f8f8f8',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                  Title:
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    backgroundColor: '#f8f8f8',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                  Start Time:
                </label>
                <DateTimePicker
                  value={formData.start ? dayjs(formData.start) : null}
                  onChange={(newVal) => {
                    if (!newVal || !newVal.isValid()) return;
                    setFormData({ ...formData, start: newVal.toISOString() });
                  }}
                  slotProps={{
                    textField: {
                      variant: 'outlined',
                      fullWidth: true,
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          backgroundColor: '#f8f8f8',
                          '& fieldset': { borderColor: '#e0e0e0' },
                          '&:hover fieldset': { borderColor: '#FFC72C' },
                          '&.Mui-focused fieldset': {
                            borderColor: '#FFC72C',
                            boxShadow: '0 0 0 3px rgba(255, 199, 44, 0.2)'
                          }
                        }
                      }
                    }
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', color: '#333', fontWeight: '500' }}>
                  End Time:
                </label>
                <DateTimePicker
                  value={formData.end ? dayjs(formData.end) : null}
                  onChange={(newVal) => {
                    if (!newVal || !newVal.isValid()) return;
                    setFormData({ ...formData, end: newVal.toISOString() });
                  }}
                  slotProps={{
                    textField: {
                      variant: 'outlined',
                      fullWidth: true,
                      sx: {
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '8px',
                          backgroundColor: '#f8f8f8',
                          '& fieldset': { borderColor: '#e0e0e0' },
                          '&:hover fieldset': { borderColor: '#FFC72C' },
                          '&.Mui-focused fieldset': {
                            borderColor: '#FFC72C',
                            boxShadow: '0 0 0 3px rgba(255, 199, 44, 0.2)'
                          }
                        }
                      }
                    }
                  }}
                />
                {endTimeError && <p style={{ color: 'red', fontSize: '0.8rem', marginTop: '0.5rem' }}>{endTimeError}</p>}
              </div>
            </>
          )}

          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            gap: '1rem', 
            marginTop: '2rem'
          }}>
            {isEditing ? (
              <>
                {!loading && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    style={{
                      padding: '0.75rem 1.5rem',
                      backgroundColor: '#f0f0f0',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      color: '#333',
                      fontWeight: '500'
                    }}
                    disabled={deleting}
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="submit"
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: loading ? '#e0e0e0' : '#FFC72C',
                    color: '#333',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600',
                    transition: 'background-color 0.2s ease'
                  }}
                  disabled={loading || deleting || !isFormValid}
                >
                  {loading ? (
                    <img src={loadingGif} alt="Loading" style={{ height: '20px' }} />
                  ) : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#FFC72C',
                    color: '#333',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontWeight: '600'
                  }}
                  disabled={deleting || loading}
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  style={{
                    padding: '0.75rem 1.5rem',
                    backgroundColor: '#f0f0f0',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    color: 'red',
                    fontWeight: '500'
                  }}
                  disabled={deleting || loading}
                >
                  {deleting ? (
                    <img src={loadingGif} alt="Loading" style={{ height: '20px' }} />
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