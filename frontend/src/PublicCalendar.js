import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
import CreateEventModal from './CreateEventModal';
import EditEventModal from './EditEventModal';
import './PublicCalendar.css';

dayjs.extend(utc);
dayjs.extend(isSameOrBefore);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function PublicCalendar() {
  const [events, setEvents] = useState([]);
  const [backgroundEvents, setBackgroundEvents] = useState([]);
  const [availability, setAvailability] = useState({}); // Object keyed by day (e.g. { mon: { start, end, enabled } })
  const [rawExclusions, setRawExclusions] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    start: '',
    end: '',
    fullName: '',
    email: '',
    phone: '',
    bookingTypeId: ''
  });

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const calendarRef = useRef(null);

  let currentUserEmail = '';
  if (token) {
    try {
      const decoded = jwtDecode(token);
      currentUserEmail = decoded.email || '';
    } catch (err) {
      console.error('Token decode error:', err);
      currentUserEmail = '';
    }
  }

  // If token is missing, redirect to login.
  useEffect(() => {
    if (!token) {
      navigate('/auth/login');
    }
  }, [token, navigate]);

  // Fetch customer events
  const fetchEvents = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/events`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      const formatted = data.map(event => ({
        id: event.id.toString(),
        title: event.bookingType && event.bookingType.name ? event.bookingType.name : 'Booking',
        start: event.start,
        end: event.end,
        fullName: event.fullName,
        phone: event.phone,
        bookingTypeId: event.bookingTypeId,
        email: event.email,
        bookingTypeColor: event.bookingTypeColor
      }));
      setEvents(formatted);
    } catch (error) {
      console.error('Error fetching events:', error);
      localStorage.removeItem('token');
      navigate('/auth/login');
    }
  };

  // Fetch availability from public endpoint
  const fetchAvailability = async () => {
    try {
      const res = await fetch(`${API_URL}/api/availability`);
      if (!res.ok) throw new Error('Failed to fetch availability');
      // Now, the backend returns an array (same as admin)
      const data = await res.json();
      const availObj = {};
      data.forEach(rec => {
        availObj[rec.day] = {
          start: rec.start,
          end: rec.end,
          enabled: rec.enabled
        };
      });
      setAvailability(availObj);
    } catch (error) {
      console.error('Error fetching availability:', error);
    }
  };

  // Fetch exclusions (unchanged)
  const fetchRawExclusions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/public/exclusions`);
      if (!res.ok) throw new Error('Failed to fetch exclusions');
      const data = await res.json();
      setRawExclusions(data);
    } catch (error) {
      console.error('Error fetching exclusions:', error);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchAvailability();
    fetchRawExclusions();
    // Poll events every 5 seconds
    const interval = setInterval(fetchEvents, 500);
    return () => clearInterval(interval);
  }, [navigate, token]);

  // Compute background events (to darken unavailable times) using availability and exclusions.
  const generateBackgroundEvents = (info) => {
    let bgEvents = [];
    const rangeStartLocal = dayjs(info.start).startOf('day');
    const rangeEndLocal = dayjs(info.end).startOf('day');

    // For each day in the visible range...
    for (let dLocal = rangeStartLocal.clone(); dLocal.isBefore(rangeEndLocal); dLocal = dLocal.add(1, 'day')) {
      const dUtc = dLocal.clone().utc();
      const dayAbbr = dUtc.format('ddd').toLowerCase().slice(0, 3);
      const localDayStart = dLocal.clone().startOf('day');
      const localDayEnd = dLocal.clone().endOf('day');
      const avail = availability[dayAbbr];

      if (!avail || !avail.enabled) {
        bgEvents.push({
          id: `bg-disabled-${dLocal.format('YYYY-MM-DD')}`,
          start: localDayStart.toISOString(),
          end: localDayEnd.toISOString(),
          display: 'background',
          backgroundColor: '#e0e0e0'
        });
        continue;
      }

      let [startH, startM] = avail.start.split(':').map(Number);
      let [endH, endM] = avail.end.split(':').map(Number);
      let dayStartUtc = dUtc.clone().startOf('day');
      let windowStartUtc = dayStartUtc.clone().add(startH, 'hour').add(startM, 'minute');
      let windowEndUtc = dayStartUtc.clone().add(endH, 'hour').add(endM, 'minute');

      if (windowEndUtc.isBefore(windowStartUtc)) {
        windowEndUtc = windowEndUtc.add(1, 'day');
      }

      let windowStartLocal = windowStartUtc.local();
      let windowEndLocal = windowEndUtc.local();

      let availStart = windowStartLocal.isAfter(localDayStart) ? windowStartLocal : localDayStart;
      let availEnd = windowEndLocal.isBefore(localDayEnd) ? windowEndLocal : localDayEnd;

      if (availEnd.isSameOrBefore(availStart)) {
        bgEvents.push({
          id: `bg-disabled-${dLocal.format('YYYY-MM-DD')}`,
          start: localDayStart.toISOString(),
          end: localDayEnd.toISOString(),
          display: 'background',
          backgroundColor: '#e0e0e0'
        });
      } else {
        if (availStart.isAfter(localDayStart)) {
          bgEvents.push({
            id: `bg-${dLocal.format('YYYY-MM-DD')}-before`,
            start: localDayStart.toISOString(),
            end: availStart.toISOString(),
            display: 'background',
            backgroundColor: '#e0e0e0'
          });
        }
        if (availEnd.isBefore(localDayEnd)) {
          bgEvents.push({
            id: `bg-${dLocal.format('YYYY-MM-DD')}-after`,
            start: availEnd.toISOString(),
            end: localDayEnd.toISOString(),
            display: 'background',
            backgroundColor: '#e0e0e0'
          });
        }
      }
    }

    // Add background events for each exclusion
    rawExclusions.forEach(ex => {
      const exStartUtc = dayjs.utc(`${ex.startDate}T${ex.startTime}`);
      const exEndUtc = ex.endDate ? dayjs.utc(`${ex.endDate}T${ex.endTime}`) : exStartUtc;
      const exStartLocal = exStartUtc.local();
      const exEndLocal = exEndUtc.local();

      if (exEndLocal.isBefore(rangeStartLocal) || exStartLocal.isAfter(rangeEndLocal)) return;

      for (let d2 = rangeStartLocal.clone(); d2.isBefore(rangeEndLocal); d2 = d2.add(1, 'day')) {
        const dayStart = d2.clone().startOf('day');
        const dayEnd = d2.clone().endOf('day');

        if (dayEnd.isBefore(exStartLocal) || dayStart.isAfter(exEndLocal)) continue;

        const clampStart = exStartLocal.isAfter(dayStart) ? exStartLocal : dayStart;
        const clampEnd = exEndLocal.isBefore(dayEnd) ? exEndLocal : dayEnd;

        bgEvents.push({
          id: `ex-${ex.id}-${d2.format('YYYY-MM-DD')}`,
          start: clampStart.toISOString(),
          end: clampEnd.isSame(dayEnd)
              ? d2.clone().add(1, 'day').startOf('day').toISOString()
              : clampEnd.toISOString(),
          display: 'background',
          backgroundColor: '#e0e0e0'
        });
      }
    });

    setBackgroundEvents(bgEvents);
  };

  // Update background events when the visible calendar range changes.
  const handleDatesSet = (info) => {
    if (Object.keys(availability).length > 0) {
      generateBackgroundEvents(info);
    }
  };

  useEffect(() => {
    if (calendarRef.current && Object.keys(availability).length > 0) {
      const calendarApi = calendarRef.current.getApi();
      generateBackgroundEvents({
        start: calendarApi.view.activeStart,
        end: calendarApi.view.activeEnd
      });
    }
  }, [availability, rawExclusions]);

  // Create, update, and delete event handlers using public endpoints.
  const handleCreateEvent = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/events/auth`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to create event');
      const responseData = await res.json();
      const createdEvent = responseData.event;
      setEvents(prev => [...prev, createdEvent]);
      setShowCreateModal(false);
      return createdEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      return { error: true };
    }
  };

  const handleUpdateEvent = async () => {
    if (!token || !selectedEvent) return;
    try {
      const res = await fetch(`${API_URL}/api/events/auth/${selectedEvent.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to update event');
      const updatedEvent = await res.json();
      setEvents(prev =>
        prev.map(event => event.id === updatedEvent.id ? updatedEvent : event)
      );
      setShowEditModal(false);
      return updatedEvent;
    } catch (error) {
      console.error('Error updating event:', error);
      return { error: true };
    }
  };

  const handleDeleteEvent = async () => {
    if (!token || !selectedEvent) return;
    try {
      await fetch(`${API_URL}/api/events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setEvents(prev => prev.filter(event => event.id !== selectedEvent.id));
      setShowEditModal(false);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // When a date cell is clicked, prefill the start/end with that date.
  const handleDateClick = (info) => {
    const utcDateStr = dayjs(info.dateStr).utc().toISOString();
    setFormData({
      title: '',
      start: utcDateStr,
      end: utcDateStr,
      fullName: '',
      email: currentUserEmail,
      phone: '',
      bookingTypeId: ''
    });
    setShowCreateModal(true);
  };

  // When an event is clicked, open the edit modal.
  const handleEventClick = (info) => {
    const event = events.find(e => e.id === info.event.id);
    if (event) {
      setSelectedEvent(event);
      setFormData({
        title: event.title,
        start: event.start,
        end: event.end,
        fullName: event.fullName,
        email: event.email,
        phone: event.phone,
        bookingTypeId: event.bookingTypeId
      });
      setShowEditModal(true);
    }
  };

  return (
    <div className="public-calendar-page">
      <header className="public-calendar-header">
        <div className="header-left">
          <h1 className="app-title">Your Bookings</h1>
        </div>
        <div className="header-right">
          <button
            className="new-booking-button"
            onClick={() => {
              setFormData({
                title: '',
                start: '',
                end: '',
                fullName: '',
                email: currentUserEmail,
                phone: '',
                bookingTypeId: ''
              });
              setShowCreateModal(true);
            }}
          >
            New Booking
          </button>
          <button
            className="logout-button"
            onClick={() => {
              localStorage.removeItem('token');
              navigate('/');
            }}
          >
            Log out
          </button>
        </div>
      </header>
      <div className="public-calendar-content">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="timeGridWeek"
          timeZone="local"
          selectable={true}
          events={[...events, ...backgroundEvents]}
          datesSet={handleDatesSet}
          dateClick={handleDateClick}
          eventClick={handleEventClick}
          allDaySlot={false}
          headerToolbar={{
            left: 'title',
            center: 'timeGridWeek,dayGridDay',
            right: 'prev today next'
          }}
          eventContent={(eventInfo) => {
            if (eventInfo.event.display === 'background') return null;
            return (
              <div className="custom-event-content">
                <div className="event-left">
                  <span className="booking-type-dot" style={{ backgroundColor: eventInfo.event.extendedProps.bookingTypeColor || '#007bff' }}></span>
                  <span className="event-title">{eventInfo.event.extendedProps.fullName}</span>
                </div>
                <div className="event-right">
                  {dayjs(eventInfo.event.start).format('h A')}
                </div>
              </div>
            );
          }}
        />
      </div>
      <CreateEventModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        formData={formData}
        setFormData={setFormData}
        currentUserEmail={currentUserEmail}
        isAdmin={false}
        onSubmit={handleCreateEvent}
      />
      <EditEventModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        formData={formData}
        currentUserEmail={currentUserEmail}
        isAdmin={false}
        setFormData={setFormData}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}

export default PublicCalendar;
