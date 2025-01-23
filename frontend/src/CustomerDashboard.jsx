import React, { useState } from 'react';

function CustomerDashboard() {
  const [email, setEmail] = useState('');
  const [events, setEvents] = useState([]);

  const handleFetchEvents = async () => {
    if (!email) return alert('Please enter your email');

    try {
      const response = await fetch(`http://localhost:5001/api/events/byEmail?email=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (data.error) {
        alert(data.error);
      } else {
        setEvents(data);
      }
    } catch (error) {
      console.error('Failed to fetch events by email:', error);
    }
  };

  return (
    <div style={{ maxWidth: '700px', margin: 'auto' }}>
      <h2>Customer Dashboard</h2>
      <div>
        <label>Enter your email: </label>
        <input
          type="text"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="someone@example.com"
        />
        <button onClick={handleFetchEvents}>Load My Events</button>
      </div>

      <hr />

      <h3>My Events:</h3>
      {events.length === 0 ? (
        <p>No events found.</p>
      ) : (
        <ul>
          {events.map((evt) => (
            <li key={evt.id}>
              <strong>{evt.title}</strong> from {evt.start} to {evt.end}
              <br />
              {evt.isVerified ? 'Verified' : 'Not Verified'}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default CustomerDashboard;
