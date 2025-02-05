import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import './PublicCalendar.css';

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
    <div className="public-calendar-page">
      {/* TOP BANNER / HEADER */}
      <header className="public-calendar-header">
        <div className="header-left">
          {/* Title or Logo */}
          <h1 className="app-title">Your Bookings</h1>
        </div>
        <div className="header-right">
            <button
              className="logout-button"
              onClick={() => {
                localStorage.removeItem('token');
                navigate('/');
              }}>
                Log out
            </button>
        </div>
      </header>

      {/* MAIN CALENDAR CONTENT */}
      <div className="public-calendar-content">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin]}
          initialView="dayGridMonth"
          events={events}
          // Reconfigure the toolbar for the iCloud-style layout:
          headerToolbar={{
            left: 'title',
            center: 'dayGridMonth,timeGridWeek,dayGridDay',
            right: 'prev today next'
          }}
          // Force events to fit better (wrapping text if needed)
          eventContent={({ event }) => {
            return (
              <div className="calendar-event">
                <span className="event-title">{event.title}</span>
                <span className="event-time">
                  {event.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {event.end && ' - ' + event.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            );
          }}
        />
      </div>
    </div>
  );
}

export default PublicCalendar;
