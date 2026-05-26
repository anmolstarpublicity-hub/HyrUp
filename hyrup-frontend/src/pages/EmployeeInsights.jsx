import { useMemo, useState, useEffect } from 'react';
import React from 'react';
import JSZip from 'jszip';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import '../shared.css';
import './EmployeeInsights.css';

const API_KEY = import.meta.env.VITE_API_KEY || '';

function EmptyState({ title = 'No data available', message = 'Update filters or select a different employee to view logs.' }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="insightsEmptyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14B8A6"/>
              <stop offset="100%" stopColor="#3B82F6"/>
            </linearGradient>
          </defs>
          <rect x="18" y="24" width="92" height="70" rx="18" fill="currentColor" opacity="0.08"/>
          <path d="M30 42H98" stroke="currentColor" strokeWidth="2" opacity="0.14" strokeLinecap="round"/>
          <path d="M30 58H54" stroke="currentColor" strokeWidth="2" opacity="0.14" strokeLinecap="round"/>
          <path d="M30 74H74" stroke="currentColor" strokeWidth="2" opacity="0.14" strokeLinecap="round"/>
          <path d="M42 80L54 68L66 76L88 58" stroke="url(#insightsEmptyGradient)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="42" cy="80" r="4.5" fill="#14B8A6"/>
          <circle cx="54" cy="68" r="4.5" fill="#3B82F6"/>
          <circle cx="66" cy="76" r="4.5" fill="#A855F7"/>
          <circle cx="88" cy="58" r="4.5" fill="#F59E0B"/>
          <circle className="empty-state-ring" cx="88" cy="58" r="10" stroke="#3B82F6" strokeWidth="1.5" fill="none" opacity="0.28"/>
        </svg>
      </div>
      <h3 className="empty-state-title">{title}</h3>
      <p className="empty-state-message">{message}</p>
    </div>
  );
}

// ── Download helpers ──────────────────────────────────────────
function toCSV(rows, headers) {
  return [
    headers.join(','),
    ...rows.map(r => headers.map(h => `"${String(r[h] ?? '').replace(/"/g, '""')}"`).join(','))
  ].join('\n');
}

