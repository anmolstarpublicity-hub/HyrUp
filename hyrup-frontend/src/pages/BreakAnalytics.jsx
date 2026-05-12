import { useMemo } from 'react';
import '../shared.css';
import './BreakAnalytics.css';

const SCHEDULED_BREAKS = [
  { label: 'Morning Tea Break', start: '11:00', end: '11:10' },
  { label: 'Lunch Break',       start: '14:00', end: '14:30' },
  { label: 'Evening Tea Break', start: '16:00', end: '16:10' },
];

function toMins(h, m) { return h * 60 + m; }
function parseMins(str) { const [h, m] = str.split(':').map(Number); return toMins(h, m); }
function fmtMins(m) { return m < 1 ? '< 1m' : `${Math.floor(m)}m`; }
function fmtTime(str) {
  const [h, m] = str.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${ampm}`;
}

export default function BreakAnalytics({ data, dateRange }) {
  const filtered = useMemo(() => {
    if (!data?.length) return [];
    return data.filter(r => {
      const d = (r.Date || r.Timestamp?.split(' ')[0] || '');
      return d >= dateRange.start && d <= dateRange.end;
    });
  }, [data, dateRange]);

  const employees = useMemo(() => [...new Set(filtered.map(r => r['Employee Name']))].sort(), [filtered]);

  // Per-employee, per-break stats
  const stats = useMemo(() => {
    return employees.map(emp => {
      const rows = filtered.filter(r => r['Employee Name'] === emp);
      const breaks = SCHEDULED_BREAKS.map(brk => {
        const bRows = rows.filter(r => r['App/Website'] === brk.label);
        const allocMins = parseMins(brk.end) - parseMins(brk.start);

        // Calculate actual break time from timestamp span, not Duration sum
        // Each row = 1 minute logged, so span = (last - first) + 1 min
        let takenMins = 0;
        if (bRows.length > 0) {
          const times = bRows.map(r => new Date(r.Timestamp.replace(' ', 'T')).getTime()).filter(t => !isNaN(t));
          if (times.length > 0) {
            const spanMs = Math.max(...times) - Math.min(...times);
            takenMins = Math.round(spanMs / 60000) + 1;
          }
        }
        // worked during break = rows whose timestamp falls in break window but NOT labeled as break
        const workedRows = rows.filter(r => {
          if (r['App/Website'] === brk.label) return false;
          const ts = r.Timestamp || '';
          const timePart = ts.split(' ')[1] || '';
          if (!timePart) return false;
          const [hh, mm] = timePart.split(':').map(Number);
          const t = toMins(hh, mm);
          return t >= parseMins(brk.start) && t < parseMins(brk.end);
        });
        const workedMins = workedRows.reduce((s, r) => s + parseFloat(r.Duration || 0), 0);
        return { ...brk, takenMins, workedMins, allocMins };
      });
      return { emp, breaks };
    });
  }, [employees, filtered]);

  const breakIcons = {
    'Morning Tea Break': '☕',
    'Lunch Break': '🍽️',
    'Evening Tea Break': '🍵',
  };

  return (
    <div className="page-anim">
      <div className="dash-header">
        <div className="dash-header-left">
          <div className="dash-title-row">
            <div className="dash-title-icon">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div className="dash-title">Break Analytics</div>
          </div>
          <div className="dash-sub">Scheduled break compliance per employee</div>
        </div>
      </div>

      {/* Scheduled break windows info */}
      <div className="ba-schedule-row">
        {SCHEDULED_BREAKS.map(brk => (
          <div className="ba-schedule-card" key={brk.label}>
            <span className="ba-schedule-icon">{breakIcons[brk.label]}</span>
            <div>
              <div className="ba-schedule-label">{brk.label}</div>
              <div className="ba-schedule-time">{fmtTime(brk.start)} – {fmtTime(brk.end)}</div>
            </div>
            <span className="ba-schedule-dur">{parseMins(brk.end) - parseMins(brk.start)} min</span>
          </div>
        ))}
      </div>

      {!filtered.length && (
        <div className="no-data">No data for selected date range.</div>
      )}

      {stats.map(({ emp, breaks }) => (
        <div className="ba-emp-block" key={emp}>
          <div className="ba-emp-header">
            <span className="ba-emp-avatar">{emp.charAt(0).toUpperCase()}</span>
            <span className="ba-emp-name">{emp}</span>
          </div>
          <div className="ba-breaks-grid">
            {breaks.map(brk => {
              const pct = Math.min(100, brk.allocMins > 0 ? Math.round((brk.takenMins / brk.allocMins) * 100) : 0);
              const worked = brk.workedMins > 0;
              return (
                <div className="ba-break-card" key={brk.label}>
                  <div className="ba-break-top">
                    <span className="ba-break-icon">{breakIcons[brk.label]}</span>
                    <div>
                      <div className="ba-break-name">{brk.label}</div>
                      <div className="ba-break-window">{fmtTime(brk.start)} – {fmtTime(brk.end)}</div>
                    </div>
                  </div>
                  <div className="ba-break-stats">
                    <div className="ba-stat">
                      <span className="ba-stat-label">Break Taken</span>
                      <span className="ba-stat-val">{fmtMins(brk.takenMins)}</span>
                    </div>
                    <div className="ba-stat">
                      <span className="ba-stat-label">Allocated</span>
                      <span className="ba-stat-val">{fmtMins(brk.allocMins)}</span>
                    </div>
                    <div className="ba-stat">
                      <span className="ba-stat-label">Worked During</span>
                      <span className={`ba-stat-val ${worked ? 'ba-worked' : ''}`}>{fmtMins(brk.workedMins)}</span>
                    </div>
                  </div>
                  <div className="ba-bar-wrap">
                    <div className="ba-bar-track">
                      <div className="ba-bar-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="ba-bar-pct">{pct}%</span>
                  </div>
                  {worked && (
                    <div className="ba-worked-badge">⚡ Worked during break</div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
