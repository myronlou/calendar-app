import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import './AuthPage.css';
import loadingGif from './gif/loading.gif';

function VerifyPage() {
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flowType, setFlowType] = useState('registration');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const initializeFlow = () => {
      const urlEmail = searchParams.get('email');
      const urlToken = searchParams.get('token');

      // Handle direct email link access
      if (urlEmail && urlToken) {
        setEmail(urlEmail);
        navigate('/auth/verify', {
          replace: true,
          state: {
            email: urlEmail,
            managementToken: urlToken,
            isRegistration: true
          }
        });
        setFlowType('registration');
        return;
      }

      // Handle state from navigation
      const state = location.state || {};
      if (!state.email) {
        navigate('/');
        return;
      }

      setEmail(state.email);
      setFlowType(state.isLoginFlow ? 'login' : 'registration');
    };

    initializeFlow();
  }, [location.state, searchParams, navigate]);

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
            email,
            code,
            type: 'auth'
          })
        }
      );

      if (!verifyResponse.ok) {
        const errorData = await verifyResponse.json();
        throw new Error(errorData.error || 'OTP verification failed');
      }

      const { token: verificationToken } = await verifyResponse.json();

      // Handle different flows
      if (flowType === 'registration') {
        // Registration flow
        const regResponse = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/auth/register`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              password: location.state.password || '',
              otpVerificationToken: verificationToken,
              managementToken: location.state.managementToken
            })
          }
        );

        if (!regResponse.ok) {
          const errorData = await regResponse.json();
          throw new Error(errorData.error || 'Registration failed');
        }

        const { token: authToken, role } = await regResponse.json();
        localStorage.setItem('token', authToken);
        localStorage.setItem('userRole', role);
        navigate(role === 'admin' ? '/admin/calendar' : '/calendar');
      } else {
        // Login flow
        const loginResponse = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/auth/login`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              email,
              verificationToken
            })
          }
        );

        const loginData = await loginResponse.json();
        localStorage.setItem('token', loginData.token);
        localStorage.setItem('userRole', loginData.role);
        navigate(loginData.role === 'admin' ? '/admin/calendar' : '/calendar');
      }
    } catch (error) {
      setErrorMsg(error.message || 'Verification failed');
    } finally {
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
          body: JSON.stringify({ email, type: 'auth' })
        }
      );

      if (!response.ok) throw new Error('Failed to resend code');
      setErrorMsg('New code sent to ' + email);
    } catch (err) {
      setErrorMsg(err.message || 'Error resending code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const buttonClass = `primary-button ${isSubmitting ? 'loading-state' : ''}`;
  const flowMessage = flowType === 'registration' 
    ? 'complete registration' 
    : 'access your account';

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="auth-title">Verify Your Identity</h2>
        {errorMsg && <div className="error-message">{errorMsg}</div>}

        <form onSubmit={handleVerify}>
          <p className="auth-subtitle">
            A 6-digit code was sent to <strong>{email}</strong>.<br />
            Enter it below to {flowMessage}.
          </p>

          <div className="form-group">
            <label htmlFor="otp-code">Verification Code:</label>
            <input
              id="otp-code"
              type="text"
              value={code}
              onChange={(e) => {
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
            className={buttonClass}
            disabled={!isCodeComplete || isSubmitting}
          >
            {isSubmitting ? (
              <img src={loadingGif} alt="Loading" className="loading-icon" />
            ) : (
              `Verify and ${flowType === 'registration' ? 'Register' : 'Login'}`
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
            Resend Code
          </button>
        </p>
      </div>
    </div>
  );
}

export default VerifyPage;