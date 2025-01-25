// client/src/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErrorMsg(''); // clear previous errors

    try {
      const res = await fetch('http://localhost:5001/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();

      if (res.ok && data.token) {
        // Store token
        localStorage.setItem('token', data.token);
        // Navigate to home (calendar)
        navigate('/admin/calendar');
      } else {
        // Show error message on screen
        setErrorMsg(data.error || 'Login failed');
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('Network or server error');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2>Login</h2>

      {errorMsg && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleLogin}>
        <div>
          <label>Email: </label>
          <input 
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required 
          />
        </div>

        <div>
          <label>Password: </label>
          <input 
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required 
          />
        </div>

        <button type="submit">Login</button>
      </form>
    </div>
  );
}

export default LoginPage;

