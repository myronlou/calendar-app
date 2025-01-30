import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Pre-fill email from query params
  useEffect(() => {
    const urlEmail = searchParams.get('email');
    if (urlEmail) setEmail(decodeURIComponent(urlEmail));
  }, [searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:5001/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const data = await res.json();
      
      if (res.ok && data.token) {
        localStorage.setItem('token', data.token);
        navigate('/calendar'); // Redirect to management page
      } else {
        setErrorMsg(data.error || 'Login failed');
      }
    } catch (error) {
      setErrorMsg('Network or server error');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2>Login to Manage Bookings</h2>
      {errorMsg && <div className="error-message">{errorMsg}</div>}

      <form onSubmit={handleLogin}>
        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            readOnly={!!searchParams.get('email')}
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

        <button type="submit" className="primary-button">
          Login
        </button>
      </form>

      <p className="auth-redirect">
        Don't have an account?{' '}
        <a href={`/auth/register?email=${encodeURIComponent(email)}`}>
          Register with this email
        </a>
      </p>
    </div>
  );
}

export default LoginPage;