import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function VerifyPage() {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!location.state?.email || !location.state?.managementToken) {
      navigate('/');
      return;
    }
    setEmail(location.state.email);
  }, [location.state, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg('');

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

      const { token: authToken } = await regResponse.json();
      localStorage.setItem('token', authToken);
      navigate('/calendar');

    } catch (error) {
      setErrorMsg(error.message || 'Verification failed');
    }
  };

  return (
    <div className="auth-container">
      <h2>Complete Registration</h2>
      {errorMsg && <div className="error-message">{errorMsg}</div>}

      <form onSubmit={handleVerify}>
        <p className="auth-notice">
          Verification code sent to {email}
        </p>

        <div className="form-group">
          <label>Verification Code:</label>
          <input 
            type="text"
            value={code}
            onChange={e => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete="one-time-code"
            required
          />
        </div>

        <button type="submit" className="primary-button">
          Complete Registration
        </button>
      </form>

      <p className="auth-redirect">
        Didn't receive a code?{' '}
        <button 
          className="text-button"
          onClick={() => navigate('/auth/register')}
        >
          Resend code
        </button>
      </p>
    </div>
  );
}

export default VerifyPage;