function DownloadBtn({ appData, webData, breakData, selected, dateRange, metrics }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const panelRef = React.useRef(null);

  const hasData = (appData?.length || 0) + (webData?.length || 0) + (breakData?.length || 0) > 0;

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  if (!hasData) return null;

  // ── Build date label for filenames ───────────────────────────
  const dateLabel = dateRange
    ? dateRange.start === dateRange.end
      ? dateRange.start
      : `${dateRange.start}_to_${dateRange.end}`
    : 'all_dates';

  const empLabel = (selected || 'Employee').replace(/ /g, '_');
  const zipName  = `HyrUp_Insights_${empLabel}_${dateLabel}.zip`;

  const handleDownload = async (format) => {
    setLoading(true);
    setOpen(false);

    if (format === 'zip') {
      const zip = new JSZip();

      // ── Software CSV ──────────────────────────────────────
      if (appData.length) {
        const headers = ['Employee', 'Type', 'Application', 'Time_Spent'];
        const rows = appData.map(r => ({ Employee: selected, Type: 'Software', Application: r.name, Time_Spent: r.time }));
        zip.file(`${empLabel}_Software_${dateLabel}.csv`, toCSV(rows, headers));
      }

      // ── Website CSV ───────────────────────────────────────
      if (webData.length) {
        const headers = ['Employee', 'Type', 'Website', 'Time_Spent', 'Distraction'];
        const rows = webData.map(r => ({ Employee: selected, Type: 'Website', Website: r.name, Time_Spent: r.time, Distraction: r.distraction ? 'Yes' : 'No' }));
        zip.file(`${empLabel}_Websites_${dateLabel}.csv`, toCSV(rows, headers));
      }

      // ── Break CSV ─────────────────────────────────────────
      if (breakData.length) {
        const headers = ['Employee', 'Type', 'Break', 'Time_Spent'];
        const rows = breakData.map(r => ({ Employee: selected, Type: 'Break', Break: r.name, Time_Spent: r.time }));
        zip.file(`${empLabel}_Breaks_${dateLabel}.csv`, toCSV(rows, headers));
      }

      // ── Summary CSV ───────────────────────────────────────
      if (metrics) {
        const headers = ['Employee', 'Date_Range', 'Login', 'Logout', 'Work_Time', 'Idle_Time', 'Break_Time', 'Efficiency'];
        const rows = [{
          Employee:   selected,
          Date_Range: dateLabel.replace(/_/g, ' '),
          Login:      metrics.loginStr,
          Logout:     metrics.logoutStr,
          Work_Time:  metrics.workTime,
          Idle_Time:  metrics.idleTime,
          Break_Time: metrics.breakTime,
          Efficiency: `${metrics.efficiency}%`,
        }];
        zip.file(`${empLabel}_Summary_${dateLabel}.csv`, toCSV(rows, headers));
      }

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = zipName;
      a.click();
      URL.revokeObjectURL(a.href);

    } else {
      // ── Single combined CSV ───────────────────────────────
      const headers = ['Employee', 'Date_Range', 'Type', 'Name', 'Time_Spent', 'Distraction'];
      const rows = [
        ...appData.map(r  => ({ Employee: selected, Date_Range: dateLabel.replace(/_/g,' '), Type: 'Software', Name: r.name,  Time_Spent: r.time, Distraction: '' })),
        ...webData.map(r  => ({ Employee: selected, Date_Range: dateLabel.replace(/_/g,' '), Type: 'Website',  Name: r.name,  Time_Spent: r.time, Distraction: r.distraction ? 'Yes' : 'No' })),
        ...breakData.map(r => ({ Employee: selected, Date_Range: dateLabel.replace(/_/g,' '), Type: 'Break',    Name: r.name,  Time_Spent: r.time, Distraction: '' })),
      ];
      const csv  = toCSV(rows, headers);
      const blob = new Blob([csv], { type: 'text/csv' });
      const a    = document.createElement('a');
      a.href     = URL.createObjectURL(blob);
      a.download = `HyrUp_Insights_${empLabel}_${dateLabel}.csv`;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    setLoading(false);
  };

  return (
    <div style={{ position: 'relative' }}>
      <button className="dl-btn" onClick={() => setOpen(o => !o)} disabled={loading}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        {loading ? 'Preparing...' : 'Download Logs'}
      </button>

      {open && (
        <div className="ins-dl-panel" ref={panelRef}>
          <div className="ins-dl-header">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span>Download Logs</span>
          </div>

          <div className="ins-dl-meta">
            <span className="ins-dl-emp">
              <span className="ins-dl-avatar">{(selected || '?').charAt(0).toUpperCase()}</span>
              {selected}
            </span>
            <span className="ins-dl-date">{dateLabel.replace(/_/g, ' ')}</span>
          </div>

          <div className="ins-dl-options">
            <button className="ins-dl-opt" onClick={() => handleDownload('zip')}>
              <div className="ins-dl-opt-icon ins-dl-opt-icon--zip">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="7 10 12 15 17 10"/>
                  <line x1="12" y1="15" x2="12" y2="3"/>
                </svg>
              </div>
              <div className="ins-dl-opt-text">
                <span className="ins-dl-opt-title">ZIP Archive</span>
                <span className="ins-dl-opt-sub">Separate CSVs for Software, Websites, Breaks + Summary</span>
              </div>
              <span className="ins-dl-opt-badge">Recommended</span>
            </button>

            <button className="ins-dl-opt" onClick={() => handleDownload('csv')}>
              <div className="ins-dl-opt-icon ins-dl-opt-icon--csv">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                  <polyline points="14 2 14 8 20 8"/>
                  <line x1="16" y1="13" x2="8" y2="13"/>
                  <line x1="16" y1="17" x2="8" y2="17"/>
                  <polyline points="10 9 9 9 8 9"/>
                </svg>
              </div>
              <div className="ins-dl-opt-text">
                <span className="ins-dl-opt-title">Single CSV</span>
                <span className="ins-dl-opt-sub">All logs combined in one file</span>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const BREAK_LABELS = ['Morning Tea Break', 'Lunch Break', 'Evening Tea Break'];
const isBreak = (name) => BREAK_LABELS.includes(String(name));
const BREAK_ICONS = { 'Morning Tea Break': '☕', 'Lunch Break': '🍽️', 'Evening Tea Break': '🍵' };
const DISTRACTION_SITES = ['youtube', 'instagram', 'facebook', 'whatsapp', 'twitter', 'x.com', 'tiktok', 'snapchat', 'reddit', 'netflix'];
const isDistraction = (name) => DISTRACTION_SITES.some(s => String(name).toLowerCase().includes(s));

function formatTime(minutes) {
  const total = Math.round(minutes);
  if (total <= 0) return '0h 0m';
  return `${Math.floor(total / 60)}h ${total % 60}m`;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e1b4b, #2d2a6e)',
      border: '1px solid rgba(165,180,252,0.25)',
      borderRadius: 12, padding: '10px 16px',
      boxShadow: '0 8px 24px rgba(0,0,0,0.3)'
    }}>
      <div style={{ color: 'rgba(165,180,252,0.7)', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>{d.name}</div>
      <div style={{ color: '#ffffff', fontSize: 20, fontWeight: 800, lineHeight: 1 }}>{d.label}</div>
      <div style={{ color: 'rgba(165,180,252,0.5)', fontSize: 11, marginTop: 3 }}>{d.minutes} minutes total</div>
    </div>
  );
};

const CustomBar = (props) => {
  const { x, y, width, height, fill } = props;
  const [hovered, setHovered] = React.useState(false);
  return (
    <g>
      <defs>
        <linearGradient id={`grad-${fill.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fill} stopOpacity={hovered ? 1 : 0.9} />
          <stop offset="100%" stopColor={fill} stopOpacity={hovered ? 0.7 : 0.5} />
        </linearGradient>
        <filter id={`glow-${fill.replace('#','')}`}>
          <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
          <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect
        x={x} y={hovered ? y - 6 : y}
        width={width} height={hovered ? height + 6 : height}
        rx={10} ry={10}
        fill={`url(#grad-${fill.replace('#','')})`}
        filter={hovered ? `url(#glow-${fill.replace('#','')})` : undefined}
        style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      />

    </g>
  );
};

function ExpandableRow({ name, time, distraction, isBreakRow }) {
  const [expanded, setExpanded] = useState(false);
  const [truncated, setTruncated] = useState(false);
  const nameRef = React.useRef(null);

  useEffect(() => {
    if (nameRef.current)
      setTruncated(nameRef.current.scrollWidth > nameRef.current.clientWidth);
  }, [name]);

  return (
    <>
      <tr
        className={`log-row ${distraction ? 'distraction-row' : ''} ${isBreakRow ? 'break-row' : ''} ${expanded ? 'log-row-active' : ''}`}
        onClick={() => truncated && setExpanded(e => !e)}
        style={{ cursor: truncated ? 'pointer' : 'default' }}
      >
        <td>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isBreakRow && <span style={{ fontSize: 14 }}>{BREAK_ICONS[name] || '☕'}</span>}
            {distraction && <span className="distraction-badge">⚠ Distraction</span>}
            {isBreakRow && <span className="break-badge">Break</span>}
            <span ref={nameRef} className="log-app-name" style={{ flex: 1 }}>{name}</span>
            {truncated && (
              <span className={`log-chevron ${expanded ? 'open' : ''}`}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
              </span>
            )}
          </div>
        </td>
        <td className={distraction ? 'distraction-time' : isBreakRow ? 'break-time' : ''}>
          <span className="log-time-pill">{time}</span>
        </td>
      </tr>
      {truncated && expanded && (
        <tr className="log-expand-row">
          <td colSpan={2}>
            <div className="log-expand-panel">
              <div className="log-expand-label">Show less</div>
              <div className="log-expand-value">{name}</div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

export default function EmployeeInsights({ data, dateRange, selectedEmp, onBack }) {
  const allEmps = useMemo(() => {
    if (!data || data.length === 0) return [];
    return [...new Set(data.map(r => r['Employee Name']))]
      .filter(e => e && e !== 'Employee Name')
      .sort();
  }, [data]);

  const [selected,   setSelected]   = useState(selectedEmp || '');
  const [dropOpen,   setDropOpen]   = useState(false);
  const [selRows,    setSelRows]    = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [deleting,   setDeleting]   = useState(false);
  const [delResult,  setDelResult]  = useState(null);
  // Track if user manually picked from dropdown
  const userPickedRef = React.useRef(false);

  const toggleRow = (name) => setSelRows(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  const clearSel  = () => { setSelRows(new Set()); setSelectMode(false); setDelResult(null); };

  const handleDeleteRows = async () => {
    if (!selRows.size) return;
    setDeleting(true);
    try {
      const names = [...selRows];
      const res = await fetch('/api/activity/delete/byname', {
        method: 'POST',
        headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ employee: selected, names, date_start: dateRange.start, date_end: dateRange.end })
      });
      if (res.ok) setDelResult({ success: true, msg: `Deleted ${selRows.size} entries` });
      else setDelResult({ success: false, msg: 'Delete failed' });
    } catch { setDelResult({ success: false, msg: 'Error connecting to API' }); }
    setDeleting(false);
    clearSel();
  };

  useEffect(() => {
    if (userPickedRef.current) return;
    if (selectedEmp) setSelected(selectedEmp);
    else if (allEmps.length > 0 && !selected) setSelected(allEmps[0]);
  }, [selectedEmp, allEmps]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return;
    const handler = (e) => {
      if (!e.target.closest('.saas-select-wrap')) setDropOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropOpen]);

  const { workMins, idleMins, breakMins, loginStr, logoutStr, appData, webData, breakData } = useMemo(() => {
    if (!data || !selected) return { workMins: 0, idleMins: 0, breakMins: 0, loginStr: '--', logoutStr: '--', appData: [], webData: [], breakData: [] };

    const [sy, sm, sd] = dateRange.start.split('-').map(Number);
    const [ey, em, ed] = dateRange.end.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd, 0, 0, 0);
    const end   = new Date(ey, em - 1, ed, 23, 59, 59);
    const buffer = new Date(Date.now() - 2 * 60 * 1000);

    const empRows = data.filter(r => {
      const t = new Date(r.Timestamp.replace(' ', 'T'));
      return r['Employee Name'] === selected && t >= start && t <= end;
    });

    if (empRows.length === 0) return { workMins: 0, idleMins: 0, breakMins: 0, loginStr: '--', logoutStr: '--', appData: [], webData: [], breakData: [] };

    const isIdleRow  = r => ['idle', 'locked', 'unknown'].some(i => String(r['App/Website']).toLowerCase() === i || String(r['App/Website']).toLowerCase().includes(i));
    const isBreakRow = r => isBreak(r['App/Website']);

    const workMins  = empRows.filter(r => !isIdleRow(r) && !isBreakRow(r)).reduce((s, r) => s + (parseFloat(r.Duration) || 0), 0);
    const idleMins  = empRows.filter(r => isIdleRow(r)).reduce((s, r) => s + (parseFloat(r.Duration) || 0), 0);
    const breakMins = empRows.filter(r => isBreakRow(r)).reduce((s, r) => s + (parseFloat(r.Duration) || 0), 0);

    const times = empRows.map(r => new Date(r.Timestamp));
    const minT = new Date(Math.min(...times));
    const maxT = new Date(Math.max(...times));
    const isOnline = maxT > buffer;

    const fmt = t => t.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const loginStr  = fmt(minT);
    const logoutStr = isOnline ? 'Online' : fmt(maxT);

    const browsers = ['chrome', 'edge', 'firefox', 'brave'];
    const apps = {}, webs = {}, breaks = {}, appIds = {}, webIds = {};
    empRows.filter(r => !isIdleRow(r)).forEach(r => {
      const v   = String(r['App/Website']).toLowerCase();
      const dur = parseFloat(r.Duration) || 0;
      if (isBreakRow(r)) {
        breaks[r['App/Website']] = (breaks[r['App/Website']] || 0) + dur;
        return;
      }
      const isWeb = browsers.some(b => v.includes(b)) || v.includes('.com');
      const name  = isWeb ? (r['App/Website'].split(' - ')[0] || r['App/Website']).trim() : r['App/Website'];
      if (isWeb) { webs[name] = (webs[name] || 0) + dur; if (!webIds[name]) webIds[name] = r.id; }
      else { apps[name] = (apps[name] || 0) + dur; if (!appIds[name]) appIds[name] = r.id; }
    });

    const sortDesc = obj => Object.entries(obj).sort((a, b) => b[1] - a[1]);

    return {
      workMins, idleMins, breakMins, loginStr, logoutStr,
      appData:   sortDesc(apps).map(([n, d])   => ({ name: n, time: formatTime(d), mins: d, id: appIds[n] })),
      webData:   sortDesc(webs).map(([n, d])   => ({ name: n, time: formatTime(d), mins: d, distraction: isDistraction(n), id: webIds[n] })),
      breakData: sortDesc(breaks).map(([n, d]) => ({ name: n, time: formatTime(d), mins: d })),
    };
  }, [data, selected, dateRange]);

  const efficiency = workMins + idleMins > 0 ? Math.round((workMins / (workMins + idleMins)) * 100) : 0;
  const chartData = [
    { name: 'Work',  minutes: Math.round(workMins),  label: formatTime(workMins),  color: '#6366F1' },
    { name: 'Break', minutes: Math.round(breakMins), label: formatTime(breakMins), color: '#F59E0B' },
    { name: 'Idle',  minutes: Math.round(idleMins),  label: formatTime(idleMins),  color: '#EF4444' },
  ];

  return (
    <div className="page-anim">
      <button className="back-btn" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 1024 1024" fill="currentColor">
          <path d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"/>
          <path d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"/>
        </svg>
        <span>Back</span>
      </button>

      <div className="dash-header" style={{ marginTop: '1rem' }}>
        <div className="dash-header-left">
          <div className="dash-title-row">
            <div className="dash-title-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
              </svg>
            </div>
            <div className="dash-title">Performance Profile</div>
          </div>
          <div className="dash-sub">Individual employee activity breakdown</div>
        </div>
        <div className="dash-header-right">
          <DownloadBtn
            appData={appData}
            webData={webData}
            breakData={breakData}
            selected={selected}
            dateRange={dateRange}
            metrics={{
              loginStr,
              logoutStr,
              workTime:  formatTime(workMins),
              idleTime:  formatTime(idleMins),
              breakTime: formatTime(breakMins),
              efficiency,
            }}
          />
        </div>
      </div>

      <div className="insights-toolbar">
        <div className="saas-select-wrap">
          <button className={`saas-select-trigger ${dropOpen ? 'open' : ''}`} onClick={() => setDropOpen(o => !o)}>
            <span className="saas-select-avatar">{selected ? selected.charAt(0).toUpperCase() : '?'}</span>
            <span className="saas-select-name">{selected || 'Select Employee'}</span>
            <svg className="saas-select-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          </button>
          {dropOpen && (
            <div className="saas-select-menu">
              <div className="saas-select-menu-header">Team Members</div>
              {allEmps.map(e => (
                <div
                  key={e}
                  className={`saas-select-option ${e === selected ? 'active' : ''}`}
                  onClick={() => { userPickedRef.current = true; setSelected(e); setDropOpen(false); }}
                >
                  <span className="saas-select-option-avatar">{e.charAt(0).toUpperCase()}</span>
                  <span className="saas-select-option-name">{e}</span>
                  {e === selected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:'auto'}}>
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="metrics-row">
        <div className="metric-card mc-session">
          <div className="metric-label">
            <span className="metric-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12,6 12,12 16,14"/>
              </svg>
            </span>
            <span>Session Time</span>
          </div>
          <div className="session-times">
            <div>
              <div className="st-sub" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
                <span>Login</span>
              </div>
              <div className="st-val">{loginStr}</div>
            </div>
            <div className="st-arrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14"/>
                <path d="M12 5l7 7-7 7"/>
              </svg>
            </div>
            <div>
              <div className="st-sub" style={{display: 'flex', alignItems: 'center', gap: '4px'}}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
                  <polyline points="16,17 21,12 16,7"/>
                  <line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
                <span>Logout</span>
              </div>
              <div className="st-val" style={{ color: logoutStr === 'Online' ? '#10B981' : undefined }}>{logoutStr}</div>
            </div>
          </div>
        </div>
        <div className="metric-card mc-work">
          <div className="metric-label">
            <span className="metric-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
            </span>
            <span>Work Time</span>
          </div>
          <div className="metric-val" style={{ color: '#2563eb' }}>{formatTime(workMins)}</div>
        </div>
        <div className="metric-card mc-idle">
          <div className="metric-label">
            <span className="metric-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8h1a4 4 0 0 1 0 8h-1"/>
                <path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/>
                <line x1="6" y1="1" x2="6" y2="4"/>
                <line x1="10" y1="1" x2="10" y2="4"/>
                <line x1="14" y1="1" x2="14" y2="4"/>
              </svg>
            </span>
            <span>Idle Time</span>
          </div>
          <div className="metric-val" style={{ color: '#EF4444' }}>{formatTime(idleMins)}</div>
        </div>
        <div className={`metric-card mc-efficiency${efficiency < 40 ? ' eff-bad' : efficiency < 70 ? ' eff-warn' : ''}`}>
          <div className="metric-label">
            <span className="metric-icon">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="13,2 3,14 12,14 11,22 21,10 12,10 13,2"/>
              </svg>
            </span>
            <span>Efficiency</span>
          </div>
          <div className="metric-val" style={{ color: efficiency >= 70 ? '#10B981' : efficiency >= 40 ? '#F59E0B' : '#EF4444' }}>{efficiency}%</div>
        </div>
      </div>

      <div className="chart-box">
        <div className="chart-header">
          <div className="chart-title">Activity Breakdown</div>
          <div className="chart-legend">
            <span className="chart-legend-item"><span style={{background:'#6366F1'}} className="chart-legend-dot"/>Work</span>
            <span className="chart-legend-item"><span style={{background:'#F59E0B'}} className="chart-legend-dot"/>Break</span>
            <span className="chart-legend-item"><span style={{background:'#EF4444'}} className="chart-legend-dot"/>Idle</span>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 10 }} barSize={80} barGap={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.35)" vertical={false} />
            <XAxis dataKey="name" tick={{ fill: 'var(--text-muted)', fontSize: 13, fontWeight: 600 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/60).toFixed(1)}h`} />
            <Tooltip content={<CustomTooltip />} cursor={false} />
            <Bar dataKey="minutes" shape={<CustomBar />} radius={[10,10,0,0]}>
              {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {breakData.length > 0 && (
        <div className="log-box">
          <div className="log-box-header">
            <div className="log-title"><span className="log-title-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"/><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg></span> Break Logs</div>
            <span className="log-count" style={{ color: '#D97706', background: 'rgba(245,158,11,0.1)', borderColor: 'rgba(245,158,11,0.25)' }}>{breakData.length} breaks</span>
          </div>
          <table className="log-table">
            <thead><tr><th>Break</th><th>Time</th></tr></thead>
            <tbody>{breakData.map((r, i) => <ExpandableRow key={i} name={r.name} time={r.time} isBreakRow={true} />)}</tbody>
          </table>
        </div>
      )}

      <div className="logs-row">
        <div className="log-box">
          <div className="log-box-header">
            <div className="log-title"><span className="log-title-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8"/><line x1="12" y1="17" x2="12" y2="21"/></svg></span> Software Logs</div>
            <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
              <span className="log-count">{appData.length} apps</span>
              {!selectMode ? (
                <button className="dl-btn" onClick={() => setSelectMode(true)}>Select</button>
              ) : (
                <>
                  <button className="dl-btn" style={{background:'#EF4444',color:'#fff',borderColor:'#EF4444'}} onClick={handleDeleteRows} disabled={!selRows.size||deleting}>{deleting?'Deleting...':`Delete (${selRows.size})`}</button>
                  <button className="dl-btn" onClick={clearSel}>Cancel</button>
                </>
              )}
            </div>
          </div>
          {delResult && <div style={{padding:'8px 16px',fontSize:12,color:delResult.success?'#059669':'#DC2626'}}>{delResult.msg}</div>}
          {appData.length === 0
            ? <EmptyState title="No app data" message="Select a different employee or refresh to load software activity." />
            : <table className="log-table">
                <thead><tr>{selectMode && <th style={{width:32}}></th>}<th>Application</th><th>Time</th></tr></thead>
                <tbody>{appData.map((r, i) => (
                  selectMode ? (
                    <tr key={i} className={`log-row${selRows.has(r.name)?' log-row-active':''}`}
                      style={{cursor:'pointer'}}
                      onClick={() => toggleRow(r.name)}>
                      <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selRows.has(r.name)} onChange={() => toggleRow(r.name)} /></td>
                      <td><span className="log-app-name">{r.name}</span></td>
                      <td><span className="log-time-pill">{r.time}</span></td>
                    </tr>
                  ) : (
                    <ExpandableRow key={i} name={r.name} time={r.time} />
                  )
                ))}</tbody>
              </table>
          }
        </div>
        <div className="log-box">
          <div className="log-box-header">
            <div className="log-title"><span className="log-title-icon"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></span> Website Logs</div>
            <span className="log-count">{webData.length} sites</span>
          </div>
          {webData.length === 0
            ? <EmptyState title="No website data" message="Switch to a different date range or employee to view website activity." />
            : <table className="log-table">
                <thead><tr>{selectMode && <th style={{width:32}}></th>}<th>Website</th><th>Time</th></tr></thead>
                <tbody>{webData.map((r, i) => (
                  selectMode ? (
                    <tr key={i} className={`log-row${r.distraction?' distraction-row':''}${selRows.has(r.name)?' log-row-active':''}`}
                      style={{cursor:'pointer'}}
                      onClick={() => toggleRow(r.name)}>
                      <td onClick={e => e.stopPropagation()}><input type="checkbox" checked={selRows.has(r.name)} onChange={() => toggleRow(r.name)} /></td>
                      <td>{r.distraction && <span className="distraction-badge">⚠ Distraction</span>}<span className="log-app-name">{r.name}</span></td>
                      <td><span className="log-time-pill">{r.time}</span></td>
                    </tr>
                  ) : (
                    <ExpandableRow key={i} name={r.name} time={r.time} distraction={r.distraction} />
                  )
                ))}</tbody>
              </table>
          }
        </div>
      </div>
    </div>
  );
}
