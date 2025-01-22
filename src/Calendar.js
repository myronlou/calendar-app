// client/src/Calendar.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';

function Calendar() {
  const [events, setEvents] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth/login');
      return;
    }

    // Fetch events
    fetch('http://localhost:5000/api/events', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          const transformed = data.map(evt => ({
            id: evt.id,
            title: evt.title,
            start: evt.start,
            end: evt.end
          }));
          setEvents(transformed);
        } else if (data.error) {
          // e.g. "Account not verified"
          alert(data.error);
          navigate('/auth/login');
        }
      })
      .catch(err => {
        console.error(err);
        navigate('/auth/login');
      });
  }, [navigate]);

  const handleDateClick = (info) => {
    const title = prompt('Enter event title');
    if (!title) return;

    const token = localStorage.getItem('token');
    if (!token) return;

    fetch('http://localhost:5000/api/events', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title,
        start: info.dateStr,
        end: info.dateStr
      })
    })
      .then(res => res.json())
      .then(newEvent => {
        if (newEvent.error) {
          alert(newEvent.error);
          return;
        }
        setEvents(prev => [...prev, {
          id: newEvent.id,
          title: newEvent.title,
          start: newEvent.start,
          end: newEvent.end
        }]);
      })
      .catch(console.error);
  };

  const handleEventClick = (info) => {
    if (!window.confirm(`Delete "${info.event.title}"?`)) return;
    const token = localStorage.getItem('token');
    if (!token) return;

    fetch(`http://localhost:5000/api/events/${info.event.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          alert(data.error);
          return;
        }
        setEvents(prev => prev.filter(e => e.id !== parseInt(info.event.id)));
      })
      .catch(console.error);
  };

  return (
    <div style={{ maxWidth: '900px', margin: 'auto' }}>
      <h2>Calendar</h2>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
      />
    </div>
  );
}

export default Calendar;

