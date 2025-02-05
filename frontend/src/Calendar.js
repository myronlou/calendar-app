import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import CreateEventModal from './CreateEventModal';
import EditEventModal from './EditEventModal';

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

  const fetchEvents = async () => {
    const token = localStorage.getItem('token');
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
        id: event.id,
        title: event.title,
        start: event.start,
        end: event.end,
        extendedProps: {
          customerName: event.customerName,
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
    const interval = setInterval(fetchEvents, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  const handleCreateEvent = async () => {
    const token = localStorage.getItem('token');
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
      
      const newEvent = await res.json();
      setEvents(prev => [...prev, newEvent]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleUpdateEvent = async () => {
    const token = localStorage.getItem('token');
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
    const token = localStorage.getItem('token');
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
    setFormData({
      title: '',
      start: info.dateStr,
      end: info.dateStr,
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
        customerName: event.extendedProps.customerName,
        customerEmail: event.extendedProps.customerEmail
      });
      setShowEditModal(true);
    }
  };

  return (
    <div className="admin-calendar">
      <h2>Admin Calendar</h2>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
        headerToolbar={{
          left: 'title',
          center: 'dayGridMonth,timeGridWeek,dayGridDay',
          right: 'prev today next'
        }}
      />

      <CreateEventModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleCreateEvent}
      />

      <EditEventModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        formData={formData}
        setFormData={setFormData}
        onUpdate={handleUpdateEvent}
        onDelete={handleDeleteEvent}
      />
    </div>
  );
}

export default Calendar;