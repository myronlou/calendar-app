import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import CreateEventModal from './CreateEventModal';
import EditEventModal from './EditEventModal';
import { jwtDecode } from 'jwt-decode';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
dayjs.extend(utc);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

// Converts a UTC time string to a local "HH:mm" string.
function formatLocalTime(dateString) {
  const d = new Date(dateString);
  const hours = d.getHours().toString().padStart(2, '0');
  const minutes = d.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

function Calendar() {
  const [events, setEvents] = useState([]);
  const [backgroundEvents, setBackgroundEvents] = useState([]);
  const [adminAvailability, setAdminAvailability] = useState({}); // e.g., { mon: { start:"09:00", end:"18:00", enabled: true }, ... }
  const [rawExclusions, setRawExclusions] = useState([]); // fetched from /api/public/exclusions
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    start: '',
    end: '',
    customerName: '',
    customerEmail: ''
  });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const calendarRef = useRef(null); // to access FullCalendar API

  let currentUser = null;
  if (token) {
    try {
      currentUser = jwtDecode(token);
    } catch (err) {
      console.error('Token decode error:', err);
      localStorage.removeItem('token');
      navigate('/auth/login');
    }
  }

  // Fetch admin events
  const fetchEvents = async () => {
    if (!token) return navigate('/auth/login');
    try {
      const res = await fetch(`${API_URL}/api/admin/events`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      if (!res.ok) throw new Error('Failed to fetch events');
      const data = await res.json();
      setEvents(data.map(event => ({
        id: event.id.toString(),
        title: event.title,
        start: event.start,
        end: event.end,
        fullName: event.fullName,
        phone: event.phone,
        bookingTypeColor: event.bookingTypeColor,
        bookingTypeId: event.bookingTypeId,
        email: event.email,
        extendedProps: {
          customerEmail: event.customerEmail
        }
      })));
    } catch (error) {
      console.error('Error fetching events:', error);
      localStorage.removeItem('token');
      navigate('/auth/login');
    }
  };

  // Fetch admin availability
  const fetchAdminAvailability = async () => {
    try {
      const res = await fetch(`${API_URL}/api/admin/availability`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      const availObj = {};
      data.forEach(rec => {
        availObj[rec.day] = {
          start: rec.start,
          end: rec.end,
          enabled: rec.enabled
        };
      });
      setAdminAvailability(availObj);
    } catch (error) {
      console.error("Error fetching admin availability:", error);
    }
  };

  // Fetch raw exclusions from public endpoint
  const fetchRawExclusions = async () => {
    try {
      const res = await fetch(`${API_URL}/api/public/exclusions`);
      if (!res.ok) throw new Error('Failed to fetch public exclusions');
      const data = await res.json();
      setRawExclusions(data);
    } catch (error) {
      console.error("Error fetching raw exclusions:", error);
    }
  };

  useEffect(() => {
    fetchEvents();
    fetchAdminAvailability();
    fetchRawExclusions();
    const interval = setInterval(fetchEvents, 2000);
    return () => clearInterval(interval);
  }, [navigate, token]);

  // Generate background events based on admin availability and exclusions.
  const generateBackgroundEvents = (info) => {
    let bgEvents = [];
    const rangeStart = dayjs(info.start);
    const rangeEnd = dayjs(info.end);
    // First, generate background events for admin availability:
    for (let d = rangeStart; d.isBefore(rangeEnd); d = d.add(1, 'day')) {
      const dayAbbr = d.format('ddd').toLowerCase(); // e.g., "mon", "tue", etc.
      const avail = adminAvailability[dayAbbr];
      const dayStr = d.format('YYYY-MM-DD');
      if (!avail || !avail.enabled) {
        // If not enabled, mark the whole day as unavailable.
        bgEvents.push({
          id: `bg-${dayStr}`,
          start: dayStr,
          end: d.add(1, 'day').format('YYYY-MM-DD'),
          display: 'background',
          backgroundColor: '#cccccc'
        });
      } else {
        // Mark the time before the available window:
        bgEvents.push({
          id: `bg-${dayStr}-morning`,
          start: dayStr, // midnight by default
          end: `${dayStr}T${avail.start}`,
          display: 'background',
          backgroundColor: '#cccccc'
        });
        // Mark the time after the available window:
        bgEvents.push({
          id: `bg-${dayStr}-evening`,
          start: `${dayStr}T${avail.end}`,
          end: d.add(1, 'day').format('YYYY-MM-DD'),
          display: 'background',
          backgroundColor: '#cccccc'
        });
      }
    }

    // Next, generate background events for each exclusion:
    rawExclusions.forEach(ex => {
      
      // Use the provided exclusion dates.
      const exStart = dayjs(ex.startDate);
      const exEnd = ex.endDate ? dayjs(ex.endDate) : exStart;
      // Loop over each day in the visible range that falls within the exclusion.
      for (let d = rangeStart; d.isBefore(rangeEnd); d = d.add(1, 'day')) {
        if (d.isBefore(exStart, 'day') || d.isAfter(exEnd, 'day')) continue;
        // Determine effective times for this day.
        let effectiveStart = "00:00";
        let effectiveEnd = "24:00";
        if (d.isSame(exStart, 'day') && ex.startTime) {
          effectiveStart = formatLocalTime(ex.startTime);
        }
        if (d.isSame(exEnd, 'day') && ex.endTime) {
          effectiveEnd = formatLocalTime(ex.endTime);
        }
        const dayStr = d.format('YYYY-MM-DD');
        let eventStart = `${dayStr}T${effectiveStart}`;
        let eventEnd = effectiveEnd === "24:00" 
          ? d.add(1, 'day').format('YYYY-MM-DD') 
          : `${dayStr}T${effectiveEnd}`;
        bgEvents.push({
          id: `ex-${ex.id}-${dayStr}`,
          start: eventStart,
          end: eventEnd,
          display: 'background',
          backgroundColor: '#cccccc'
        });
      }
    });
    setBackgroundEvents(bgEvents);
  };

  // Use FullCalendar's datesSet callback to generate background events.
  const handleDatesSet = (info) => {
    if (Object.keys(adminAvailability).length > 0) {
      generateBackgroundEvents(info);
    }
  };

  // Also recalc background events if availability or exclusions change.
  useEffect(() => {
    if (calendarRef.current && Object.keys(adminAvailability).length > 0) {
      const calendarApi = calendarRef.current.getApi();
      generateBackgroundEvents({
        start: calendarApi.view.activeStart,
        end: calendarApi.view.activeEnd
      });
    }
  }, [adminAvailability, rawExclusions]);

  const handleCreateEvent = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/api/admin/events`, {
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
      const res = await fetch(`${API_URL}/api/admin/events/${selectedEvent.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error('Failed to update event');
      const updatedEvent = await res.json();
      setEvents(prev => prev.map(event => event.id === updatedEvent.id ? updatedEvent : event));
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDeleteEvent = async () => {
    if (!token || !selectedEvent) return;
    try {
      await fetch(`${API_URL}/api/admin/events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setEvents(prev => prev.filter(event => event.id !== selectedEvent.id));
      setShowEditModal(false);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleDateClick = (info) => {
    const utcDateStr = dayjs(info.dateStr).utc().toISOString();
    setFormData({
      title: '',
      start: utcDateStr,
      end: utcDateStr,
      customerName: '',
      customerEmail: ''
    });
    setShowCreateModal(true);
  };

  const handleEventClick = (info) => {
    const event = events.find(e => e.id === info.event.id);
    if (event) {
      setSelectedEvent(event);
      setFormData({
        title: event.title,
        start: event.start,
        end: event.end,
        phone: event.phone,
        fullName: event.fullName,
        email: event.email,
        bookingTypeId: event.bookingTypeId,
        customerEmail: event.extendedProps.customerEmail
      });
      setShowEditModal(true);
    }
  };

  const formatEventTime = (dateStr) => {
    return dayjs(dateStr).format('h A');
  };

  return (
    <div className="admin-calendar">
      <h2>Admin Calendar</h2>
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        timeZone="local"
        selectable={true}
        // Merge admin events with background events.
        events={[...events, ...backgroundEvents]}
        datesSet={handleDatesSet}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        allDaySlot={false}
        headerToolbar={{
          left: 'title',
          center: 'dayGridMonth,timeGridWeek,dayGridDay',
          right: 'prev today next'
        }}
        eventContent={(eventInfo) => {
          // If it's a background event, return null so no "12 AM" or "All Day" label appears
          if (eventInfo.event.display === 'background') {
            return null;
          }
          // Otherwise, show your normal custom event content
          return (
            <div className="custom-event-content">
              <div className="event-left">
                <span
                  className="booking-type-dot"
                  style={{ backgroundColor: eventInfo.event.extendedProps.bookingTypeColor }}
                ></span>
                <span className="event-title">{eventInfo.event.extendedProps.fullName}</span>
              </div>
              <div className="event-right">
                {/* Example: format your event start time for display */}
                {dayjs(eventInfo.event.start).format('h A')}
              </div>
            </div>
          );
        }}
      />

      <CreateEventModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleCreateEvent}
        isAdmin={currentUser && currentUser.role === 'admin'}
      />

      <EditEventModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        formData={formData}
        setFormData={setFormData}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
        isAdmin={currentUser && currentUser.role === 'admin'}
      />
    </div>
  );
}

export default Calendar;
