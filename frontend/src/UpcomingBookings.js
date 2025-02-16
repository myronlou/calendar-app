import React, { useEffect, useState } from 'react';
import { FaPlus } from 'react-icons/fa';
import CreateEventModal from './CreateEventModal';
import EditEventModal from './EditEventModal';
import './UpcomingBookings.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function UpcomingBookings() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modals visibility
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  // Form data for create/edit
  const [formData, setFormData] = useState({});

  // -----------------------------
  // Fetch & Filter Upcoming Events
  // -----------------------------
  const fetchEvents = async (abortSignal) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/events`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        signal: abortSignal,
      });

      if (!res.ok) {
        throw new Error('Failed to fetch events');
      }
      const data = await res.json();

      // Filter for upcoming (start >= now)
      const now = new Date();
      const upcoming = data.filter((evt) => new Date(evt.start) >= now);

      // Sort ascending by start date
      upcoming.sort((a, b) => new Date(a.start) - new Date(b.start));
      setEvents(upcoming);
      setError(null);
      setLoading(false);
    } catch (err) {
      // Ignore AbortError (happens if component unmounts)
      if (err.name !== 'AbortError') {
        setError(err.message);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    const abortController = new AbortController();

    // Initial fetch
    fetchEvents(abortController.signal);

    // Poll every 1 second
    const intervalId = setInterval(() => {
      fetchEvents(abortController.signal);
    }, 200);

    // Cleanup when unmounting
    return () => {
      abortController.abort();
      clearInterval(intervalId);
    };
  }, []);

  // -----------------------------
  // Create Event
  // -----------------------------
  const handleCreateEvent = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/events`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          start: formData.start,
          bookingTypeId: formData.bookingTypeId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { error: data.error || 'Failed to create event' };
      }

      // If new event is upcoming, add it to the list
      const newEventStart = new Date(data.event.start);
      if (newEventStart >= new Date()) {
        setEvents((prev) => {
          const updated = [...prev, data.event];
          // Re-sort by start
          updated.sort((a, b) => new Date(a.start) - new Date(b.start));
          return updated;
        });
      }
      return data;
    } catch (error) {
      console.error('Error creating event:', error);
      return { error: 'Request failed' };
    }
  };

  // -----------------------------
  // Update Event
  // -----------------------------
  const handleUpdateEvent = async () => {
    try {
      const token = localStorage.getItem('token');
      const eventId = formData.id;
      const res = await fetch(`${API_URL}/api/admin/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          start: formData.start,
          bookingTypeId: formData.bookingTypeId,
        }),
      });
      const data = await res.json();

      if (!res.ok) {
        return { error: data.error || 'Failed to update event' };
      }

      // If updated event is still upcoming, update local state
      const updatedStart = new Date(data.start);
      setEvents((prev) => {
        // Remove old version
        let filtered = prev.filter((evt) => evt.id !== eventId);
        // Re-insert if still upcoming
        if (updatedStart >= new Date()) {
          filtered.push(data);
        }
        // Re-sort
        filtered.sort((a, b) => new Date(a.start) - new Date(b.start));
        return filtered;
      });

      return data;
    } catch (error) {
      console.error('Error updating event:', error);
      return { error: 'Request failed' };
    }
  };

  // -----------------------------
  // Delete Event
  // -----------------------------
  const handleDeleteEvent = async (id) => {
    const confirmed = window.confirm('Are you sure you want to delete this event?');
    if (!confirmed) return;

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/admin/events/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error('Failed to delete event');
      }
      // Remove from local state
      setEvents((prev) => prev.filter((evt) => evt.id !== id));
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('Could not delete the event. Please try again.');
    }
  };

  // -----------------------------
  // Modal Handlers
  // -----------------------------
  const openCreateModal = () => {
    setFormData({});
    setShowCreateModal(true);
  };

  const openEditModal = (event) => {
    setFormData({
      id: event.id,
      fullName: event.fullName,
      email: event.email,
      phone: event.phone,
      start: event.start,
      bookingTypeId: event.bookingTypeId,
    });
    setShowEditModal(true);
  };

  // -----------------------------
  // Render
  // -----------------------------
  if (loading) {
    return <div className="upcoming-bookings-admin-container">Loading events...</div>;
  }
  if (error) {
    return (
      <div className="upcoming-bookings-admin-container">
        <div className="error-msg">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="upcoming-bookings-admin-container">
      {/* Header Section */}
      <div className="header-section">
        <div>
          <h2>Upcoming Bookings</h2>
          <p>View and manage future bookings.</p>
        </div>
        <button className="new-btn" onClick={openCreateModal}>
          <FaPlus /> New
        </button>
      </div>

      {/* Upcoming Bookings List */}
      <div className="upcoming-bookings-list">
        {events.length === 0 && (
          <div className="empty-list">No upcoming bookings found.</div>
        )}
        {events.map((event) => (
          <div key={event.id} className="upcoming-booking-item">
            {/* Color Dot on the left */}
            <div
              className="color-dot"
              style={{
                backgroundColor: event.bookingTypeColor || 'transparent',
                border: event.bookingTypeColor ? 'none' : '1px solid #ccc',
              }}
            />
            {/* Middle Info */}
            <div className="booking-info">
              <div className="booking-name">
                {event.title || 'Untitled'}
                {/* You could show a "duration" or something if you like, e.g.:
                    <span className="booking-meta"> / 60m</span>
                */}
              </div>
              <div className="booking-description">
                <strong>{event.fullName}</strong>
                <br />
                {new Date(event.start).toLocaleString()} —{' '}
                {new Date(event.end).toLocaleString()}
              </div>
            </div>
            {/* Actions */}
            <div className="actions">
              <button
                className="edit-btn"
                onClick={() => openEditModal(event)}
                title="Edit"
              >
                Edit
              </button>
              <button
                className="delete-btn"
                onClick={() => handleDeleteEvent(event.id)}
                title="Delete"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Modal */}
      <CreateEventModal
        show={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateEvent}
        formData={formData}
        setFormData={setFormData}
        currentUserEmail=""
        isAdmin={true}
      />

      {/* Edit Modal */}
      <EditEventModal
        show={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdate={handleUpdateEvent}
        onDelete={() => handleDeleteEvent(formData.id)}
        formData={formData}
        setFormData={setFormData}
        isAdmin={true}
        currentUserEmail=""
      />
    </div>
  );
}

export default UpcomingBookings;
