import './App.css';
import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Admin Components
import AdminLayout from './AdminLayout';
import Availability from './Availability';
import BookingTypes from './BookingTypes';
import Calendar from './Calendar';
import UpcomingBookings from './UpcomingBookings';
// import PaymentSettings from './PaymentSettings'; coming soon

// Public Components
import HomePage from './HomePage';
import LoginPage from './LoginPage';
import RegisterPage from './RegisterPage';
import VerifyPage from './VerifyPage';
import PublicCalendar from './PublicCalendar';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/auth/login" replace />;
};

const AuthGuard = ({ children }) => {
  const token = localStorage.getItem('token');
  const navigate = useNavigate();
  const [isTokenValid, setIsTokenValid] = useState(null); // null means "checking"

  useEffect(() => {
    if (!token) {
      setIsTokenValid(false);
      return;
    }

    const validate = async () => {
      try {
        const res = await fetch(`${API_URL}/api/events/validate-token`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          // Optionally, update the userRole if different than stored one.
          localStorage.setItem('userRole', data.role);
          setIsTokenValid(true);
          // Redirect based on role
          if (data.role === 'admin') {
            navigate('/admin/calendar');
          } else {
            navigate('/calendar');
          }
        } else {
          // Invalid token: remove it and allow the login page to render.
          localStorage.removeItem('token');
          localStorage.removeItem('userRole');
          setIsTokenValid(false);
        }
      } catch (error) {
        // On any error, treat token as invalid.
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
        setIsTokenValid(false);
      }
    };

    validate();
  }, [token, navigate]);

  // While we're validating, show a loading message.
  if (token && isTokenValid === null) {
    return <div>Loading...</div>;
  }

  // If there is no token or the token is invalid, render the children (login, verify, etc.)
  return !token || !isTokenValid ? children : null;
};

const RegisterGuard = ({ children }) => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    
    if (!token || !email) {
      navigate('/');
    }
  }, [searchParams, navigate]);

  return children;
};

const CustomerRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('userRole');
  const navigate = useNavigate();

  useEffect(() => {
    if (!token || role !== 'customer') {
      navigate('/');
    }
  }, [token, role, navigate]);

  return token && role === 'customer' ? children : null;
};

const TokenValidator = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');

  useEffect(() => {
    const validateToken = async () => {
      try {
        const response = await fetch(
          `${API_URL}/api/events/check-email?token=${token}`
        );

        if (!response.ok) {
          const errorData = await response.json();
          const encodedEmail = encodeURIComponent(errorData.email || '');
          
          if (errorData.error === 'Booking already claimed') {
            navigate(`/auth/login?email=${encodedEmail}&error=claimed`);
          } else {
            navigate('/', { state: { error: errorData.error } });
          }
          return;
        }

        const { hasAccount, email } = await response.json();
        const encodedEmail = encodeURIComponent(email);

        hasAccount 
          ? navigate(`/auth/login?email=${encodedEmail}`)
          : navigate(`/auth/register?email=${encodedEmail}&token=${token}`);

      } catch (error) {
        navigate('/', { state: { error: 'Invalid booking link' } });
      }
    };

    if (token) validateToken();
    else navigate('/');
  }, [token, navigate]);

  return <div className="loading-screen">Validating booking details...</div>;
};

function App() {
  useEffect(() => {
  const validateToken = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;

    try {
      const res = await fetch(`${API_URL}/api/events/validate-token`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (res.ok) {
        const { role } = await res.json();
        localStorage.setItem('userRole', role);
      } else {
        localStorage.removeItem('token');
        localStorage.removeItem('userRole');
      }
    } catch (error) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
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
          <Route path="/calendar" element={<CustomerRoute><PublicCalendar /></CustomerRoute>} />
          <Route path="/token" element={<TokenValidator />} />

          <Route path="/auth/verify" element={<AuthGuard><VerifyPage /></AuthGuard>} />
          <Route path="/auth/login" element={<AuthGuard><LoginPage /></AuthGuard>} />
          <Route path="/auth/register" element={<AuthGuard><RegisterGuard><RegisterPage /></RegisterGuard></AuthGuard>} />

          <Route path="/admin" element={<ProtectedRoute><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="calendar" replace />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="availability" element={<Availability />} />
            <Route path="booking-types" element={<BookingTypes />} />
            <Route path="upcoming-bookings" element={<UpcomingBookings />} />
            {/* Payment Modal <Route path="payment-settings" element={<PaymentSettings />} /> */}
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </LocalizationProvider>
  );
}

export default App;