import './App.css';
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';

// Admin Components
import AdminLayout from './AdminLayout';
import Availability from './Availability';
import BookingTypes from './BookingTypes';
import Calendar from './Calendar'; // Admin calendar

// Public Components
import HomePage from './HomePage';
import LoginPage from './LoginPage';
import VerifyPage from './VerifyPage';
import PublicCalendar from './PublicCalendar'; // New component

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/auth/login" replace />;
};

const PublicCalendarRoute = () => {
  const [searchParams] = useSearchParams();
  const eventToken = searchParams.get('token');

  if (!eventToken) {
    return <Navigate to="/" replace />;
  }

  return <PublicCalendar eventToken={eventToken} />;
};

function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Router>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/auth/verify" element={<VerifyPage />} />
          <Route path="/auth/login" element={<LoginPage />} />
          <Route path="/calendar" element={<PublicCalendarRoute />} />

          {/* Protected admin routes */}
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }>
            <Route index element={<Navigate to="calendar" replace />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="availability" element={<Availability />} />
            <Route path="booking-types" element={<BookingTypes />} />
          </Route>

          {/* Fallback redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </LocalizationProvider>
  );
}

export default App;