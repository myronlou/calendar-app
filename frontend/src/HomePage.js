import React from 'react';
import { useNavigate } from 'react-router-dom';

function HomePage() {
  const navigate = useNavigate();

  const goToCalendar = () => {
    // If the user is not logged in, it will redirect to /auth/login if your Calendar checks for token
    navigate('/calendar');
  };

  return (
    <div style={{ textAlign: 'center', marginTop: '2rem' }}>
      <h1>Welcome to Rideawave!</h1>
      <p>
        This is our public info page. Learn more about our awesome services here!
      </p>

      {/* Button to go to /calendar */}
      <button onClick={goToCalendar}>
        Go to Calendar (Admin)
      </button>
    </div>
  );
}

export default HomePage;

