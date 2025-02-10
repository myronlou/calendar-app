import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { jwtDecode } from 'jwt-decode';
import EditEventModal from './EditEventModal';
import CreateEventModal from './CreateEventModal';
import './PublicCalendar.css';

function PublicCalendar() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    start: '',
    bookingTypeId: ''
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  let currentUserEmail = localStorage.getItem('userEmail') || '';
  const token = localStorage.getItem('token');
  if (!currentUserEmail && token) {
    try {
      const decoded = jwtDecode(token);
      currentUserEmail = decoded.email || '';
      // (Optional) You might want to save this in localStorage for future use.
      localStorage.setItem('userEmail', currentUserEmail);
    } catch (err) {
      console.error('Error decoding token:', err);
    }
  }

  useEffect(() => {
    const fetchData = async () => {
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
        const formattedEvents = eventsData.map(event => ({
          ...event,
          start: new Date(event.start),
          end: new Date(event.end)
        }));
        setEvents(formattedEvents);
        setLoading(false);
      } catch (error) {
        localStorage.removeItem('token');
        navigate('/');
      }
    };
    fetchData();
  }, [navigate, API_URL, token]);

  // Handler for creating a new event
  const handleCreate = async () => {
    try {
      const response = await fetch(`${API_URL}/api/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          eventData: createFormData,
          token: token
        })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        // Option 1: Append the new event to the list
        const newEvent = {
          id: data.event.id,
          bookingTypeId: data.event.bookingTypeId,
          start: new Date(data.event.start),
          end: new Date(data.event.end)
          // Other details like fullName, phone can be added if needed
        };
        setEvents([...events, newEvent]);
        return data;
      } else {
        console.error('Creation error:', data);
        return { error: data.error };
      }
    } catch (error) {
      console.error('Error creating event:', error);
      return { error: error.message };
    }
  };

  // Handler for when an event is clicked to open the edit modal.
  const handleEventClick = (clickInfo) => {
    const clickedEvent = clickInfo.event;
    // Prepare form data for editing. We use extendedProps for custom fields.
    setEditFormData({
      id: clickedEvent.id,
      bookingTypeId: clickedEvent.extendedProps.bookingTypeId,
      fullName: clickedEvent.extendedProps.fullName,
      phone: clickedEvent.extendedProps.phone,
      start: clickedEvent.start.toISOString(),
      email: currentUserEmail // Email is not editable.
    });
    setShowEditModal(true);
  };

  // Handler for updating an event
  const handleUpdate = async (updatedFormData) => {
    try {
      const response = await fetch(`${API_URL}/api/events/${updatedFormData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: updatedFormData.fullName,
          phone: updatedFormData.phone,
          bookingTypeId: updatedFormData.bookingTypeId,
          start: updatedFormData.start
          // The backend will compute the end time based on the booking type's duration.
        })
      });
      if (response.ok) {
        const updatedEvent = await response.json();
        setEvents(events.map(e => e.id === updatedEvent.id ? {
          ...updatedEvent,
          start: new Date(updatedEvent.start),
          end: new Date(updatedEvent.end)
        } : e));
        return updatedEvent;
      } else {
        const errorData = await response.json();
        console.error('Update failed:', errorData);
        return null;
      }
    } catch (error) {
      console.error('Error updating event:', error);
      return null;
    }
  };

  // Handler for deleting an event
  const handleDelete = async () => {
    try {
      const response = await fetch(`${API_URL}/api/events/${editFormData.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        setEvents(events.filter(e => e.id !== editFormData.id));
        return true;
      } else {
        const errorData = await response.json();
        console.error('Delete failed:', errorData);
        return false;
      }
    } catch (error) {
      console.error('Error deleting event:', error);
      return false;
    }
  };

  // Callback for clicking on a date cell (for single clicks)
  const handleDateClick = (clickInfo) => {
    setCreateFormData({
      fullName: '',
      email: currentUserEmail,
      phone: '',
      start: clickInfo.date.toISOString(),
      bookingTypeId: ''
    });
    setShowCreateModal(true);
  };

  // Handler for when a date/time slot is selected to create a new booking.
  const handleDateSelect = (selectInfo) => {
    // Update the create form data with the selected start time.
    setCreateFormData({
      ...createFormData,
      start: selectInfo.start.toISOString()
    });
    setShowCreateModal(true);
  };

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
              className="new-booking-button"
              onClick={() => {
                setCreateFormData({
                  fullName: '',
                  email: currentUserEmail,
                  phone: '',
                  start: '',
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
              }}>
                Log out
            </button>
        </div>
      </header>

      {/* MAIN CALENDAR CONTENT */}
      <div className="public-calendar-content">
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          selectable={true}
          dateClick={handleDateClick}
          select={handleDateSelect}
          events={events.map(event => ({
            id: event.id,
            title: event.bookingType && event.bookingType.name ? event.bookingType.name : 'Booking',
            start: event.start,
            end: event.end,
            extendedProps: {
              fullName: event.fullName,
              phone: event.phone,
              bookingTypeId: event.bookingTypeId
            }
          }))}
          headerToolbar={{
            left: 'title',
            center: 'dayGridMonth,timeGridWeek,dayGridDay',
            right: 'prev today next'
          }}
          allDaySlot={false}
          eventClick={handleEventClick}
        />
      </div>

      <CreateEventModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreate}
        formData={createFormData}
        setFormData={setCreateFormData}
        currentUserEmail={currentUserEmail}
      />

      <EditEventModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        formData={editFormData}
        setFormData={setEditFormData}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
      />
    </div>
  );
}

export default PublicCalendar;
