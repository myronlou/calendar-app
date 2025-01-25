// BookingTypes.js
import { useState } from 'react';

export default function BookingTypes() {
  const [bookingTypes, setBookingTypes] = useState([]);
  const [newType, setNewType] = useState({ name: '', duration: 30 });

  const handleAddType = () => {
    setBookingTypes(prev => [...prev, newType]);
    setNewType({ name: '', duration: 30 });
  };

  return (
    <div>
      <h2>Booking Types</h2>
      <div style={{ marginBottom: '20px' }}>
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
        <button onClick={handleAddType}>Add Type</button>
      </div>
      
      <div>
        {bookingTypes.map((type, index) => (
          <div key={index} style={{ margin: '10px 0' }}>
            {type.name} ({type.duration} mins)
          </div>
        ))}
      </div>
    </div>
  );
}