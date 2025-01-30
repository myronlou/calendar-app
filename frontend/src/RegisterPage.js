import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Pre-fill and lock email from query params
  useEffect(() => {
    const urlEmail = searchParams.get('email');
    if (urlEmail) setEmail(decodeURIComponent(urlEmail));
  }, [searchParams]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    try {
      const response = await fetch('http://localhost:5001/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          otp
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        localStorage.setItem('token', data.token);
        navigate('/calendar'); // Redirect to management page
      } else {
        setErrorMsg(data.error || 'Registration failed');
      }
    } catch (error) {
      setErrorMsg('Network or server error');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2>Complete Registration</h2>
      <p className="registration-notice">
        You're registering with the email used for your booking.
        Check your email for the verification code.
      </p>

      {errorMsg && <div className="error-message">{errorMsg}</div>}

      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            readOnly
          />
        </div>

        <div className="form-group">
          <label>Verification Code:</label>
          <input
            type="text"
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            placeholder="Enter OTP from email"
            required
          />
        </div>

        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Confirm Password:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className="primary-button">
          Complete Registration
        </button>
      </form>

      <p className="auth-redirect">
        Already have an account?{' '}
        <a href={`/auth/login?email=${encodeURIComponent(email)}`}>Login here</a>
      </p>
    </div>
  );
}

export default RegisterPage;