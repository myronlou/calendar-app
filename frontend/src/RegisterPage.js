// client/src/RegisterPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function RegisterPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  // Email regex validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  const handleEmailChange = (e) => {
    const inputEmail = e.target.value;
    setEmail(inputEmail);

    if (inputEmail && !emailRegex.test(inputEmail)) {
      setEmailError("Invalid email format");
    } else {
      setEmailError("");
    }
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
  };

  const handleConfirmPasswordChange = (e) => {
    setConfirmPassword(e.target.value);
    
    if (e.target.value !== password) {
      setPasswordError("Passwords do not match");
    } else {
      setPasswordError("");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!emailRegex.test(email)) {
      setEmailError("Invalid email format");
      return;
    }

    if (password !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ firstName, lastName, email, password })
      });
      const data = await res.json();

      if (res.ok) {
        navigate(`/auth/verify?email=${encodeURIComponent(email)}`);
      } else {
        setErrorMsg(data.error || 'Registration failed');
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('Network or server error');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2>Register</h2>
      {errorMsg && <div style={{ color: 'red', marginBottom: '1rem' }}>{errorMsg}</div>}
      
      <form onSubmit={handleRegister}>
        <div>
          <label>First Name: </label>
          <input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} required />
        </div>

        <div>
          <label>Last Name: </label>
          <input type="text" value={lastName} onChange={e => setLastName(e.target.value)} required />
        </div>

        <div>
          <label>Email: </label>
          <input type="email" value={email} onChange={handleEmailChange} required style={{ borderColor: emailError ? 'red' : '' }} />
          {emailError && <p style={{ color: 'red' }}>{emailError}</p>}
        </div>

        <div>
          <label>Password: </label>
          <input type="password" value={password} onChange={handlePasswordChange} required />
        </div>

        <div>
          <label>Confirm Password: </label>
          <input type="password" value={confirmPassword} onChange={handleConfirmPasswordChange} required style={{ borderColor: passwordError ? 'red' : '' }} />
          {passwordError && <p style={{ color: 'red' }}>{passwordError}</p>}
        </div>

        <button type="submit" disabled={emailError || passwordError}>Register</button>
      </form>

      <div style={{ marginTop: '1rem' }}>
        <small>Already have an account? <Link to="/auth/login">Login here</Link></small>
      </div>
    </div>
  );
}

export default RegisterPage;
