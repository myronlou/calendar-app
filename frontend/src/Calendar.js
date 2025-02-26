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
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore';
dayjs.extend(utc);
dayjs.extend(isSameOrBefore);

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

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
      if (!res.ok) throw new Error('Failed to fetch availability');
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
    const interval = setInterval(fetchEvents, 500);
    return () => clearInterval(interval);
  }, [navigate, token]);

  // -------------------- BACKGROUND EVENTS (AVAILABILITY + EXCLUSIONS) --------------------
  const generateBackgroundEvents = (info) => {
    let bgEvents = [];
    const rangeStartLocal = dayjs(info.start).startOf('day');
    const rangeEndLocal = dayjs(info.end).startOf('day');

    // ---- 1) AVAILABILITY (cross-midnight fix) ----
    for (let dLocal = rangeStartLocal.clone(); dLocal.isBefore(rangeEndLocal); dLocal = dLocal.add(1, 'day')) {
      // dLocal is the local "day" boundary (e.g. 00:00 local)
      const dUtc = dLocal.clone().utc(); // the matching UTC day boundary
      const dayAbbrUtc = dUtc.format('ddd').toLowerCase().slice(0,3);
      const localDayStart = dLocal.clone().startOf('day');
      const localDayEnd = dLocal.clone().endOf('day');
      const avail = adminAvailability[dayAbbrUtc];

      if (!avail || !avail.enabled) {
        // Entire day unavailable
        bgEvents.push({
          id: `bg-disabled-${dLocal.format('YYYY-MM-DD')}`,
          start: localDayStart.toISOString(),
          end: localDayEnd.toISOString(),
          display: 'background',
          backgroundColor: '#e0e0e0'
        });
        continue;
      }

      // e.g. "23:00" -> startH=23, startM=0; "02:00" -> endH=2, endM=0
      let [startH, startM] = avail.start.split(':').map(Number);
      let [endH, endM] = avail.end.split(':').map(Number);

      // Monday in UTC = 00:00 -> dayStartUtc
      // Then add hours/minutes
      let dayStartUtc = dUtc.clone().startOf('day');
      let windowStartUtc = dayStartUtc.clone().add(startH, 'hour').add(startM, 'minute');
      let windowEndUtc = dayStartUtc.clone().add(endH, 'hour').add(endM, 'minute');

      // If end < start, assume cross-midnight => add 24h to end
      if (windowEndUtc.isBefore(windowStartUtc)) {
        windowEndUtc = windowEndUtc.add(1, 'day'); 
      }

      // Convert to local
      let windowStartLocal = windowStartUtc.local();
      let windowEndLocal = windowEndUtc.local();

      // Now clamp the "available" window to this local day
      // "available" = intersection of [windowStartLocal, windowEndLocal) and [localDayStart, localDayEnd)
      let availStart = windowStartLocal.isAfter(localDayStart) ? windowStartLocal : localDayStart;
      let availEnd = windowEndLocal.isBefore(localDayEnd) ? windowEndLocal : localDayEnd;

      // If there's no overlap => shade entire day
      if (availEnd.isSameOrBefore(availStart)) {
        bgEvents.push({
          id: `bg-disabled-${dLocal.format('YYYY-MM-DD')}`,
          start: localDayStart.toISOString(),
          end: localDayEnd.toISOString(),
          display: 'background',
          backgroundColor: '#e0e0e0'
        });
      } else {
        // Shade from midnight to availStart
        if (availStart.isAfter(localDayStart)) {
          bgEvents.push({
            id: `bg-${dLocal.format('YYYY-MM-DD')}-before`,
            start: localDayStart.toISOString(),
            end: availStart.toISOString(),
            display: 'background',
            backgroundColor: '#e0e0e0'
          });
        }
        // Shade from availEnd to midnight
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

    // ---- 2) EXCLUSIONS (also stored as UTC) ----
    rawExclusions.forEach(ex => {
      // Combine the date/time fields as UTC
      const exStartUtc = dayjs.utc(`${ex.startDate}T${ex.startTime}`);
      const exEndUtc = ex.endDate 
        ? dayjs.utc(`${ex.endDate}T${ex.endTime}`)
        : exStartUtc;

      // Convert to local
      const exStartLocal = exStartUtc.local();
      const exEndLocal = exEndUtc.local();

      // Skip if entirely outside the visible local range
      if (exEndLocal.isBefore(rangeStartLocal) || exStartLocal.isAfter(rangeEndLocal)) return;

      // For each local day in [rangeStartLocal, rangeEndLocal)
      for (let d2 = rangeStartLocal.clone(); d2.isBefore(rangeEndLocal); d2 = d2.add(1, 'day')) {
        const dayStart = d2.clone().startOf('day');
        const dayEnd = d2.clone().endOf('day');

        if (dayEnd.isBefore(exStartLocal) || dayStart.isAfter(exEndLocal)) continue;

        // Overlap
        const clampStart = exStartLocal.isAfter(dayStart) ? exStartLocal : dayStart;
        const clampEnd = exEndLocal.isBefore(dayEnd) ? exEndLocal : dayEnd;

        bgEvents.push({
          id: `ex-${ex.id}-${d2.format('YYYY-MM-DD')}`,
          start: clampStart.toISOString(),
          // If it exactly hits dayEnd, push it to next day’s 00:00 so it doesn’t label “12 AM”
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
        initialView="timeGridWeek"
        timeZone="local"
        selectable={true}
        // Merge admin events with background events.
        events={[...events, ...backgroundEvents]}
        datesSet={handleDatesSet}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        allDaySlot={false}
        dayMaxEventRows={true}
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
