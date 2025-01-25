// PublicCalendar.js
import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';

function PublicCalendar() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [event, setEvent] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const customerToken = searchParams.get('token');

  React.useEffect(() => {
    if (!customerToken) {
      navigate('/');
      return;
    }

    const fetchBooking = async () => {
      try {
        const response = await fetch(`http://localhost:5001/api/bookings/${customerToken}`);
        const data = await response.json();
        
        if (data.error || !data.booking) {
          navigate('/');
          return;
        }
        
        setEvent({
          title: data.booking.title,
          start: data.booking.start,
          end: data.booking.end,
          extendedProps: {
            status: data.booking.status,
            bookingId: data.booking.id
          }
        });
      } catch (error) {
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    fetchBooking();
  }, [customerToken, navigate]);

  if (loading) {
    return <div>Loading your booking details...</div>;
  }

  return (
    <div style={{ maxWidth: '900px', margin: 'auto', padding: '20px' }}>
      <h2>Your Booking Details</h2>
      {event ? (
        <>
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin]}
            initialView="timeGridDay"
            initialDate={event.start}
            events={[event]}
            headerToolbar={{
              start: '',
              center: 'title',
              end: ''
            }}
            height="auto"
          />
          <div style={{ marginTop: '20px' }}>
            <h3>Booking Information:</h3>
            <p>Title: {event.title}</p>
            <p>Time: {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}</p>
            <p>Status: {event.extendedProps.status}</p>
          </div>
        </>
      ) : (
        <div>No booking found</div>
      )}
    </div>
  );
}

export default PublicCalendar;