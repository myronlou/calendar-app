import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import CreateEventModal from './CreateEventModal';
import EditEventModal from './EditEventModal';

function Calendar() {
  const [events, setEvents] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    title: '',
    start: '',
    end: ''
  });

  const navigate = useNavigate();

  // -- 1) Wrap your fetch in a function
  const fetchEvents = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth/login');
      return;
    }

    try {
      const res = await fetch('http://localhost:5001/api/admin/events', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();

      if (Array.isArray(data)) {
        setEvents(
          data.map((evt) => ({
            id: evt.id,
            title: evt.title,
            start: evt.start,
            end: evt.end,
            fullName: evt.fullName,
            email: evt.email,
            phone: evt.phone
          }))
        );
      } else if (data.error) {
        alert(data.error);
        navigate('/auth/login');
      }
    } catch (err) {
      console.error(err);
      navigate('/auth/login');
    }
  };

  // -- 2) useEffect for initial load + setInterval
  useEffect(() => {
    fetchEvents(); // fetch initially

    // Poll every 5 seconds (5000 ms)
    const intervalId = setInterval(() => {
      fetchEvents();
    }, 20000);

    // Cleanup on unmount
    return () => clearInterval(intervalId);
  }, [navigate]);

  // ---- CREATE EVENT ----
  // This is what gets passed to <CreateEventModal onSubmit={handleCreateEvent} />
  const handleCreateEvent = async () => {
    const token = localStorage.getItem('token');
    if (!token) return { error: 'No token found' };

    try {
      const response = await fetch('http://localhost:5001/api/admin/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.error) {
        alert(data.error);
        return { error: data.error };
      }

      // data.eventId is returned by the server
      // We'll add the new event to state so it appears immediately
      const newEvent = {
        id: data.eventId,       // from server
        title: formData.title,  // from local form
        start: formData.start,
        end: formData.end,
        fullName: formData.fullName,
        email: formData.email,
        phone: formData.phone
      };

      setEvents((prev) => [...prev, newEvent]);

      // Return the new event so CreateEventModal knows everything succeeded
      return newEvent;
    } catch (error) {
      console.error('Error creating event:', error);
      return { error: error.message };
    }
  };

  const handleDateClick = (info) => {
    const selectedDate = new Date(info.dateStr);
    const oneHourLater = new Date(selectedDate.getTime() + 60 * 60 * 1000);

    setFormData({
      fullName: '',
      email: '',
      phone: '',
      title: '',
      start: selectedDate.toISOString().slice(0, 16),
      end: oneHourLater.toISOString().slice(0, 16)
    });
    setSelectedEvent(null);
    setShowCreateModal(true);
  };

  // ---- EDIT EVENT ----
  const handleEventClick = (info) => {
    const event = events.find((evt) => evt.id === parseInt(info.event.id));
    if (event) {
      setSelectedEvent(event);
      setFormData({
        id: event.id,  // ✅ Ensure ID is included
        fullName: event.fullName,
        email: event.email,
        phone: event.phone,
        title: event.title,
        start: event.start,
        end: event.end
      });
      setShowEditModal(true);
    }
  };

  const handleUpdateEvent = async (updatedEvent) => {
    const token = localStorage.getItem('token');
    if (!token || !selectedEvent) return;
  
    try {
      const response = await fetch(`http://localhost:5001/api/admin/events/${selectedEvent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: updatedEvent.fullName,
          email: updatedEvent.email,
          phone: updatedEvent.phone,
          title: updatedEvent.title,
          start: updatedEvent.start,
          end: updatedEvent.end
        }),
      });
  
      if (!response.ok) {
        throw new Error('Failed to update event');
      }
  
      const updatedData = await response.json();
  
      // Update the local state
      setEvents((prevEvents) => {
        const newEvents = prevEvents.map((event) =>
          event.id === updatedData.id ? { ...event, ...updatedData } : event
        );
        console.log("After update:", newEvents);
        return newEvents;
      });
  
      setShowEditModal(false); // Close the modal after updating
    } catch (error) {
      console.error('Error updating event:', error);
    }
  };
  

  // ---- DELETE EVENT ----
  const handleDelete = async () => {
    const token = localStorage.getItem('token');
    if (!token || !selectedEvent) return;

    try {
      await fetch(`http://localhost:5001/api/admin/events/${selectedEvent.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      // Remove from local state
      setEvents((prev) => prev.filter((evt) => evt.id !== selectedEvent.id));
      setShowEditModal(false);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: 'auto' }}>
      <h2>Calendar (Admin)</h2>
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        events={events}
        dateClick={handleDateClick}
        eventClick={handleEventClick}
      />

      <CreateEventModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateEvent}   // The function above
        formData={formData}
        setFormData={setFormData}
      />

      <EditEventModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        formData={formData}
        setFormData={setFormData}
        onUpdate={handleUpdateEvent}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default Calendar;