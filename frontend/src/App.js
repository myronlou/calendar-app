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
    const checkEmail = async () => {
      try {
        const res = await fetch(`/api/events/check-email?token=${token}`);
        const { hasAccount, email } = await res.json();
        
        if (hasAccount) {
          navigate(`/auth/login?email=${encodeURIComponent(email)}`);
        } else {
          navigate(`/auth/register?email=${encodeURIComponent(email)}`);
        }
      } catch (error) {
        navigate('/');
      }
    };
  
    if (token) checkEmail();
    else navigate('/');
  }, [token, navigate]);

  return <div>Redirecting to your bookings...</div>;
};

function App() {
  useEffect(() => {
    const validateToken = async () => {
      const token = localStorage.getItem('token');
      if (!token) return;
  
      try {
        const res = await fetch('/api/events/validate-token', {
          method: 'GET',
          headers: { 
            'Authorization': `Bearer ${token}` 
          }
        });
        if (!res.ok) localStorage.removeItem('token');
      } catch (error) {
        localStorage.removeItem('token');
      }
    };
  
    validateToken();
    const interval = setInterval(validateToken, 5 * 60 * 1000);
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