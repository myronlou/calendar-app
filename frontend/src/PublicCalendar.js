import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';

function PublicCalendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/');
        return;
      }
  
      try {
        // Validate token
        const validationRes = await fetch(`${API_URL}/api/events/validate-token`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!validationRes.ok) throw new Error('Invalid token');
        
        // Fetch events
        const eventsRes = await fetch(`${API_URL}/api/events`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!eventsRes.ok) {
          throw new Error('Failed to fetch events');
        }

        const eventsData = await eventsRes.json();
        setEvents(eventsData);
        setLoading(false);
      } catch (error) {
        localStorage.removeItem('token');
        navigate('/');
      }
    };
    fetchData();
  }, [navigate, API_URL]);

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading your bookings...</p>
      </div>
    );
  }

  return (
    <div className="public-calendar-container">
      <h1 className="calendar-header">Your Bookings</h1>
      
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
        initialView="listMonth"
        events={events}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listMonth'
        }}
        eventContent={({ event }) => {
          // Use a default status if event.extendedProps.status is undefined.
          const status = event.extendedProps.status || 'confirmed';
          return (
            <div className="calendar-event">
              <div className="event-header">
                <strong>{event.title}</strong>
                <span className={`status-badge ${status.toLowerCase()}`}>
                  {status}
                </span>
              </div>
              <div className="event-time">
                {event.start.toLocaleDateString()} • {event.start.toLocaleTimeString()} - {event.end.toLocaleTimeString()}
              </div>
            </div>
          );
        }}
      />
    </div>
  );
}

export default PublicCalendar;
