import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CustomerBookingModal from './CustomerBookingModal';

function HomePage() {
  const navigate = useNavigate();

  // Track if the booking modal is open
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const goToCalendar = () => {
    navigate('/auth/login');
  };

  // Open the modal
  const openBookingModal = () => {
    setIsBookingModalOpen(true);
  };

  // Close the modal
  const closeBookingModal = () => {
    setIsBookingModalOpen(false);
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <h1>Welcome to Calendar-app!</h1>
      <p>This is our public info page. Learn more about our awesome services here!</p>

      <button onClick={goToCalendar}>
        Go to Calendar
      </button>

      {/* Button to open modal */}
      <button onClick={openBookingModal} style={{ marginLeft: '1rem' }}>
        Book an Appointment
      </button>

      {/* Our new Customer Booking Modal */}
      <CustomerBookingModal
        isOpen={isBookingModalOpen}
        onClose={closeBookingModal}
      />
    </div>
  );
}

export default HomePage;
