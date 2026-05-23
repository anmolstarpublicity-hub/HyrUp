import { useState, useEffect, useRef } from 'react';
import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js';
import '../shared.css';
import './LiveView.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || window.location.origin;
const BACKEND_CONFIGURED = !!(import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL);
const API_KEY = import.meta.env.VITE_API_KEY || '';
const API_KEY_CONFIGURED = !!API_KEY;
const apiFetch = (url, opts = {}) => fetch(`${BACKEND_URL}${url}`, {
  ...opts,
  headers: { 'X-API-Key': API_KEY, ...(opts.headers || {}) }
});

export default function LiveView({ onBack }) {
  const [employees, setEmployees]   = useState([]);
  const [streams,   setStreams]     = useState({}); // { emp: { frame: base64, active: bool, lastUpdate: Date } }
  const [active,    setActive]      = useState({}); // { emp: bool }
  const [lightbox,  setLightbox]    = useState(null);
  const [loading,   setLoading]     = useState(true);
  const socketRef = useRef(null);
  const reconnectTimeoutRef = useRef(null);

  // Initialize WebSocket connection
  useEffect(() => {
    const initSocket = () => {
      const socket = io(BACKEND_URL, {
        path: '/socket.io',
        transports: ['polling'],
        upgrade: false,
        auth: { 'X-API-Key': API_KEY }
      });

      socket.on('connect', () => {
        console.log('Connected to live stream server', BACKEND_URL);
      });
      socket.on('connect_error', (err) => {
        console.error('LiveView socket connect_error:', err);
      });
      socket.on('connect_timeout', (err) => {
        console.error('LiveView socket connect_timeout:', err);
      });
      socket.on('connect_error', (err) => {
        console.error('LiveView socket connect_error:', err);
      });
      socket.on('connect_timeout', (err) => {
        console.error('LiveView socket connect_timeout:', err);
      });

      socket.on('frame', (data) => {
        const { employee, frame } = data;
        setStreams(prev => ({
          ...prev,
          [employee]: {
            frame: `data:image/jpeg;base64,${frame}`,
            active: true,
            lastUpdate: new Date()
          }
        }));
      });

      socket.on('disconnect', () => {
        console.log('Disconnected from live stream server');
        // Clear all streams on disconnect
        setStreams({});
        setActive({});
      });

      socket.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
        // Retry connection after 5 seconds
        reconnectTimeoutRef.current = setTimeout(initSocket, 5000);
      });

      socketRef.current = socket;
    };

    // Load employees first
    apiFetch('/api/employees')
      .then(r => r.json())
      .then(emps => {
        setEmployees(emps);
        setLoading(false);
        // Initialize socket after employees are loaded
        initSocket();
      })
      .catch(() => setLoading(false));

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, []);

  const backendWarning = (
    <>
      {!BACKEND_CONFIGURED && (
        <div className="lv-warn-bar" style={{ background: '#FEF3C7', color: '#92400E', marginTop: '12px' }}>
          Frontend backend URL is not configured. Set <strong>VITE_BACKEND_URL</strong> or <strong>VITE_API_URL</strong> in Vercel and redeploy.
        </div>
      )}
      {!API_KEY_CONFIGURED && (
        <div className="lv-warn-bar" style={{ background: '#FECACA', color: '#991B1B', marginTop: '12px' }}>
          Frontend API key is not configured. Set <strong>VITE_API_KEY</strong> in Vercel and redeploy.
        </div>
      )}
      <div className="lv-info-bar" style={{ background: '#EFF6FF', color: '#1D4ED8' }}>
        <strong>Debug:</strong> backend={BACKEND_URL} transport=polling
      </div>
    </>
  );

  const startLive = (emp) => {
    if (!socketRef.current?.connected) {
      console.warn('Socket not connected');
      return;
    }

    setActive(prev => ({ ...prev, [emp]: true }));
    // Notify backend to start streaming for this employee
    socketRef.current.emit('start_watch', { employee: emp });
  };

  const stopLive = (emp) => {
    setActive(prev => ({ ...prev, [emp]: false }));
    // Notify backend to stop streaming for this employee
    if (socketRef.current?.connected) {
      socketRef.current.emit('stop_watch', { employee: emp });
    }
    // Clear the stream
    setStreams(prev => {
      const newStreams = { ...prev };
      delete newStreams[emp];
      return newStreams;
    });
  };

  return (
    <div className="page-anim">
      <button className="back-btn" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 1024 1024" fill="currentColor">
          <path d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"/>
          <path d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"/>
        </svg>
        Back
      </button>

      <div className="dash-header" style={{ marginTop: '1rem' }}>
        <div className="dash-header-left">
          <div className="dash-title-row">
            <div className="dash-title-icon">

        {backendWarning}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <div className="dash-title">Live View</div>
          </div>
          <div className="dash-sub">Real-time employee screen monitoring — updates every 10 seconds</div>
        </div>
        <div className="lv-live-badge">
          <span className="lv-live-dot" />
          Live
        </div>
      </div>

      {loading && <div className="no-data">Loading employees...</div>}

      {!loading && employees.length === 0 && (
        <div className="no-data">No employees found.</div>
      )}

      {!loading && employees.length > 0 && (
        <div className="lv-grid">
          {employees.map(emp => (
            <div key={emp} className={`lv-card ${active[emp] ? 'lv-card-active' : ''}`}>
              <div className="lv-card-header">
                <div className="lv-card-header-main">
                  <div className="lv-avatar">{emp.charAt(0).toUpperCase()}</div>
                  <div className="lv-emp-info">
                    <div className="lv-emp-name">{emp}</div>
                    {streams[emp] && (
                      <div className="lv-emp-time">
                        Live • Updated {streams[emp].lastUpdate?.toLocaleTimeString()}
                      </div>
                    )}
                  </div>
                </div>
                <div className="lv-card-header-actions">
                  <button
                    className={`lv-btn ${active[emp] ? 'lv-btn-stop' : 'lv-btn-start'}`}
                    onClick={() => active[emp] ? stopLive(emp) : startLive(emp)}
                  >
                    {active[emp] ? (
                      <>
                        <span className="lv-pulse" />
                        Stop Live View
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"/>
                          <polygon points="10,8 16,12 10,16 10,8"/>
                        </svg>
                        Start Live View
                      </>
                    )}
                  </button>
                  {streams[emp] && (
                    <div className="lv-stream-status">
                      <span className="lv-live-indicator">●</span>
                      Streaming live
                    </div>
                  )}
                </div>
              </div>

              <div className="lv-screen-wrap" onClick={() => streams[emp] && setLightbox(streams[emp].frame)}>
                {streams[emp] ? (
                  <img
                    src={streams[emp].frame}
                    alt={`${emp} live stream`}
                    className="lv-screen-img"
                  />
                ) : (
                  <div className="lv-placeholder">
                    {active[emp] ? (
                      <div className="lv-loading">
                        <div className="lv-spinner" />
                        <span>Connecting to live stream...</span>
                      </div>
                    ) : (
                      <div className="lv-idle">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="2" y="3" width="20" height="14" rx="2"/>
                          <line x1="8" y1="21" x2="16" y2="21"/>
                          <line x1="12" y1="17" x2="12" y2="21"/>
                        </svg>
                        <span>Click "Start Live View" to begin streaming</span>
                      </div>
                    )}
                  </div>
                )}
              </div>


            </div>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="lb-overlay" onClick={() => setLightbox(null)}>
          <div className="lb-content" onClick={e => e.stopPropagation()}>
            <div className="lb-toolbar">
              <button onClick={() => setLightbox(null)}>Close</button>
            </div>
            <div className="lb-image-wrap">
              <img src={lightbox} className="lb-img" alt="live screen" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
