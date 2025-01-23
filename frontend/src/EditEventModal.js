import React, { useState } from 'react';
import { motion } from 'framer-motion';

function EditEventModal({ show, onClose, formData, setFormData, onUpdate = () => {}, onDelete }) {
  const [isEditing, setIsEditing] = useState(false);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex',
      justifyContent: 'center', alignItems: 'center',
      zIndex: 1000
    }}
      onClick={onClose}>
      <motion.div
        style={{
          background: 'white', padding: '20px', borderRadius: '5px',
          minWidth: '350px', position: 'relative'
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        onClick={(e) => e.stopPropagation()}>
        <h3>{isEditing ? 'Edit Event' : 'Event Details'}</h3>
        <form onSubmit={(e) => { e.preventDefault(); onUpdate(); }}>
          <div>
            <label>Full Name:</label>
            <input type="text" value={formData.fullName} disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} />
          </div>
          <div>
            <label>Email:</label>
            <input type="email" value={formData.email} disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div>
            <label>Phone:</label>
            <input type="text" value={formData.phone} disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div>
            <label>Title:</label>
            <input type="text" value={formData.title} disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
          </div>
          <div>
            <label>Start Time:</label>
            <input type="datetime-local" value={formData.start} disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, start: e.target.value })} />
          </div>
          <div>
            <label>End Time:</label>
            <input type="datetime-local" value={formData.end} disabled={!isEditing}
              onChange={(e) => setFormData({ ...formData, end: e.target.value })} />
          </div>
          {isEditing ? (
            <>
              <button type="submit">Save Changes</button>
              <button type="button" onClick={() => setIsEditing(false)}>Cancel</button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setIsEditing(true)}>Edit</button>
              <button type="button" onClick={onDelete} style={{ color: 'red' }}>Delete</button>
              <button type="button" onClick={onClose}>Close</button>
            </>
          )}
        </form>
      </motion.div>
    </div>
  );
}

export default EditEventModal;