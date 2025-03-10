import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './AuthPage.css';
import loadingGif from './gif/loading.gif';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001';

function LoginEmailPage() {
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // Generate OTP
      const response = await fetch(`${API_URL}/api/otp/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'auth' })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'OTP generation failed');
      }

      // Navigate to verify page with email
      navigate('/auth/verify', {
        state: {
          email,
          isLoginFlow: true
        }
      });

    } catch (error) {
      setErrorMsg(error.message || 'Failed to send OTP');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="auth-title">Login with Email</h2>
        <p className="auth-subtitle">
          Enter your email address linked with your booking with below to receive a one-time code.
        </p>

        {errorMsg && <div className="error-message">{errorMsg}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              placeholder="me@example.com"
            />
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <img src={loadingGif} alt="Loading" className="loading-icon" />
            ) : (
              'Send OTP'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginEmailPage;