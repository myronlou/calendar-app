import React, { useState, useEffect } from 'react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function BookingTypes() {
  const [bookingTypes, setBookingTypes] = useState([]);
  const [newType, setNewType] = useState({ name: '', duration: 30 });

  useEffect(() => {
    const fetchTypes = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/booking-types`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (!res.ok) throw new Error('Failed to fetch booking types');
        
        const data = await res.json();
        setBookingTypes(data);
      } catch (error) {
        console.error('Error:', error);
      }
    };
    
    fetchTypes();
  }, []);

  const handleAddType = async () => {
    if (!newType.name.trim()) return;

    try {
      const res = await fetch(`${API_URL}/api/admin/booking-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(newType)
      });

      if (!res.ok) throw new Error('Failed to create booking type');
      
      const createdType = await res.json();
      setBookingTypes(prev => [...prev, createdType]);
      setNewType({ name: '', duration: 30 });
    } catch (error) {
      console.error('Error creating type:', error);
    }
  };

  return (
    <div className="booking-types-admin">
      <h2>Manage Booking Types</h2>
      <div className="type-creator">
        <input
          type="text"
          placeholder="Type name"
          value={newType.name}
          onChange={(e) => setNewType(prev => ({ ...prev, name: e.target.value }))}
        />
        <select
          value={newType.duration}
          onChange={(e) => setNewType(prev => ({ ...prev, duration: parseInt(e.target.value) }))}
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={60}>60 minutes</option>
        </select>
        <button onClick={handleAddType}>Add Booking Type</button>
      </div>

      <div className="types-list">
        <h3>Available Booking Types</h3>
        {bookingTypes.map(type => (
          <div key={type.id} className="type-item">
            <span className="type-name">{type.name}</span>
            <span className="type-duration">{type.duration} minutes</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BookingTypes;