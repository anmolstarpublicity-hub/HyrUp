import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js';
import '../shared.css';
import './LiveStream.css';

const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || window.location.origin;
const BACKEND_CONFIGURED = !!(import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL);
const API_KEY_CONFIGURED = !!import.meta.env.VITE_API_KEY;

// Socket connects directly to API URL
let _socket = null;
function getSocket() {
  if (!_socket || _socket.disconnected) {
    if (_socket) { _socket.removeAllListeners(); _socket.disconnect(); }
    _socket = io(API_URL, {
      path: '/socket.io',
      transports: ['polling'],
      upgrade: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: Infinity,
      timeout: 10000,
    });
    _socket.on('connect_error', (err) => console.error('LiveStream socket connect_error:', err));
    _socket.on('connect_timeout', (err) => console.error('LiveStream socket connect_timeout:', err));
  }
  return _socket;
}

function LiveCard({ emp, isOnline }) {
  const [status, setStatus]       = useState('idle');   // idle | connecting | live | error
  const [fps, setFps]             = useState(0);
  const [frameCount, setFrameCount] = useState(0);
  const canvasRef   = useRef(null);
  const streamingRef = useRef(false);
  const fpsRef      = useRef({ count: 0, last: Date.now() });
  const empKey = emp.replaceAll(' ', '_');

  const statusRef = useRef('idle');

  const drawFrame = useCallback((b64) => {
    try { console.debug('LiveStream.drawFrame', empKey, 'frame_len', b64?.length || 0); } catch(e) {}
    const canvas = canvasRef.current;
    if (!canvas) return;
    const img = new Image();
    img.onload = () => {
      const ctx = canvas.getContext('2d');
      canvas.width  = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      // FPS counter
      fpsRef.current.count++;
      const now = Date.now();
      if (now - fpsRef.current.last >= 1000) {
        setFps(fpsRef.current.count);
        fpsRef.current = { count: 0, last: now };
      }
      setFrameCount(c => c + 1);
      statusRef.current = 'live';
      setStatus('live');
    };
    img.src = `data:image/jpeg;base64,${b64}`;
  }, []);

  useEffect(() => {
    const sio = getSocket();

    const onFrame = (data) => {
      if (data.employee !== empKey) return;
      try { console.debug('LiveStream.onFrame event', empKey, 'incoming_len', data.frame?.length || 0); } catch(e) {}
      drawFrame(data.frame);
      // keep modal frame updated if open
      setModalFrame(data.frame);
    };

    sio.on('frame', onFrame);
    return () => { sio.off('frame', onFrame); };
  }, [empKey, drawFrame]);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalFrame, setModalFrame] = useState(null);
  const modalImgRef = useRef(null);
  const modalFullscreenReqRef = useRef(false);
  const modalContainerRef = useRef(null);

  const startStream = useCallback(() => {
    if (!isOnline || streamingRef.current) return;
    streamingRef.current = true;
    statusRef.current = 'connecting';
    setStatus('connecting');
    setFrameCount(0);
    fpsRef.current = { count: 0, last: Date.now() };
    const sio = getSocket();
    try { console.debug('LiveStream.startStream emit start_watch', empKey); } catch(e) {}
    sio.emit('start_watch', { employee: empKey });
    // If no frame in 15s, show error
    const timeout = setTimeout(() => {
      if (streamingRef.current && statusRef.current !== 'live') {
        statusRef.current = 'error';
        setStatus('error');
      }
    }, 15000);
    const onFrame = (data) => {
      if (data.employee === empKey) clearTimeout(timeout);
    };
    sio.once('frame', onFrame);
  }, [isOnline, empKey]);

  useEffect(() => {
    try { console.debug('LiveCard modalOpen', empKey, modalOpen); } catch(e) {}
  }, [modalOpen, empKey]);

  const toggleFullscreen = useCallback(() => {
    // Toggle fullscreen on the canvas (live small preview) or modal image if available
    const elem = modalImgRef.current || canvasRef.current;
    if (!elem) return;
    const request = elem.requestFullscreen || elem.webkitRequestFullscreen || elem.mozRequestFullScreen || elem.msRequestFullscreen;
    const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
    if (!document.fullscreenElement) {
      request && request.call(elem);
    } else {
      exit && exit.call(document);
    }
  }, []);

  const stopStream = useCallback(() => {
    if (!streamingRef.current) return;
    streamingRef.current = false;
    statusRef.current = 'idle';
    setStatus('idle');
    setFps(0);
    setFrameCount(0);
    getSocket().emit('stop_watch', { employee: empKey });
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }, [empKey]);

  // Stop on unmount
  useEffect(() => {
    return () => {
      if (streamingRef.current) {
        streamingRef.current = false;
        getSocket().emit('stop_watch', { employee: empKey });
      }
    };
  }, [empKey]);

  const isStreaming = streamingRef.current;

  // If modal was opened via fullscreen button request, request fullscreen once modal image is available
  useEffect(() => {
    if (!modalOpen) {
      modalFullscreenReqRef.current = false;
      return;
    }
    if (modalFullscreenReqRef.current && modalFrame && (modalContainerRef.current || modalImgRef.current)) {
      const el = modalContainerRef.current || modalImgRef.current;
      const req = el.requestFullscreen || el.webkitRequestFullscreen || el.mozRequestFullScreen || el.msRequestFullscreen;
      try { req && req.call(el); } catch (e) { /* ignore */ }
      modalFullscreenReqRef.current = false;
    }
  }, [modalOpen, modalFrame]);

  return (
    <div className={`lv-card ${status === 'live' ? 'lv-card--live' : ''}`}>
      {/* Header */}
      <div className="lv-card-header">
        <div className="lv-emp-info">
          <div className="lv-avatar-wrap">
            <span className="lv-avatar">{emp.charAt(0).toUpperCase()}</span>
            {isOnline && <span className="lv-avatar-dot" />}
          </div>
          <div>
            <div className="lv-emp-name">{emp}</div>
            <div className={`lv-status-text ${isOnline ? 'lv-online' : 'lv-offline'}`}>
              <span className="lv-dot" />
              {isOnline ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
        <div className="lv-header-right">
          {status === 'live' && (
            <div className="lv-fps-badge">{fps} fps</div>
          )}
          {!isStreaming ? (
            <button
              className="lv-btn lv-btn--start"
              onClick={startStream}
              disabled={!isOnline}
              title={!isOnline ? 'Employee is offline' : 'Start live stream'}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
              Watch Live
            </button>
          ) : (
            <button className="lv-btn lv-btn--stop" onClick={stopStream}>
              <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2"/>
              </svg>
              Stop
            </button>
          )}
          <button className="lv-btn lv-btn--fs" onClick={() => { modalFullscreenReqRef.current = true; setModalOpen(true); startStream(); toggleFullscreen(); }} title="Fullscreen">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 0 0-2 2v3"/>
              <path d="M16 3h3a2 2 0 0 1 2 2v3"/>
              <path d="M8 21H5a2 2 0 0 1-2-2v-3"/>
              <path d="M16 21h3a2 2 0 0 0 2-2v-3"/>
            </svg>
          </button>
          {modalOpen && createPortal(
            <div className="lv-fullscreen-overlay" onClick={() => setModalOpen(false)}>
              <div className="lv-fullscreen-content" onClick={e => e.stopPropagation()}>
                <button className="lv-fullscreen-close" onClick={() => setModalOpen(false)}>Close</button>
                {modalFrame ? (
                  <div ref={modalContainerRef} className="lv-fullscreen-wrapper">
                    <img
                      ref={modalImgRef}
                      src={`data:image/jpeg;base64,${modalFrame}`}
                      alt={`${emp} live fullscreen`}
                      className="lv-fullscreen-img"
                      onClick={() => {
                        const container = modalContainerRef.current || modalImgRef.current;
                        if (!container) return;
                        if (!document.fullscreenElement) {
                          const req = container.requestFullscreen || container.webkitRequestFullscreen || container.mozRequestFullScreen || container.msRequestFullscreen;
                          req && req.call(container);
                        } else {
                          const exit = document.exitFullscreen || document.webkitExitFullscreen || document.mozCancelFullScreen || document.msExitFullscreen;
                          exit && exit.call(document);
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="lv-loading"><div className="lv-spinner"/>Waiting for frame...</div>
                )}
              </div>
            </div>
          , document.body)}
        </div>
      </div>

      {/* Screen */}
      <div className="lv-screen">
        <canvas ref={canvasRef} className="lv-canvas" style={{ display: status === 'live' ? 'block' : 'none' }} />

        {status === 'idle' && (
          <div className="lv-placeholder">
            <div className="lv-placeholder-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </div>
            <span className="lv-placeholder-text">
              {isOnline ? 'Click Watch Live to start streaming' : 'Employee is offline'}
            </span>
            {isOnline && (
              <button className="lv-placeholder-btn" onClick={startStream}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
                Start Stream
              </button>
            )}
          </div>
        )}

        {status === 'connecting' && (
          <div className="lv-placeholder">
            <div className="lv-connecting-ring">
              <div className="lv-spinner" />
            </div>
            <span className="lv-placeholder-text">Connecting to {emp}...</span>
            <span className="lv-placeholder-sub">Waiting for first frame</span>
          </div>
        )}

        {status === 'error' && (
          <div className="lv-placeholder lv-placeholder--error">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span className="lv-placeholder-text">No response from collector</span>
            <span className="lv-placeholder-sub">Make sure collector.py is running on the employee PC</span>
            <button className="lv-placeholder-btn lv-placeholder-btn--retry" onClick={() => { stopStream(); setTimeout(startStream, 300); }}>
              Retry
            </button>
          </div>
        )}

        {/* Live badge overlay */}
        {status === 'live' && (
          <>
            <div className="lv-live-badge">
              <span className="lv-live-dot" /> LIVE
            </div>
            <div className="lv-frame-counter">{frameCount} frames</div>
          </>
        )}
      </div>

      {/* Footer stats */}
      {status === 'live' && (
        <div className="lv-card-footer">
          <div className="lv-stat">
            <span className="lv-stat-label">Quality</span>
            <span className="lv-stat-val">30% JPEG</span>
          </div>
          <div className="lv-stat-divider" />
          <div className="lv-stat">
            <span className="lv-stat-label">Latency</span>
            <span className="lv-stat-val">~500ms</span>
          </div>
          <div className="lv-stat-divider" />
          <div className="lv-stat">
            <span className="lv-stat-label">Transport</span>
            <span className="lv-stat-val">WebSocket</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveStream({ data, onRefresh }) {
  const [socketConnected, setSocketConnected] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = () => {
    if (spinning) return;
    setSpinning(true);
    // Reconnect socket
    if (_socket) { _socket.disconnect(); _socket = null; }
    onRefresh?.();
    setTimeout(() => setSpinning(false), 1000);
  };

  useEffect(() => {
    const sio = getSocket();
    const onConnect    = () => setSocketConnected(true);
    const onDisconnect = () => setSocketConnected(false);
    const onError     = (err) => { console.error('LiveStream socket error:', err); setSocketConnected(false); };
    sio.on('connect',        onConnect);
    sio.on('disconnect',     onDisconnect);
    sio.on('connect_error',  onError);
    sio.on('connect_timeout', onError);
    if (sio.connected) setSocketConnected(true);
    return () => {
      sio.off('connect',    onConnect);
      sio.off('disconnect', onDisconnect);
    };
  }, []);

  const employees = useMemo(() => {
    if (!data?.length) return [];
    return [...new Set(data.map(r => r['Employee Name']))].filter(Boolean).sort();
  }, [data]);

  const onlineEmps = useMemo(() => {
    if (!data?.length) return new Set();
    const cutoff = Date.now() - 5 * 60 * 1000;
    const s = new Set();
    data.forEach(r => {
      const t = new Date(r.Timestamp.replace(' ', 'T')).getTime();
      if (!isNaN(t) && t >= cutoff) s.add(r['Employee Name']);
    });
    return s;
  }, [data]);

  return (
    <div className="page-anim">
      {/* Header */}
      <div className="dash-header">
        <div className="dash-header-left">
          <div className="dash-title-row">
            <div className="dash-title-icon" style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/>
              </svg>
            </div>
            <div>
              <div className="dash-title">Live Stream</div>
              <div className="dash-sub" style={{ marginLeft: 0, marginTop: '2px' }}>
                Real-time employee screen monitoring
              </div>
            </div>
          </div>
        </div>
        <div className="dash-header-right">
          <div className={`lv-conn-badge ${socketConnected ? 'lv-conn-ok' : 'lv-conn-err'}`}>
            <span className="lv-conn-dot" />
            {socketConnected ? 'Server Connected' : 'Connecting...'}
          </div>
          <button className={`dash-refresh-btn${spinning ? ' spinning' : ''}`} onClick={handleRefresh} title="Refresh">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Info bar */}
      <div className="lv-info-bar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>
        <span>Streams at ~2.5 fps via polling. Collector must be running on the employee PC. Only online employees can be streamed.</span>
      </div>

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

      {!socketConnected && (
        <div className="lv-warn-bar">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Not connected to central_api.py — make sure it is running on port 5001.
        </div>
      )}

      {employees.length === 0 ? (
        <div className="no-data">No employees found. Make sure the collector is running.</div>
      ) : (
        <div className="lv-grid">
          {employees.map(emp => (
            <LiveCard key={emp} emp={emp} isOnline={onlineEmps.has(emp)} />
          ))}
        </div>
      )}
    </div>
  );
}
