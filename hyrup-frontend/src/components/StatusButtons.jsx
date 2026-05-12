import './StatusButtons.css';

const CONFIG = {
  online: {
    label: 'Online Now',
    accent: '#10B981', accent2: '#059669',
    bg: 'rgba(16,185,129,0.08)', border: 'rgba(16,185,129,0.22)',
    shadow: 'rgba(16,185,129,0.18)', glow: 'rgba(16,185,129,0.12)',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>,
  },
  offline: {
    label: 'Offline',
    accent: '#F43F5E', accent2: '#E11D48',
    bg: 'rgba(244,63,94,0.07)', border: 'rgba(244,63,94,0.22)',
    shadow: 'rgba(244,63,94,0.18)', glow: 'rgba(244,63,94,0.12)',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64A9 9 0 0 1 20.77 15"/><path d="M6.16 6.16a9 9 0 1 0 12.68 12.68"/><line x1="2" y1="2" x2="22" y2="22"/></svg>,
  },
  total: {
    label: 'Total Team',
    accent: '#6366F1', accent2: '#4F46E5',
    bg: 'rgba(99,102,241,0.07)', border: 'rgba(99,102,241,0.2)',
    shadow: 'rgba(99,102,241,0.18)', glow: 'rgba(99,102,241,0.1)',
    icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
  },
};

export default function StatusButtons({ online, offline, total, filter, onFilter }) {
  const pctOnline  = total > 0 ? Math.round((online  / total) * 100) : 0;
  const pctOffline = total > 0 ? Math.round((offline / total) * 100) : 0;
  return (
    <div className="sb2-row">
      <StatusCard type="online"  count={online}  pct={60} active={filter === 'Online'}  onClick={() => onFilter('Online')}  />
      <StatusCard type="offline" count={offline} pct={60} active={filter === 'Offline'} onClick={() => onFilter('Offline')} />
      <StatusCard type="total"   count={total}   pct={60} active={filter === 'All'}     onClick={() => onFilter('All')}     />
    </div>
  );
}

function StatusCard({ type, count, pct, active, onClick }) {
  const c = CONFIG[type];
  return (
    <button
      className={`sb2-card sb2-${type}${active ? ' sb2-active' : ''}`}
      style={{ '--accent': c.accent, '--accent2': c.accent2, '--bg': c.bg, '--border': c.border, '--shadow': c.shadow, '--glow': c.glow }}
      onClick={onClick}
    >
      <div className="sb2-glow" />
      <div className="sb2-top">
        <div className="sb2-icon-wrap">{c.icon}</div>
        <div className={`sb2-status-pill${active ? ' sb2-pill-active' : ''}`}>
          {active ? <><span className="sb2-pill-dot" />Active</> : 'View'}
        </div>
      </div>
      <div className="sb2-count">{count}</div>
      <div className="sb2-label">{c.label}</div>
      <div className="sb2-bar-wrap">
        <div className="sb2-bar-track">
          <div className="sb2-bar-fill" style={{ width: `${active ? 100 : pct}%` }} />
        </div>
      </div>
    </button>
  );
}
