// client/src/VerifyPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

function VerifyPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // parse query param "email"
    const params = new URLSearchParams(location.search);
    const userEmail = params.get('email');

    if (userEmail) {
      setEmail(userEmail);
    }
  }, [location.search]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    try {
      const res = await fetch('http://localhost:5000/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();

      if (res.ok) {
        // Verification succeeded
        // maybe show success or redirect to login
        navigate('/auth/login');
      } else {
        setErrorMsg(data.error || 'Verification failed');
      }
    } catch (error) {
      console.error(error);
      setErrorMsg('Network or server error');
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '0 auto' }}>
      <h2>Verify Email</h2>

      {errorMsg && (
        <div style={{ color: 'red', marginBottom: '1rem' }}>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleVerify}>
        <div>
          <label>Email: </label>
          <input 
            type="email"
            value={email}
            readOnly // so the user doesn't need to retype it
          />
        </div>

        <div>
          <label>Verification Code (6 digits): </label>
          <input 
            type="text"
            value={code}
            onChange={e => setCode(e.target.value)}
            maxLength={6}
            required 
          />
        </div>

        <button type="submit">Verify</button>
      </form>
    </div>
  );
}

export default VerifyPage;

