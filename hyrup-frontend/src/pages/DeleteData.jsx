import { useState, useEffect } from 'react';
import '../shared.css';
import './DeleteData.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || window.location.origin;
const API_KEY = import.meta.env.VITE_API_KEY || '';
const apiFetch = (url, opts = {}) => fetch(`${BACKEND_URL}${url}`, {
  ...opts,
  headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json', ...(opts.headers || {}) }
});

export default function DeleteData({ onBack, dateRange, onNotify }) {
  const [employees, setEmployees]   = useState([]);
  const [selEmp,    setSelEmp]      = useState('All');
  const [selDate,   setSelDate]     = useState('');
  const [mode,      setMode]        = useState('employee'); // 'employee' | 'date' | 'both'
  const [loading,   setLoading]     = useState(false);
  const [confirm,   setConfirm]     = useState(false);
  const [result,    setResult]      = useState(null);
  const [cleaning,  setCleaning]    = useState(false);
  const [cleanDays, setCleanDays]   = useState(30);

  const handleCleanup = async () => {
    setCleaning(true); setResult(null);
    try {
      const res = await apiFetch(`/api/cleanup?days=${cleanDays}`, { method: 'POST' });
      if (res.ok) {
        const msg = `Auto-cleanup done: deleted data older than ${cleanDays} days.`;
        setResult({ success: true, msg });
        onNotify?.(msg, 'Medium');
        if (Notification.permission === 'granted')
          new Notification('HyrUp — Auto Cleanup', { body: msg, icon: '/favicon.svg' });
      } else setResult({ success: false, msg: 'Cleanup failed.' });
    } catch { setResult({ success: false, msg: 'Error connecting to API.' }); }
    setCleaning(false);
  };

  useEffect(() => {
    apiFetch('/api/employees').then(r => r.json()).then(setEmployees).catch(() => {});
  }, []);

  const getDescription = () => {
    if (mode === 'employee' && selEmp !== 'All') return `All data for employee "${selEmp}"`;
    if (mode === 'date' && selDate) return `All data on date "${selDate}"`;
    if (mode === 'both' && selEmp !== 'All' && selDate) return `Data for "${selEmp}" on "${selDate}"`;
    return null;
  };

  const canDelete = () => {
    if (mode === 'employee') return selEmp !== 'All';
    if (mode === 'date') return !!selDate;
    if (mode === 'both') return selEmp !== 'All' && !!selDate;
    return false;
  };

  const handleDelete = async () => {
    setLoading(true);
    setResult(null);
    try {
      let url = '';
      if (mode === 'employee') url = `/api/delete/employee/${encodeURIComponent(selEmp)}`;
      else if (mode === 'date') url = `/api/delete/date/${selDate}`;
      else if (mode === 'both') url = `/api/delete/employee/${encodeURIComponent(selEmp)}/date/${selDate}`;

      const res = await apiFetch(url, { method: 'DELETE' });
      if (res.ok) {
        const msg = `Successfully deleted: ${getDescription()}`;
        setResult({ success: true, msg });
        onNotify?.(msg, 'High');
        if (Notification.permission === 'granted')
          new Notification('HyrUp — Data Deleted', { body: msg, icon: '/favicon.svg' });
      } else {
        setResult({ success: false, msg: 'Delete failed. Please try again.' });
      }
    } catch (e) {
      setResult({ success: false, msg: 'Error connecting to API.' });
    }
    setLoading(false);
    setConfirm(false);
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
            <div className="dash-title-icon" style={{ background: 'linear-gradient(135deg,#EF4444,#dc2626)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                <path d="M10 11v6"/><path d="M14 11v6"/>
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
              </svg>
            </div>
            <div className="dash-title">Delete Data</div>
          </div>
          <div className="dash-sub">Permanently remove employee activity data from the database</div>
        </div>
      </div>

      <div className="del-card">
        {/* Mode selector */}
        <div className="del-section">
          <div className="del-label">Delete By</div>
          <div className="del-mode-row">
            {[
              { key: 'employee', label: 'Employee' },
              { key: 'date',     label: 'Date' },
              { key: 'both',     label: 'Employee + Date' },
            ].map(m => (
              <button
                key={m.key}
                className={`del-mode-btn ${mode === m.key ? 'del-mode-active' : ''}`}
                onClick={() => { setMode(m.key); setResult(null); setConfirm(false); }}
              >{m.label}</button>
            ))}
          </div>
        </div>

        {/* Employee selector */}
        {(mode === 'employee' || mode === 'both') && (
          <div className="del-section">
            <div className="del-label">Select Employee</div>
            <select className="del-select" value={selEmp} onChange={e => setSelEmp(e.target.value)}>
              <option value="All">-- Select Employee --</option>
              {employees.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
        )}

        {/* Date selector */}
        {(mode === 'date' || mode === 'both') && (
          <div className="del-section">
            <div className="del-label">Select Date</div>
            <input
              type="date" className="del-input"
              value={selDate}
              onChange={e => setSelDate(e.target.value)}
            />
          </div>
        )}

        {/* Warning */}
        {canDelete() && !confirm && (
          <div className="del-warning">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
              <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
            </svg>
            <span>This will permanently delete: <strong>{getDescription()}</strong></span>
          </div>
        )}

        {/* Result */}
        {result && (
          <div className={`del-result ${result.success ? 'del-result-ok' : 'del-result-err'}`}>
            {result.success
              ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
              : <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#DC2626" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            }
            <span>{result.msg}</span>
          </div>
        )}

        {/* Buttons */}
        <div className="del-actions">
          {!confirm ? (
            <button
              className="del-btn-delete"
              disabled={!canDelete() || loading}
              onClick={() => setConfirm(true)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              </svg>
              Delete Data
            </button>
          ) : (
            <div className="del-confirm-row">
              <span className="del-confirm-text">Are you sure? This cannot be undone.</span>
              <button className="del-btn-confirm" onClick={handleDelete} disabled={loading}>
                {loading ? 'Deleting...' : 'Yes, Delete'}
              </button>
              <button className="del-btn-cancel" onClick={() => setConfirm(false)}>Cancel</button>
            </div>
          )}
        </div>
      </div>

      {/* Auto Cleanup Card */}
      <div className="del-card" style={{ marginTop: '1.4rem' }}>
        <div className="del-section">
          <div className="del-label">Auto Cleanup — Delete Old Data</div>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
            Automatically runs every 24 hours. You can also trigger it manually below.
          </p>
        </div>
        <div className="del-section">
          <div className="del-label">Delete data older than</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <select className="del-select" style={{ width: 'auto' }} value={cleanDays} onChange={e => setCleanDays(Number(e.target.value))}>
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={60}>60 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
        </div>
        <div className="del-actions">
          <button className="del-btn-delete" onClick={handleCleanup} disabled={cleaning}
            style={{ background: '#F59E0B', boxShadow: '0 4px 12px rgba(245,158,11,0.3)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
            </svg>
            {cleaning ? 'Cleaning...' : `Clean Data Older Than ${cleanDays} Days`}
          </button>
        </div>
      </div>
    </div>
  );
}
