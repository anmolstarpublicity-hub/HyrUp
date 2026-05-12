import './EmployeeCard.css';

export default function EmployeeCard({ emp, isOnline, loginTime, logoutTime, onClick }) {
  const initials = emp.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className={`ec-card ${isOnline ? 'ec-online' : 'ec-offline'}`} onClick={onClick}>
      <div className="ec-orb" />
      <div className="ec-top">
        <div className="ec-avatar">{initials}</div>
        <div className="ec-info">
          <div className="ec-name">{emp}</div>
          <div className={`ec-status-pill ${isOnline ? 'ec-pill-on' : 'ec-pill-off'}`}>
            <span className="ec-dot" />
            {isOnline ? 'Online' : 'Offline'}
          </div>
        </div>
        <div className="ec-arrow">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6"/>
          </svg>
        </div>
      </div>
      <div className="ec-footer">
        <div className="ec-time-block">
          <span className="ec-time-label">Login</span>
          <span className="ec-time-val">{loginTime || '--'}</span>
        </div>
        <div className="ec-divider" />
        <div className="ec-time-block">
          <span className="ec-time-label">Logout</span>
          <span className="ec-time-val" style={{ color: logoutTime === '--' ? '#10B981' : '#4f46e5' }}>
            {logoutTime === '--' ? 'Active' : logoutTime || '--'}
          </span>
        </div>
      </div>
    </div>
  );
}
