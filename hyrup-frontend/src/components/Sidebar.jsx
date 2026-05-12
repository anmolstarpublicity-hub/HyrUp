import { useState, useRef, useEffect } from 'react';
import './Sidebar.css';
import DatePicker from './DatePicker';

const NAV_ITEMS = [
  {
    key: 'Dashboard Home', label: 'Dashboard', color: '#008080',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
  },
  {
    key: 'Employee Insights', label: 'Employee Insights', color: '#008080',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
  },
  {
    key: 'App Analytics', label: 'App Analytics', color: '#008080',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
  },
  {
    key: 'Screenshots', label: 'Screenshots', color: '#008080',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
  },
  {
    key: 'Live Stream', label: 'Live Stream', color: '#EF4444',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10,8 16,12 10,16"/></svg>
  },
  {
    key: 'Delete Data', label: 'Delete Data', color: '#EF4444',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
  },

];

export default function Sidebar({ active, onNav, dateRange, onDateChange, onOpenChange, pendingCount = 0 }) {
  const [collapsed, setCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [typedText, setTypedText] = useState('');
  const timerRef = useRef(null);
  const fullText = 'HyrUp';

  useEffect(() => {
    let i = 0;
    setTypedText('');
    const type = () => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i));
        i++;
        timerRef.current = setTimeout(type, 120);
      }
    };
    timerRef.current = setTimeout(type, 500);
    return () => clearTimeout(timerRef.current);
  }, []);

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    onOpenChange?.(!next);
  };

  const toggleTheme = () => {
    const dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('hyrup-theme', dark ? 'dark' : 'light');
    setIsDark(dark);
  };

  useEffect(() => {
    const saved = localStorage.getItem('hyrup-theme');
    if (saved === 'dark') { document.documentElement.classList.add('dark'); setIsDark(true); }
  }, []);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <aside className={`sidebar${collapsed ? ' sb-collapsed' : ''}`}>
      <div className="sb-inner">

        {/* Header */}
        <div className="sb-header">
          <div className="sb-logo">
            <img src="/logo.png" alt="logo" className="sb-logo-img" />
          </div>
          <button className="sb-hamburger" onClick={toggle}>
            <span className="hbar" />
            <span className="hbar" />
            <span className="hbar" />
          </button>
        </div>

        {/* Scrollable middle */}
        <div className="sb-scroll">
          {/* Nav */}
          <nav className="sb-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.key}
                className={`sb-nav-btn${active === item.key ? ' sb-nav-active' : ''}`}
                style={{ '--nav-color': item.color }}
                onClick={() => onNav(item.key)}
                title={collapsed ? item.label : ''}
              >
                <span className="sb-nav-icon">{item.icon}</span>
                <span className="sb-nav-label">{item.label}</span>
                {active === item.key && <span className="sb-nav-bar" />}
              </button>
            ))}
          </nav>

          <hr className="sb-divider" />

          {/* Date filter */}
          <div className="sb-dates">
            <div className="sb-presets">
              {[
                { label: 'Today', days: 0 },
                { label: '2D',    days: 2 },
                { label: '7D',    days: 7 },
                { label: '30D',   days: 30 },
              ].map(({ label, days }) => {
                const getRange = () => {
                  const e = new Date(); e.setHours(0,0,0,0);
                  const s = new Date(e); s.setDate(s.getDate() - days);
                  const fmt = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
                  return { start: fmt(s), end: fmt(e) };
                };
                const range = getRange();
                const isActive = dateRange.start === range.start && dateRange.end === range.end;
                return (
                  <button key={label} className={`sb-preset-btn${isActive ? ' sb-preset-active' : ''}`}
                    onClick={() => onDateChange(range)}>{label}</button>
                );
              })}
            </div>
            <DatePicker label="From" value={dateRange.start} onChange={v => onDateChange({ ...dateRange, start: v })} />
            <DatePicker label="To"   value={dateRange.end}   onChange={v => onDateChange({ ...dateRange, end: v })} />
          </div>
        </div>

        {/* Footer with theme toggle */}
        <div className="sb-footer">
          <span className="sb-footer-version">v1.0.0</span>
          <button className={`sb-reminder-btn${active === 'Reminders' ? ' sb-reminder-active' : ''}${pendingCount > 0 ? ' sb-has-unread' : ''}`} title="Reminders" onClick={() => onNav('Reminders')}>
            <span className="sb-reminder-ring" />
            <svg className="sb-bell-icon" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            <span className="sb-reminder-label">Alerts</span>
            {pendingCount > 0 && <span className="sb-reminder-dot">{pendingCount > 9 ? '9+' : pendingCount}</span>}
          </button>
          <label id="theme-toggle-button" title={isDark ? 'Light mode' : 'Dark mode'}>
            <input id="toggle" type="checkbox" checked={isDark} onChange={toggleTheme} />
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 36">
              <g>
                <rect id="container" x="0" y="0" width="70" height="36" rx="18" ry="18" fill="#87CEEB"/>
                <g id="stars">
                  <circle cx="20" cy="10" r="1.5" fill="white"/>
                  <circle cx="30" cy="6" r="1" fill="white"/>
                  <circle cx="15" cy="18" r="1" fill="white"/>
                  <circle cx="40" cy="12" r="1.5" fill="white"/>
                  <circle cx="25" cy="20" r="1" fill="white"/>
                </g>
                <g id="cloud">
                  <circle cx="22" cy="22" r="6" fill="white"/>
                  <circle cx="30" cy="19" r="7" fill="white"/>
                  <circle cx="38" cy="22" r="5" fill="white"/>
                  <rect x="16" y="22" width="27" height="8" fill="white"/>
                </g>
                <g id="sun">
                  <circle cx="52" cy="18" r="8" fill="#FFD700"/>
                </g>
                <g id="moon">
                  <path d="M52 10 A8 8 0 1 0 52 26 A5 5 0 1 1 52 10" fill="#f5f3ce"/>
                </g>
                <circle id="button" cx="18" cy="18" r="10" fill="white" filter="url(#shadow)"/>
                <defs>
                  <filter id="shadow">
                    <feDropShadow dx="0" dy="1" stdDeviation="2" floodOpacity="0.3"/>
                  </filter>
                </defs>
              </g>
            </svg>
          </label>
        </div>

      </div>
    </aside>
  );
}
