import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import '../shared.css';
import './Screenshots.css';

const API_KEY = import.meta.env.VITE_API_KEY || '';
const API_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || window.location.origin;
const apiFetch = (url, opts = {}) => fetch(`${API_URL}${url}`, { ...opts, headers: { 'X-API-Key': API_KEY, ...(opts.headers || {}) } });
const imgSrc = (emp, file) => `${API_URL}/api/screenshots/${encodeURIComponent(emp.replace(/ /g, '_'))}/${encodeURIComponent(file)}?api_key=${API_KEY}`;

function parseFileDate(file) {
  const parts = file.replace('.png', '').split('_');
  for (const p of parts) { if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p; }
  return '';
}

function ShotBtn({ status, onClick, offline }) {
  if (offline) return (
    <button className="shot-btn shot-btn--offline" disabled>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/></svg>
      <span>Offline</span>
    </button>
  );
  const labels = { idle: 'Take Screenshot', loading: 'Triggering...', success: 'Triggered!', error: 'Failed' };
  return (
    <button className={`shot-btn shot-btn--${status}`} onClick={onClick} disabled={status === 'loading'}>
      {status === 'idle' && <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>}
      <span>{labels[status]}</span>
    </button>
  );
}

const ScreenshotEmptyState = ({ title = 'No Screenshots Yet', message = 'Trigger a screenshot or update your filters to view recent captures.' }) => (
  <div className="screenshot-empty-state">
    <div className="screenshot-empty-icon">
      <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="screenshotGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14B8A6"/>
            <stop offset="100%" stopColor="#3B82F6"/>
          </linearGradient>
        </defs>
        <rect x="18" y="24" width="92" height="70" rx="18" fill="currentColor" opacity="0.08"/>
        <path d="M30 40H98" stroke="currentColor" strokeWidth="2" opacity="0.14" strokeLinecap="round"/>
        <path d="M30 56H54" stroke="currentColor" strokeWidth="2" opacity="0.14" strokeLinecap="round"/>
        <path d="M30 72H74" stroke="currentColor" strokeWidth="2" opacity="0.14" strokeLinecap="round"/>
        <path d="M42 78L54 66L66 74L88 56" stroke="url(#screenshotGradient)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="42" cy="78" r="4.5" fill="#14B8A6"/>
        <circle cx="54" cy="66" r="4.5" fill="#3B82F6"/>
        <circle cx="66" cy="74" r="4.5" fill="#A855F7"/>
        <circle cx="88" cy="56" r="4.5" fill="#F59E0B"/>
        <circle className="screenshot-pulse-ring" cx="88" cy="56" r="10" stroke="#3B82F6" strokeWidth="1.5" fill="none" opacity="0.28"/>
      </svg>
    </div>
    <h3 className="empty-state-title">{title}</h3>
    <p className="empty-state-message">{message}</p>
  </div>
);

