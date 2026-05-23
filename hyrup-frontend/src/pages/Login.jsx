import { useState } from 'react';
import './Login.css';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  const validUsername = import.meta.env.VITE_APP_USERNAME || 'admin';
  const validPassword = import.meta.env.VITE_APP_PASSWORD || 'password123';
  const missingLoginEnv = !import.meta.env.VITE_APP_USERNAME || !import.meta.env.VITE_APP_PASSWORD;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (missingLoginEnv) {
      console.warn('VITE_APP_USERNAME or VITE_APP_PASSWORD not set in environment; falling back to defaults.');
    }
    if (username === validUsername && password === validPassword) {
      onLogin();
    } else {
      alert('Invalid username or password. Please check your credentials.');
    }
  };

  return (
    <div className="login-page">
      <div className="container">
        <div className="login-logo-wrap">
          <img src="/logo.png" alt="HyrUp" className="login-logo-img" />
        </div>
        <div className="heading">Login</div>
        {missingLoginEnv && (
          <div className="login-warning" style={{ background: '#FEF3C7', color: '#991B1B', padding: '10px', borderRadius: '6px', marginBottom: '16px' }}>
            VITE_APP_USERNAME or VITE_APP_PASSWORD is not set in Vercel. Default admin credentials are active.
          </div>
        )}
        <form className="form" onSubmit={handleSubmit}>
          <input
            required
            className="input"
            type="text"
            name="username"
            id="username"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
          <div className="password-wrap">
            <input
              required
              className="input"
              type={showPass ? 'text' : 'password'}
              name="password"
              id="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="eye-btn" onClick={() => setShowPass(v => !v)} tabIndex={-1}>
              {showPass
                ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                    <circle cx="12" cy="12" r="3"/>
                  </svg>
              }
            </button>
          </div>
          <input className="login-button" type="submit" value="Login" />
        </form>
      </div>
    </div>
  );
}