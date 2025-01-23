import logo from './logo.svg';
import './App.css';
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
//import RegisterPage from './RegisterPage';
import VerifyPage from './VerifyPage';
import LoginPage from './LoginPage';
import Calendar from './Calendar';

function App() {
  return (
    <Router>
      <Routes>
        {/*<Route path="/auth/register" element={<RegisterPage />} />*/}
        <Route path="/auth/verify" element={<VerifyPage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        {/* Protect the calendar route by checking token in <Calendar /> */}
        <Route path="/" element={<Calendar />} />
      </Routes>
    </Router>
  );
}

export default App;
