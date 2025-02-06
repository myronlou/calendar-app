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
    <>
      <style>{`
        .homepage {
          display: flex;
          align-items: center;
          justify-content: center;
          min-height: 100vh;
          background: linear-gradient(135deg, #f5f7fa, #c3cfe2);
          padding: 2rem;
        }

        .hero {
          background: #ffffff;
          border-radius: 8px;
          padding: 3rem;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          text-align: center;
          max-width: 600px;
          width: 100%;
        }

        .hero h1 {
          font-size: 2.5rem;
          margin-bottom: 1rem;
          color: #333;
        }

        .hero p {
          font-size: 1.2rem;
          margin-bottom: 2rem;
          color: #666;
        }

        .button-group {
          display: flex;
          justify-content: center;
          gap: 1rem;
        }

        .btn {
          padding: 0.75rem 1.5rem;
          font-size: 1rem;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background 0.3s ease;
        }

        .btn.primary {
          background: #007bff;
          color: #fff;
        }

        .btn.primary:hover {
          background: #0069d9;
        }

        .btn.secondary {
          background: #28a745;
          color: #fff;
        }

        .btn.secondary:hover {
          background: #218838;
        }
      `}</style>
      <div className="homepage">
        <div className="hero">
          <h1>Welcome to Booking-app!</h1>
          <p>Allow to book your appointments and manage them seamlessly.</p>
          <div className="button-group">
            <button className="btn primary" onClick={goToCalendar}>
              Go to Calendar
            </button>
            <button className="btn secondary" onClick={openBookingModal}>
              Book an Appointment
            </button>
          </div>
        </div>
        <CustomerBookingModal isOpen={isBookingModalOpen} onClose={closeBookingModal} />
      </div>
    </>
  );
}

export default HomePage;
