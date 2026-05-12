import { useState, useEffect } from 'react';
import './WelcomeBar.css';

function getGreeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
}

function formatTime(d) {
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(d) {
  return d.toLocaleDateString('en-US', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
}

export default function WelcomeBar() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="welcome-card">
      <div className="wc-left">
        <div className="wc-greeting-row">
          <span className="wc-greeting-dot" />
          <span className="wc-greeting">{getGreeting()}</span>
        </div>
        <div className="wc-title">
          Welcome back, <span className="wc-admin">Admin</span>
        </div>
        <div className="wc-sub">You have full access to the monitoring suite</div>
      </div>
      <div className="wc-right">
        <div className="wc-time-block">
          <div className="wc-time">{formatTime(now)}</div>
          <div className="wc-date">{formatDate(now)}</div>
        </div>
        <div className="wc-badge">
          <span className="wc-dot" /> LIVE MONITORING
        </div>
      </div>
    </div>
  );
}
