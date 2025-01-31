import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    const validateAccess = async () => {
      setIsValidating(true);
      const urlToken = searchParams.get('token');
      const urlEmail = searchParams.get('email');

      // Immediate parameter check
      if (!urlToken || !urlEmail) {
        navigate('/');
        return;
      }

      try {
        // Server-side validation
        const response = await fetch(
          `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/events/check-email?token=${urlToken}`
        );
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Invalid booking reference');
        }

        const { email: validatedEmail, hasAccount } = await response.json();
        
        // Email consistency check
        if (validatedEmail.toLowerCase() !== urlEmail.toLowerCase()) {
          throw new Error('Email mismatch detected');
        }

        // Account existence check
        if (hasAccount) {
          navigate(`/auth/login?email=${encodeURIComponent(validatedEmail)}`);
          return;
        }

        setEmail(validatedEmail);
        setIsValidating(false);

      } catch (error) {
        navigate('/', { 
          state: { 
            error: error.message || 'Invalid registration access' 
          } 
        });
      }
    };

    validateAccess();
  }, [searchParams, navigate]);

  const handleRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    try {
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:5001'}/api/otp/generate`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, type: 'auth' })
        }
      );

      if (!response.ok) throw new Error('OTP generation failed');

      navigate('/auth/verify', {
        state: {
          email,
          password,
          managementToken: searchParams.get('token'),
          isRegistration: true
        }
      });

    } catch (error) {
      setErrorMsg(error.message || 'Failed to start registration process');
    }
  };

  if (isValidating) {
    return <div className="loading-screen">Validating booking details...</div>;
  }

  return (
    <div className="auth-container">
      <h2>Complete Registration</h2>
      <p className="auth-notice">
        You're registering with the email used for your booking.
      </p>

      {errorMsg && <div className="error-message">{errorMsg}</div>}

      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            readOnly
            className="disabled-input"
          />
        </div>

        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="8"
          />
        </div>

        <div className="form-group">
          <label>Confirm Password:</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength="8"
          />
        </div>

        <button type="submit" className="primary-button">
          Continue to Verification
        </button>
      </form>

      <p className="auth-redirect">
        Already have an account?{' '}
        <a href={`/auth/login?email=${encodeURIComponent(email)}`}>
          Login here
        </a>
      </p>
    </div>
  );
}

export default RegisterPage;