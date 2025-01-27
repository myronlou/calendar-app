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

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('eventToken');
      if (!token) return navigate('/');
  
      try {
        // Validate token via headers only
        const validationRes = await fetch(
          `http://localhost:5001/api/events/validate-token`, // No query param
          {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${token}` }, // Token in header
            credentials: 'include'
          }
        );
  
        if (!validationRes.ok) throw new Error('Invalid token');
        
        // Fetch user events
        const eventsRes = await fetch(`http://localhost:5001/api/events/user`, {
          method: 'GET',
          headers: { 'Authorization': `Bearer ${token}` }, // Token in header
          credentials: 'include'
        });
        
        if (!eventsRes.ok) throw new Error('Failed to fetch events');
        
        const eventsData = await eventsRes.json();
  
        setEvents(eventsData.map(evt => ({
          title: evt.title,
          start: new Date(evt.start),
          end: new Date(evt.end),
          extendedProps: {
            status: evt.isVerified ? 'Confirmed' : 'Pending'
          }
        })));
      } catch (error) {
        console.error('Calendar error:', error);
        localStorage.removeItem('eventToken');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
  
    fetchData();
  }, [navigate]);

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
        eventContent={({ event }) => (
          <div className="calendar-event">
            <div className="event-header">
              <strong>{event.title}</strong>
              <span className={`status-badge ${event.extendedProps.status.toLowerCase()}`}>
                {event.extendedProps.status}
              </span>
            </div>
            <div className="event-time">
              {event.start.toLocaleDateString()} • 
              {event.start.toLocaleTimeString()} - {event.end.toLocaleTimeString()}
            </div>
          </div>
        )}
      />
    </div>
  );
}

export default PublicCalendar;