import React, { useState, useEffect } from 'react';
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

function Calendar() {
  const [events, setEvents] = useState([]);
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

  let currentUser = null;
  if (token) {
    try {
      currentUser = jwtDecode(token);
    } catch (err) {
      console.error('Token decode error:', err);
      // Optionally, force re-login if token is invalid
      localStorage.removeItem('token');
      navigate('/auth/login');
    }
  }

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

  useEffect(() => {
    fetchEvents();
    const interval = setInterval(fetchEvents, 2000);
    return () => clearInterval(interval);
  }, [navigate]);

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
      // Extract the event from the response envelope
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
      const res = await fetch(
        `${API_URL}/api/admin/events/${selectedEvent.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(formData)
        }
      );

      if (!res.ok) throw new Error('Failed to update event');
      
      const updatedEvent = await res.json();
      setEvents(prev => 
        prev.map(event => 
          event.id === updatedEvent.id ? updatedEvent : event
        )
      );
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };

  const handleDeleteEvent = async () => {
    if (!token || !selectedEvent) return;

    try {
      await fetch(
        `${API_URL}/api/admin/events/${selectedEvent.id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        }
      );
      
      setEvents(prev => prev.filter(event => event.id !== selectedEvent.id));
      setShowEditModal(false);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  const handleDateClick = (info) => {
    // Convert the received local date string to UTC before saving
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
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        timeZone="local"
        selectable={true}
        events={events.map(event => ({
          id: event.id,
          title: event.title,
          start: event.start,
          end: event.end,
          fullName: event.fullName,
          extendedProps: {
            fullName: event.fullName,
            customerEmail: event.customerEmail,
            phone: event.phone,
            bookingTypeId: event.bookingTypeId,
            bookingTypeColor: event.bookingTypeColor || '#e5e5ea'
          }
        }))}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        headerToolbar={{
          left: 'title',
          center: 'dayGridMonth,timeGridWeek,dayGridDay',
          right: 'prev today next'
        }}
        eventContent={(eventInfo) => (
          <div className="custom-event-content">
            <div className="event-left">
              <span
                className="booking-type-dot"
                style={{ backgroundColor: eventInfo.event.extendedProps.bookingTypeColor }}
              ></span>
              <span className="event-title">{eventInfo.event.extendedProps.fullName}</span>
            </div>
            <div className="event-right">
            <span className="event-time">{formatEventTime(eventInfo.event.start)}</span>
            </div>
          </div>
        )}
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