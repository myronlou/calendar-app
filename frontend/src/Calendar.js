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

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/auth/login');
      return;
    }

    // Fetch events from the server
    fetch('http://localhost:5001/api/admin/events', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          // Convert to FullCalendar format if needed
          setEvents(
            data.map((evt) => ({
              id: evt.id,
              title: evt.title,
              start: evt.start,
              end: evt.end,
              fullName: evt.fullName,
              email: evt.email,
              phone: evt.phone,
            }))
          );
        } else if (data.error) {
          alert(data.error);
          navigate('/auth/login');
        }
      })
      .catch((err) => {
        console.error(err);
        navigate('/auth/login');
      });
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
  // (unchanged for now, but you'll do a PUT if you want to update on the server)
  const handleEventClick = (info) => {
    const event = events.find((evt) => evt.id === parseInt(info.event.id));
    if (event) {
      setSelectedEvent(event);
      setFormData({
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
        onDelete={handleDelete}
      />
    </div>
  );
}

export default Calendar;