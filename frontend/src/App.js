import './App.css';
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Admin Components
import AdminLayout from './AdminLayout';
import Availability from './Availability';
import BookingTypes from './BookingTypes';
import Calendar from './Calendar';

// Public Components
import HomePage from './HomePage';
import LoginPage from './LoginPage';
import VerifyPage from './VerifyPage';
import PublicCalendar from './PublicCalendar';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/auth/login" replace />;
};

const TokenValidator = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      localStorage.setItem('eventToken', token);
      navigate('/calendar', { replace: true });
    } else {
      navigate('/', { replace: true });
    }
  }, [token, navigate]);

  return <div>Redirecting to your bookings...</div>;
};

function App() {
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('eventToken');
      if (!token) return;

      try {
        const res = await fetch(`/api/events/validate-token?token=${token}`);
        if (!res.ok) localStorage.removeItem('eventToken');
      } catch (error) {
        localStorage.removeItem('eventToken');
      }
    };

    validateToken();
    const interval = setInterval(validateToken, 5 * 60 * 1000); // Validate every 5 minutes
    return () => clearInterval(interval);
  }, []);

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Router>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/verify" element={<VerifyPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/calendar" element={<PublicCalendar />} />
          <Route path="/token" element={<TokenValidator />} />

          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="calendar" replace />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="availability" element={<Availability />} />
            <Route path="booking-types" element={<BookingTypes />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </LocalizationProvider>
  );
}

export default App;