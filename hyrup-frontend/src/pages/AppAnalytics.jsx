import { useMemo, useState, useCallback } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, Sector } from 'recharts';
import '../shared.css';
import './AppAnalytics.css';

const COLORS = ['#6366F1','#10B981','#F59E0B','#EF4444','#3B82F6','#8B5CF6','#EC4899','#14B8A6','#F97316','#84CC16'];
const TOP_N = 8;
const BREAK_LABELS = ['Morning Tea Break', 'Lunch Break', 'Evening Tea Break'];
const DISTRACTION_SITES = ['youtube','instagram','facebook','whatsapp','twitter','x.com','tiktok','snapchat','reddit','netflix'];
const isDistraction = name => DISTRACTION_SITES.some(s => String(name).toLowerCase().includes(s));

function formatTime(minutes) {
  const total = Math.round(minutes);
  if (total <= 0) return '0h 0m';
  return `${Math.floor(total / 60)}h ${total % 60}m`;
}

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0];
  return (
    <div style={{ background: 'linear-gradient(135deg,#1e1b4b,#2d2a6e)', border: '1px solid rgba(165,180,252,0.25)', borderRadius: 12, padding: '10px 16px', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
      <div style={{ color: 'rgba(165,180,252,0.7)', fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 }}>{d.name}</div>
      <div style={{ color: '#ffffff', fontSize: 18, fontWeight: 800 }}>{formatTime(d.value)}</div>
      {d.payload.percent != null && <div style={{ color: 'rgba(165,180,252,0.5)', fontSize: 11, marginTop: 2 }}>{(d.payload.percent * 100).toFixed(1)}% of total</div>}
    </div>
  );
};

const EmptyState = () => (
  <div className="empty-state">
    <div className="empty-state-icon">
      <svg viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="saasLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#14B8A6"/>
            <stop offset="100%" stopColor="#3B82F6"/>
          </linearGradient>
        </defs>

        <rect x="16" y="24" width="96" height="80" rx="20" fill="currentColor" opacity="0.08"/>
        <path d="M 36 80 L 52 60 L 72 70 L 92 46" stroke="url(#saasLogoGrad)" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="36" cy="80" r="6" fill="#14B8A6"/>
        <circle cx="52" cy="60" r="6" fill="#22C55E"/>
        <circle cx="72" cy="70" r="6" fill="#3B82F6"/>
        <circle cx="92" cy="46" r="6" fill="#A855F7"/>

        <g className="saas-pulse-ring">
          <circle cx="92" cy="46" r="10" stroke="#3B82F6" strokeWidth="1.5" fill="none" opacity="0.25"/>
          <circle cx="92" cy="46" r="16" stroke="#14B8A6" strokeWidth="1" fill="none" opacity="0.16"/>
        </g>

        <path d="M 32 36 L 40 36" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
        <path d="M 32 46 L 46 46" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
        <path d="M 32 56 L 44 56" stroke="currentColor" strokeWidth="2" opacity="0.3"/>
      </svg>
    </div>
    <h3 className="empty-state-title">No Data Available</h3>
    <p className="empty-state-message">Select a date range with activity to view analytics</p>
  </div>
);

export default function AppAnalytics({ data, dateRange, onBack }) {
  const [tab, setTab] = useState('pie');
  const [hiddenApps, setHiddenApps] = useState(new Set());
  const [showAll, setShowAll] = useState(false);
  const [activeIndex, setActiveIndex] = useState(null);

  const onPieEnter = useCallback((_, index) => setActiveIndex(index), []);
  const onPieLeave = useCallback(() => setActiveIndex(null), []);

  const { allAppData, kanbanColumns } = useMemo(() => {
    if (!data || data.length === 0) return { allAppData: [], kanbanColumns: [] };
    const [sy, sm, sd] = dateRange.start.split('-').map(Number);
    const [ey, em, ed] = dateRange.end.split('-').map(Number);
    const start = new Date(sy, sm - 1, sd, 0, 0, 0);
    const end   = new Date(ey, em - 1, ed, 23, 59, 59);
    const filtered = data.filter(r => {
      const t = new Date(r.Timestamp.replace(' ', 'T'));
      return t >= start && t <= end && r['Employee Name'] !== 'Employee Name';
    });

    const map = {};
    filtered.forEach(r => {
      const name = r['App/Website'] || 'Unknown';
      if (BREAK_LABELS.includes(name)) return;
      if (['idle', 'locked'].some(i => name.toLowerCase().includes(i))) return;
      map[name] = (map[name] || 0) + (parseFloat(r.Duration) || 1);
    });
    const allAppData = Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);

    const empAppMap = {};
    filtered.forEach(r => {
      const emp = r['Employee Name'];
      const app = r['App/Website'] || 'Unknown';
      if (BREAK_LABELS.includes(app)) return;
      if (['idle', 'locked'].some(i => app.toLowerCase().includes(i))) return;
      if (!empAppMap[emp]) empAppMap[emp] = {};
      empAppMap[emp][app] = (empAppMap[emp][app] || 0) + (parseFloat(r.Duration) || 1);
    });
    const kanbanColumns = Object.entries(empAppMap).map(([emp, apps]) => {
      const cards = Object.entries(apps)
        .map(([app, mins]) => ({ app, mins, time: formatTime(mins) }))
        .sort((a, b) => b.mins - a.mins);
      const total = cards.reduce((s, c) => s + c.mins, 0);
      return { emp, cards, total, totalTime: formatTime(total) };
    }).sort((a, b) => b.total - a.total);

    return { allAppData, kanbanColumns };
  }, [data, dateRange]);

  const toggleApp   = name => setHiddenApps(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n; });
  const hideAll     = () => setHiddenApps(new Set(allAppData.map(a => a.name)));
  const showAllApps = () => setHiddenApps(new Set());
  const hideOthers  = () => setHiddenApps(prev => { const n = new Set(prev); allAppData.slice(TOP_N).forEach(a => n.add(a.name)); return n; });

  const visibleData = allAppData.filter(a => !hiddenApps.has(a.name));
  const topData = visibleData.slice(0, TOP_N);
  const othersValue = visibleData.slice(TOP_N).reduce((s, a) => s + a.value, 0);
  const pieData = othersValue > 0 ? [...topData, { name: 'Others', value: othersValue }] : topData;

  const barData = visibleData.slice(0, 10).map(a => ({
    name: a.name.length > 20 ? a.name.slice(0, 20) + '…' : a.name,
    minutes: Math.round(a.value),
    value: Math.round(a.value),
    label: formatTime(a.value),
  }));

  const displayedApps = showAll ? allAppData : allAppData.slice(0, 15);

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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#008080" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
              </svg>
            </div>
            <div className="dash-title">Resource Intelligence</div>
          </div>
          <div className="dash-sub">Application and website usage analytics</div>
        </div>

      </div>

      <div className={`analytics-layout${tab === 'breakdown' ? ' layout-kanban' : ''}`}>
        {tab !== 'breakdown' && (
        <div className="app-list-card">
          <div className="app-list-header">
            <span className="app-list-title">Applications</span>
            <div className="app-list-header-right">
              <span className="app-list-count">{allAppData.length}</span>
              <button className="app-toggle-all-btn" onClick={showAllApps} title="Select all">All</button>
              <button className="app-toggle-all-btn app-toggle-all-btn--off" onClick={hideOthers} title="Deselect others">−Others</button>
            </div>
          </div>
          <div className="app-list-body">
            {displayedApps.map((a, i) => (
              <div key={a.name} className={`app-list-item${hiddenApps.has(a.name) ? ' app-hidden' : ''}`} onClick={() => toggleApp(a.name)}>
                <span className="app-color-dot" style={{ background: i < TOP_N ? COLORS[i % COLORS.length] : '#d1d5db' }} />
                <span className="app-item-name">{a.name}</span>
                <span className="app-item-time">{formatTime(a.value)}</span>
                <span className={`app-toggle-icon${hiddenApps.has(a.name) ? ' toggled-off' : ''}`}>
                  {hiddenApps.has(a.name)
                    ? <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="8" y1="12" x2="16" y2="12"/></svg>
                    : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                  }
                </span>
              </div>
            ))}
            {allAppData.length > 15 && (
              <button className="show-more-btn" onClick={() => setShowAll(s => !s)}>
                {showAll ? 'Show less ↑' : `+${allAppData.length - 15} more`}
              </button>
            )}
          </div>
        </div>
        )}

        {/* Chart area */}
        <div className="analytics-tabs">
          <div className="tab-bar">
            <button className={`tab-btn${tab === 'pie' ? ' tab-active' : ''}`} onClick={() => setTab('pie')}>Pie Chart</button>
            <button className={`tab-btn${tab === 'bar' ? ' tab-active' : ''}`} onClick={() => setTab('bar')}>Bar Chart</button>
            <button className={`tab-btn${tab === 'breakdown' ? ' tab-active' : ''}`} onClick={() => setTab('breakdown')}>User Breakdown</button>
          </div>

          {tab === 'pie' && (
            <div className="chart-box">
              <div className="chart-header">
                <div className="chart-title">Top {Math.min(TOP_N, visibleData.length)} Apps {othersValue > 0 ? '+ Others' : ''}</div>
                <div className="chart-hint">Rest grouped as "Others"</div>
              </div>
              {pieData.length === 0
                ? <EmptyState />
                : <ResponsiveContainer width="100%" height={360}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" innerRadius={80} outerRadius={140}
                        dataKey="value" nameKey="name" paddingAngle={2}
                        animationBegin={0} animationDuration={700}
                        onMouseEnter={onPieEnter} onMouseLeave={onPieLeave}
                        activeIndex={activeIndex}
                        activeShape={(props) => {
                          const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
                          return (
                            <g>
                              <defs>
                                <filter id="pie-glow" x="-20%" y="-20%" width="140%" height="140%">
                                  <feGaussianBlur stdDeviation="5" result="coloredBlur"/>
                                  <feMerge><feMergeNode in="coloredBlur"/><feMergeNode in="SourceGraphic"/></feMerge>
                                </filter>
                              </defs>
                              <Sector cx={cx} cy={cy}
                                innerRadius={innerRadius - 4}
                                outerRadius={outerRadius + 12}
                                startAngle={startAngle} endAngle={endAngle}
                                fill={fill}
                                style={{ filter: `drop-shadow(0 0 10px ${fill})`, transition: 'all 0.2s ease' }}
                              />
                            </g>
                          );
                        }}
                      >
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.name === 'Others' ? '#e5e7eb' : COLORS[i % COLORS.length]} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend formatter={v => <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{v}</span>} iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
              }
            </div>
          )}

          {tab === 'bar' && (
            <div className="chart-box">
              <div className="chart-header">
                <div className="chart-title">Top 10 by Usage</div>
                <div className="chart-hint">Hours spent per application</div>
              </div>
              {barData.length === 0
                ? <EmptyState />
                : <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={barData} layout="vertical" margin={{ top: 5, right: 70, left: 10, bottom: 5 }} barSize={16}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,128,128,0.12)" horizontal={false} />
                      <XAxis type="number" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v / 60).toFixed(1)}h`} />
                      <YAxis type="category" dataKey="name" tick={{ fill: 'var(--text)', fontSize: 11 }} axisLine={false} tickLine={false} width={140} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(99,102,241,0.05)' }} />
                      <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                        {barData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
              }
            </div>
          )}

          {tab === 'breakdown' && (
            <div className="kanban-board">
              {kanbanColumns.length === 0 ? (
                <div style={{ width: '100%' }}><EmptyState /></div>
              ) : kanbanColumns.map((col, ci) => (
                <div key={col.emp} className="kanban-col">
                  <div className="kanban-col-header">
                    <div className="kanban-avatar" style={{ background: `${COLORS[ci % COLORS.length]}22`, color: COLORS[ci % COLORS.length] }}>
                      {col.emp.charAt(0).toUpperCase()}
                    </div>
                    <div className="kanban-col-info">
                      <div className="kanban-col-name">{col.emp}</div>
                      <div className="kanban-col-total">{col.totalTime} total</div>
                    </div>
                    <span className="kanban-col-count">{col.cards.length}</span>
                  </div>
                  <div className="kanban-cards">
                    {col.cards.map((card, i) => {
                      const pct = Math.round((card.mins / col.total) * 100);
                      const distract = isDistraction(card.app);
                      const color = distract ? '#EF4444' : COLORS[i % COLORS.length];
                      return (
                        <div key={card.app} className={`kanban-card${distract ? ' kanban-card-distract' : ''}`}>
                          <div className="kanban-card-top">
                            <span className="kanban-card-app">
                              {distract && <span className="distraction-badge">⚠ Distraction</span>}
                              {card.app}
                            </span>
                            <span className="kanban-card-time" style={{ color }}>{card.time}</span>
                          </div>
                          <div className="kanban-bar-track">
                            <div className="kanban-bar-fill" style={{ width: `${pct}%`, background: color }} />
                          </div>
                          <div className="kanban-card-pct" style={{ color: distract ? '#EF4444' : '#9ca3af' }}>{pct}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
