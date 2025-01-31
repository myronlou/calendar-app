import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import './AuthPage.css';
import loadingGif from './gif/loading.gif';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isValidating, setIsValidating] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const passwordRequirements = useMemo(() => [
    {
      label: 'At least 8 characters long',
      test: (val) => val.length >= 8,
    },
    {
      label: 'Contains an uppercase letter',
      test: (val) => /[A-Z]/.test(val),
    },
    {
      label: 'Contains a lowercase letter',
      test: (val) => /[a-z]/.test(val),
    },
    {
      label: 'Contains a number',
      test: (val) => /\d/.test(val),
    },
  ], []);

  const allRequirementsMet = passwordRequirements.every(req => req.test(password));
  const passwordsMatch = password === confirmPassword;

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
    setIsSubmitting(true);

    if (!allRequirementsMet) {
      setErrorMsg('Password does not meet the requirements.');
      setIsSubmitting(false);
      return;
    }
    if (!passwordsMatch) {
      setErrorMsg('Passwords do not match.');
      setIsSubmitting(false);
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
      setIsSubmitting(false);
    }
  };

  if (isValidating) {
    // Show your existing "validating" screen
    return (
      <div className="loading-screen">
        <img src={loadingGif} alt="Loading" className="loading-icon" />
        Validating booking details...
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-box">
        <h2 className="auth-title">Create an account</h2>
        <p className="auth-subtitle">
          Enter your password below to finish creating your account.
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
              placeholder="Create a password"
            />
            {/* Password Requirements List */}
            <ul className="password-requirements">
              {passwordRequirements.map(({ label, test }) => {
                const requirementMet = test(password);
                return (
                  <li
                    key={label}
                    className={requirementMet ? "met-requirement" : "unmet-requirement"}
                  >
                    {/* Show a check or bullet */}
                    {requirementMet ? '✔' : '•'} {label}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="form-group">
            <label>Confirm Password:</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              placeholder="Confirm your password"
            />
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="confirm-alert">Passwords do not match.</p>
            )}
          </div>

          <button
            type="submit"
            className="primary-button"
            disabled={!allRequirementsMet || !passwordsMatch || isSubmitting}
          >
            {isSubmitting 
              ? <img src={loadingGif} alt="Loading" className="loading-icon" />
              : 'Continue to Verification'
            }
          </button>
        </form>

        <p className="auth-redirect">
          Already have an account?{" "}
          <a href={`/auth/login?email=${encodeURIComponent(email)}`}>
            Login here
          </a>
        </p>
      </div>
    </div>
  );
}

export default RegisterPage;