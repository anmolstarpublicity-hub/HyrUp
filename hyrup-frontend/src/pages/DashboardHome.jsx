import { useState, useMemo } from 'react';
import WelcomeBar from '../components/WelcomeBar';
import StatusButtons from '../components/StatusButtons';
import EmployeeCard from '../components/EmployeeCard';
import '../shared.css';
import './DashboardHome.css';

function EmptyState({ title = 'No data available', message = 'Adjust the filters or refresh to view current activity.' }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="dashboardEmptyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#14B8A6"/>
              <stop offset="100%" stopColor="#3B82F6"/>
            </linearGradient>
          </defs>
          <rect x="18" y="24" width="92" height="70" rx="18" fill="currentColor" opacity="0.08"/>
          <path d="M30 42H98" stroke="currentColor" strokeWidth="2" opacity="0.14" strokeLinecap="round"/>
          <path d="M30 58H54" stroke="currentColor" strokeWidth="2" opacity="0.14" strokeLinecap="round"/>
          <path d="M30 74H74" stroke="currentColor" strokeWidth="2" opacity="0.14" strokeLinecap="round"/>
          <path d="M42 80L54 68L66 76L88 58" stroke="url(#dashboardEmptyGradient)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
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

export default function DashboardHome({ data, dateRange, onSelectEmp, apiError, onRefresh }) {
  const [filter, setFilter] = useState('All');
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = () => {
    if (spinning) return;
    setSpinning(true);
    onRefresh?.();
    setTimeout(() => setSpinning(false), 1000);
  };

  const { allEmps, onlineList, offlineList, loginTimes, logoutTimes } = useMemo(() => {
    if (!data || data.length === 0) return { allEmps: [], onlineList: [], offlineList: [], loginTimes: {}, logoutTimes: {} };

    const buffer = new Date(Date.now() - 5 * 60 * 1000);
    const [sy, sm, sd] = dateRange.start.split('-').map(Number);
    const [ey, em, ed] = dateRange.end.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd, 0, 0, 0);
    const end   = new Date(ey, em - 1, ed, 23, 59, 59);

    const filtered = data.filter(r => {
      const t = new Date(r.Timestamp.replace(' ', 'T'));
      return t >= start && t <= end;
    });

    const allEmps = [...new Set(filtered.map(r => r['Employee Name']))].sort();
    const onlineList = [...new Set(
      filtered.filter(r => new Date(r.Timestamp.replace(' ', 'T')) > buffer).map(r => r['Employee Name'])
    )];
    const offlineList = allEmps.filter(e => !onlineList.includes(e));

    const loginTimes = {};
    const logoutTimes = {};
    allEmps.forEach(emp => {
      const empRows = filtered.filter(r => r['Employee Name'] === emp);
      const times = empRows.map(r => new Date(r.Timestamp));
      const minT = new Date(Math.min(...times));
      const maxT = new Date(Math.max(...times));
      loginTimes[emp] = minT.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
      logoutTimes[emp] = onlineList.includes(emp) ? '--' :
        maxT.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    });

    return { allEmps, onlineList, offlineList, loginTimes, logoutTimes };
  }, [data, dateRange]);

  const target = filter === 'Online' ? onlineList : filter === 'Offline' ? offlineList : allEmps;

  return (
    <div className="page-anim">
      <WelcomeBar />
      <div className="dash-header">
        <div className="dash-header-left">
          <div className="dash-title-row">
            <div className="dash-title-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
            </div>
            <div>
              <div className="dash-title">Admin Dashboard</div>
              <div className="dash-sub" style={{ marginLeft: 0, marginTop: '2px' }}>Real-time employee activity overview</div>
            </div>
          </div>
        </div>
        <div className="dash-header-right">
          <div className="dash-refresh-badge">
            <span className="dash-refresh-dot" />
            <span>Live</span>
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

      {apiError && (
        <div style={{
          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
          borderRadius: '10px', padding: '10px 16px', marginBottom: '1rem',
          color: '#EF4444', fontSize: '13px', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '8px'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {apiError}
        </div>
      )}

      <StatusButtons
        online={onlineList.length}
        offline={offlineList.length}
        total={allEmps.length}
        filter={filter}
        onFilter={setFilter}
      />

      {allEmps.length > 0 ? (
        <>
          <div className={`filter-label ${filter === 'Offline' ? 'fl-offline' : 'fl-online'}`}>
            {filter === 'Online' && (
              <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><path d="M9 12l2 2 4-4"/>
                </svg>
                Online Employees · {onlineList.length} members
              </span>
            )}
            {filter === 'Offline' && (
              <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
                </svg>
                Offline Employees · {offlineList.length} members
              </span>
            )}
            {filter === 'All' && (
              <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                Total Team · {allEmps.length} members
              </span>
            )}
          </div>

          {target.length === 0 ? (
            <EmptyState title="No employees in this category" message="Try another filter or expand the date range to show more team members." />
          ) : (
            <div className="emp-grid">
              {target.map(emp => (
                <EmployeeCard
                  key={emp}
                  emp={emp}
                  isOnline={onlineList.includes(emp)}
                  loginTime={loginTimes[emp]}
                  logoutTime={logoutTimes[emp]}
                  onClick={() => onSelectEmp(emp)}
                />
              ))}
            </div>
          )}
        </>
      ) : (
        <EmptyState title="No activity data found" message="Adjust the selected date range or refresh the dashboard to load recent activity." />
      )}
    </div>
  );
}