export default function Screenshots({ onBack, dateRange, data, onRefresh }) {
  const [lightbox,     setLightbox]     = useState(null);
  const [zoom,         setZoom]         = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [employees,    setEmployees]    = useState([]);
  const [selectedEmp,  setSelectedEmp]  = useState('All');
  const [shotsByEmp,   setShotsByEmp]   = useState({});
  const [loading,      setLoading]      = useState(true);
  const [loadError,    setLoadError]    = useState('');
  const [dropOpen,     setDropOpen]     = useState(false);
  const [shotStatuses, setShotStatuses] = useState({});
  const [spinning,     setSpinning]     = useState(false);
  const [loadKey,      setLoadKey]      = useState(0);
  const [selected,     setSelected]     = useState(new Set());
  const [selectMode,   setSelectMode]   = useState(false);
  const [deleting,     setDeleting]     = useState(false);
  const [dlOpen,       setDlOpen]       = useState(false);
  const [dlEmp,        setDlEmp]        = useState('All');
  const [dlEmpOpen,    setDlEmpOpen]    = useState(false);
  const [dlFrom,       setDlFrom]       = useState('');
  const [dlTo,         setDlTo]         = useState('');
  const [dlProgress,   setDlProgress]   = useState(null);
  const lbContentRef = useRef(null);
  const dlPanelRef   = useRef(null);

  const onlineEmps = useMemo(() => {
    if (!data?.length) return new Set();
    const cutoff = Date.now() - 5 * 60 * 1000;
    const online = new Set();
    data.forEach(r => { const t = new Date(r.Timestamp.replace(' ', 'T')).getTime(); if (!isNaN(t) && t >= cutoff) online.add(r['Employee Name']); });
    return online;
  }, [data]);

  const triggerShot = useCallback(async (emp) => {
    if ((shotStatuses[emp] || 'idle') === 'loading') return;
    setShotStatuses(s => ({ ...s, [emp]: 'loading' }));
    try {
      const res = await fetch(`${API_URL}/api/screenshot/trigger/${encodeURIComponent(emp.replace(/ /g, '_'))}`, { method: 'POST', headers: { 'X-API-Key': API_KEY } });
      const status = res.ok ? 'success' : 'error';
      setShotStatuses(s => ({ ...s, [emp]: status }));
      setTimeout(() => setShotStatuses(s => ({ ...s, [emp]: 'idle' })), 3000);
    } catch { setShotStatuses(s => ({ ...s, [emp]: 'error' })); setTimeout(() => setShotStatuses(s => ({ ...s, [emp]: 'idle' })), 3000); }
  }, [shotStatuses]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const emps = await apiFetch('/api/employees').then(r => r.json());
        if (cancelled) return;
        const result = {};
        await Promise.all(emps.map(emp => apiFetch(`/api/screenshots/${encodeURIComponent(emp)}`).then(r => r.json()).then(files => { result[emp] = files.filter(f => f.endsWith('.png')); }).catch(() => { result[emp] = []; })));
        if (cancelled) return;
        setEmployees(emps); setShotsByEmp(result);
      } catch { if (!cancelled) setLoadError('Unable to load screenshots.'); }
      finally { if (!cancelled) setLoading(false); }
    };
    load();
    return () => { cancelled = true; };
  }, [loadKey]);

  useEffect(() => {
    if (!dropOpen) return;
    const h = (e) => { if (!e.target.closest('.saas-select-wrap')) setDropOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [dropOpen]);

  useEffect(() => {
    const h = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', h);
    return () => document.removeEventListener('fullscreenchange', h);
  }, []);

  const filterByDate = (files) => {
    if (!dateRange) return files;
    return files.filter(f => { const d = parseFileDate(f); return d >= dateRange.start && d <= dateRange.end; });
  };

  const showEmps = selectedEmp === 'All' ? employees : [selectedEmp];
  const allShots = showEmps.flatMap(emp => filterByDate(shotsByEmp[emp] || []).map(f => ({ emp, file: f })));
  const totalShots = Object.values(shotsByEmp).reduce((s, a) => s + a.length, 0);

  // ── Download helpers ──────────────────────────────────────────────
  useEffect(() => {
    if (!dlOpen) return;
    const h = (e) => {
      if (dlPanelRef.current && !dlPanelRef.current.contains(e.target)) { setDlOpen(false); setDlEmpOpen(false); }
      else if (!e.target.closest('.dl-emp-wrap')) setDlEmpOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [dlOpen]);

  const handleDownload = async () => {
    const empsToDownload = dlEmp === 'All' ? employees : [dlEmp];
    const pairs = empsToDownload.flatMap(emp =>
      (shotsByEmp[emp] || []).filter(f => {
        if (!dlFrom && !dlTo) return true;
        const d = parseFileDate(f);
        if (dlFrom && d < dlFrom) return false;
        if (dlTo   && d > dlTo)   return false;
        return true;
      }).map(f => ({ emp, file: f }))
    );
    if (!pairs.length) return;
    setDlProgress({ done: 0, total: pairs.length });
    for (let i = 0; i < pairs.length; i++) {
      const { emp, file } = pairs[i];
      try {
        const res = await fetch(`${API_URL}/api/screenshots/${encodeURIComponent(emp.replace(/ /g,'_'))}/${encodeURIComponent(file)}?api_key=${API_KEY}`);
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${emp.replace(/ /g,'_')}__${file}`;
        a.click();
        URL.revokeObjectURL(a.href);
        await new Promise(r => setTimeout(r, 120));
      } catch {}
      setDlProgress({ done: i + 1, total: pairs.length });
    }
    setDlProgress(null);
    setDlOpen(false);
  };

  const dlFilteredCount = (() => {
    const emps = dlEmp === 'All' ? employees : [dlEmp];
    return emps.reduce((sum, emp) => sum + (shotsByEmp[emp] || []).filter(f => {
      if (!dlFrom && !dlTo) return true;
      const d = parseFileDate(f);
      if (dlFrom && d < dlFrom) return false;
      if (dlTo   && d > dlTo)   return false;
      return true;
    }).length, 0);
  })();

  const toggleSelect = (key) => setSelected(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  const selectAll = () => setSelected(new Set(allShots.map(s => `${s.emp}::${s.file}`)));
  const clearSelect = () => { setSelected(new Set()); setSelectMode(false); };

  const handleDeleteSelected = async () => {
    if (!selected.size) return;
    setDeleting(true);
    await Promise.all([...selected].map(async key => {
      const [emp, file] = key.split('::');
      try { await apiFetch(`/api/screenshots/${encodeURIComponent(emp)}/${encodeURIComponent(file)}`, { method: 'DELETE' }); } catch {}
    }));
    setDeleting(false);
    clearSelect();
    setLoadKey(k => k + 1);
  };

  const ShotCard = ({ emp, file }) => {
    const key = `${emp}::${file}`;
    const isSelected = selected.has(key);
    return (
      <div className={`screenshot-card ${isSelected ? 'ss-card-selected' : ''}`} style={{ position: 'relative' }}>
        {selectMode && (
          <div className="ss-checkbox" onClick={() => toggleSelect(key)}>
            {isSelected
              ? <svg width="14" height="14" viewBox="0 0 24 24" fill="#008080" stroke="#008080" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="9 12 11 14 15 10" stroke="#fff" strokeWidth="2.5" fill="none"/></svg>
              : <svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="#008080" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="3"/></svg>
            }
          </div>
        )}
        <img
          className="screenshot-thumb"
          src={imgSrc(emp, file)}
          alt={file}
          onClick={() => { if (selectMode) { toggleSelect(key); } else { setLightbox(imgSrc(emp, file)); setZoom(1); } }}
        />
        <div className="screenshot-meta">
          <span className="screenshot-emp-badge">{emp.charAt(0).toUpperCase()}</span>
          <span className="screenshot-name">{file.replace('.png','').split('_').slice(1).join(' ')}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="page-anim">
      <button className="back-btn" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 1024 1024" fill="currentColor"><path d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"/><path d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"/></svg>
        Back
      </button>

      <div className="dash-header" style={{ marginTop: '1rem' }}>
        <div className="dash-header-left">
          <div className="dash-title-row">
            <div className="dash-title-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </div>
            <div className="dash-title">Screenshots</div>
          </div>
          <div className="dash-sub">Employee screen captures — every 1 hour</div>
        </div>
        {!loading && !loadError && (
          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
            <span className="ss-badge">{totalShots} captures</span>
            <span className="ss-badge ss-badge-emp">{employees.length} employees</span>
            {!selectMode ? (
              <button className="ss-select-btn" onClick={() => setSelectMode(true)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="3"/><polyline points="9 12 11 14 15 10"/></svg>
                Select
              </button>
            ) : (
              <>
                <button className="ss-select-all-btn" onClick={selectAll}>Select All</button>
                <button className="ss-delete-btn" onClick={handleDeleteSelected} disabled={!selected.size || deleting}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>
                  {deleting ? 'Deleting...' : `Delete (${selected.size})`}
                </button>
                <button className="ss-cancel-btn" onClick={clearSelect}>Cancel</button>
              </>
            )}
            <div style={{ position: 'relative' }}>
              <button className="ss-download-btn" onClick={() => setDlOpen(o => !o)}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                <span>Download</span>
              </button>
              {dlOpen && (
                <div className="dl-panel" ref={dlPanelRef}>
                  <div className="dl-panel-header">
                    <div className="dl-panel-icon">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </div>
                    <span className="dl-panel-title">Download Screenshots</span>
                  </div>

                  <div className="dl-section">
                    <div className="dl-field-label">Employee</div>
                    <div className="dl-emp-wrap">
                      <button className={`dl-emp-trigger ${dlEmpOpen ? 'open' : ''}`} onClick={() => setDlEmpOpen(o => !o)}>
                        {dlEmp === 'All'
                          ? <span className="dl-emp-avatar dl-emp-avatar--all"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
                          : <span className="dl-emp-avatar">{dlEmp.charAt(0).toUpperCase()}</span>
                        }
                        <span className="dl-emp-name">{dlEmp === 'All' ? 'All Employees' : dlEmp}</span>
                        <svg className="dl-emp-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
                      </button>
                      {dlEmpOpen && (
                        <div className="dl-emp-menu">
                          {['All', ...employees].map(e => (
                            <div key={e} className={`dl-emp-option ${e === dlEmp ? 'active' : ''}`} onClick={() => { setDlEmp(e); setDlEmpOpen(false); }}>
                              {e === 'All'
                                ? <span className="dl-emp-avatar dl-emp-avatar--all" style={{ width: 22, height: 22, fontSize: 10 }}><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
                                : <span className="dl-emp-avatar" style={{ width: 22, height: 22, fontSize: 10 }}>{e.charAt(0).toUpperCase()}</span>
                              }
                              <span className="dl-emp-option-name">{e === 'All' ? 'All Employees' : e}</span>
                              {e !== 'All' && <span className="dl-emp-count">{(shotsByEmp[e] || []).length}</span>}
                              {e === dlEmp && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="dl-section">
                    <div className="dl-field-label">Date Range <span className="dl-optional">— optional</span></div>
                    <div className="dl-date-row">
                      <div className="dl-date-col">
                        <span className="dl-date-sublabel">From</span>
                        <input type="date" className="dl-date-input" value={dlFrom} onChange={e => setDlFrom(e.target.value)} />
                      </div>
                      <div className="dl-date-sep">→</div>
                      <div className="dl-date-col">
                        <span className="dl-date-sublabel">To</span>
                        <input type="date" className="dl-date-input" value={dlTo} onChange={e => setDlTo(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div className="dl-count-pill">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    <span>{dlFilteredCount} screenshot{dlFilteredCount !== 1 ? 's' : ''} ready</span>
                  </div>

                  {dlProgress ? (
                    <div className="dl-progress-wrap">
                      <div className="dl-progress-track">
                        <div className="dl-progress-bar" style={{ width: `${Math.round((dlProgress.done / dlProgress.total) * 100)}%` }} />
                      </div>
                      <span className="dl-progress-label">{dlProgress.done} / {dlProgress.total} downloaded</span>
                    </div>
                  ) : (
                    <button className="dl-go-btn" onClick={handleDownload} disabled={!dlFilteredCount}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                      Download {dlFilteredCount > 0 ? `${dlFilteredCount} File${dlFilteredCount !== 1 ? 's' : ''}` : ''}
                    </button>
                  )}
                </div>
              )}
            </div>
            <button className={`ss-refresh-btn${spinning ? ' spinning' : ''}`} onClick={() => { setSpinning(true); onRefresh?.(); setLoadKey(k => k+1); setTimeout(() => setSpinning(false), 1000); }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              <span>Refresh</span>
            </button>
          </div>
        )}
      </div>

      {loading && <div className="no-data">Loading screenshots...</div>}
      {!loading && loadError && <div className="no-data">{loadError}</div>}

      {!loading && !loadError && employees.length > 0 && (
        <div className="saas-select-wrap">
          <button className={`saas-select-trigger ${dropOpen ? 'open' : ''}`} onClick={() => setDropOpen(o => !o)}>
            {selectedEmp === 'All' ? (
              <span className="saas-select-avatar ss-all-avatar"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            ) : (
              <span className="saas-select-avatar">{selectedEmp.charAt(0).toUpperCase()}</span>
            )}
            <span className="saas-select-name">{selectedEmp === 'All' ? 'All Employees' : selectedEmp}</span>
            {selectedEmp !== 'All' && <span className="ss-shot-count">{(shotsByEmp[selectedEmp] || []).length} shots</span>}
            <svg className="saas-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          {dropOpen && (
            <div className="saas-select-menu">
              <div className="saas-select-menu-header">Filter by Employee</div>
              {['All', ...employees].map(e => (
                <div key={e} className={`saas-select-option ${e === selectedEmp ? 'active' : ''}`} onClick={() => { setSelectedEmp(e); setDropOpen(false); }}>
                  {e === 'All' ? <span className="saas-select-option-avatar ss-all-avatar"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span> : <span className="saas-select-option-avatar">{e.charAt(0).toUpperCase()}</span>}
                  <span className="saas-select-option-name">{e === 'All' ? 'All Employees' : e}</span>
                  {e !== 'All' && <span className="ss-shot-count" style={{ marginLeft: 'auto' }}>{(shotsByEmp[e] || []).length} shots</span>}
                  {e === selectedEmp && <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {!loading && !loadError && allShots.length === 0 && (
        <ScreenshotEmptyState title="No Screenshots Yet" message="Trigger a screenshot or adjust filters to display recent captures." />
      )}

      {!loading && !loadError && allShots.length > 0 && (
        selectedEmp === 'All' ? (
          <div className="ss-grouped">
            {employees.filter(emp => filterByDate(shotsByEmp[emp] || []).length > 0).map(emp => (
              <div key={emp} className="ss-group">
                <div className="ss-group-header">
                  <span className="ss-group-avatar">{emp.charAt(0).toUpperCase()}</span>
                  <span className="ss-group-name">{emp}</span>
                  <span className="ss-shot-count">{filterByDate(shotsByEmp[emp] || []).length} shots</span>
                  <ShotBtn status={shotStatuses[emp] || 'idle'} onClick={() => triggerShot(emp)} offline={!onlineEmps.has(emp)} />
                </div>
                <div className="screenshot-grid">
                  {filterByDate(shotsByEmp[emp] || []).map(file => <ShotCard key={`${emp}-${file}`} emp={emp} file={file} />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="ss-group-header" style={{ marginBottom: '12px' }}>
              <span className="ss-group-avatar">{selectedEmp.charAt(0).toUpperCase()}</span>
              <span className="ss-group-name">{selectedEmp}</span>
              <span className="ss-shot-count">{allShots.length} shots</span>
              <ShotBtn status={shotStatuses[selectedEmp] || 'idle'} onClick={() => triggerShot(selectedEmp)} offline={!onlineEmps.has(selectedEmp)} />
            </div>
            <div className="screenshot-grid">
              {allShots.map(({ emp, file }) => <ShotCard key={`${emp}-${file}`} emp={emp} file={file} />)}
            </div>
          </div>
        )
      )}

      {lightbox && (
        <div className="lb-overlay" onClick={() => setLightbox(null)}>
          <div ref={lbContentRef} className="lb-content" onClick={e => e.stopPropagation()}>
            <div className="lb-toolbar">
              <button onClick={() => setZoom(p => Math.min(3, p + 0.2))}>+</button>
              <button onClick={() => setZoom(p => Math.max(0.4, p - 0.2))}>–</button>
              <button onClick={() => setZoom(1)}>Reset</button>
              <button onClick={() => { if (!document.fullscreenElement) lbContentRef.current?.requestFullscreen?.(); else document.exitFullscreen?.(); }}>{isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}</button>
              <button onClick={() => setLightbox(null)}>Close</button>
            </div>
            <div className="lb-image-wrap" onWheel={e => { e.preventDefault(); setZoom(p => Math.min(3, Math.max(0.4, p + (-e.deltaY / 300)))); }}>
              <img src={lightbox} className="lb-img" alt="screenshot" style={{ transform: `scale(${zoom})` }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
