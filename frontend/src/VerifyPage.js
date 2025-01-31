import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import './AuthPage.css';
import loadingGif from './gif/loading.gif';

function VerifyPage() {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!location.state?.email || !location.state?.managementToken) {
      navigate('/');
      return;
    }
    setEmail(location.state.email);
  }, [location.state, navigate]);

  const isCodeComplete = code.length === 6;

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      // Verify OTP first
      const verifyResponse = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/otp/verify`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            email: location.state.email,
            code,
            type: 'auth'
          })
        }
      );

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'OTP verification failed');
      }

      const { token: otpToken } = await verifyResponse.json();

      // Complete registration
      const regResponse = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: location.state.email,
            password: location.state.password,
            otpVerificationToken: otpToken,
            managementToken: location.state.managementToken
          })
        }
      );

      if (!regResponse.ok) {
        const errorData = await regResponse.json();
        throw new Error(errorData.error || 'Registration failed');
      }

      const { token: authToken, role } = await regResponse.json();
    
      // Store token and redirect
      localStorage.setItem('token', authToken);
      localStorage.setItem('userRole', role);
      
      // Redirect based on role
      navigate(role === 'admin' ? '/admin/calendar' : '/calendar');

    } catch (error) {
      setErrorMsg(error.message || 'Verification failed');
      setIsSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/otp/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: location.state.email, type: 'auth' })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to resend code');
      }

      // Show success message or quietly succeed
      setErrorMsg('New code sent to ' + location.state.email);
    } catch (err) {
      setErrorMsg(err.message || 'Error resending code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonClass = `primary-button ${isSubmitting ? 'loading-state' : ''}`;

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="auth-title">Verify Your Account</h2>
        {errorMsg && <div className="error-message">{errorMsg}</div>}

        <form onSubmit={handleVerify}>
          <p className="auth-subtitle">
            A 6-digit code was sent to <strong>{email}</strong>. Enter it below to complete registration.
          </p>

          <div className="form-group">
            <label htmlFor="otp-code">Verification Code:</label>
            <input
              id="otp-code"
              type="text"
              value={code}
              onChange={(e) => {
                // Only allow digits, up to 6
                const numericOnly = e.target.value.replace(/\D/g, '');
                setCode(numericOnly.slice(0, 6));
              }}
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="one-time-code"
              required
            />
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={!isCodeComplete || isSubmitting}
          >
            {isSubmitting ? (
              <img src={loadingGif} alt="Loading" className="loading-icon" />
            ) : (
              'Complete Registration'
            )}
          </button>
        </form>

        <p className="auth-redirect">
          Didn’t receive a code?{' '}
          <button
            type="button"
            className="text-button"
            onClick={handleResendCode}
            disabled={isSubmitting}
          >
            Resend
          </button>
        </p>
      </div>
    </div>
  );
}

export default VerifyPage;