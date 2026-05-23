import { useState, useEffect, useRef } from 'react';
import Sidebar from './components/Sidebar';
import DashboardHome from './pages/DashboardHome';
import EmployeeInsights from './pages/EmployeeInsights';
import AppAnalytics from './pages/AppAnalytics';
import Screenshots from './pages/Screenshots';
import LiveStream from './pages/LiveStream';
import DeleteData from './pages/DeleteData';
import Reminders from './pages/Reminders';
import Login from './pages/Login';
import './index.css';
import './shared.css';
import './App.css';

const PRIORITY_COLOR = { High: '#EF4444', Medium: '#F59E0B', Low: '#10B981' };
const PRIORITY_BG    = { High: 'rgba(239,68,68,0.1)', Medium: 'rgba(245,158,11,0.1)', Low: 'rgba(16,185,129,0.1)' };

function useRelativeTime(createdAt) {
  const [label, setLabel] = useState('just now');
  useEffect(() => {
    const update = () => {
      const secs = Math.floor((Date.now() - createdAt) / 1000);
      if (secs < 60) setLabel('just now');
      else if (secs < 3600) setLabel(`${Math.floor(secs / 60)}m ago`);
      else setLabel(`${Math.floor(secs / 3600)}h ago`);
    };
    update();
    const iv = setInterval(update, 30000);
    return () => clearInterval(iv);
  }, [createdAt]);
  return label;
}

function ToastCard({ t, onDismiss, onView, onMarkRead }) {
  const timeLabel = useRelativeTime(t.createdAt);
  const color = PRIORITY_COLOR[t.priority] || '#008080';
  const bg    = PRIORITY_BG[t.priority]    || 'rgba(0,128,128,0.1)';
  const cardRef = useRef(null);
  const isReminder = t.source !== 'distraction' && t.source !== 'system';

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const t1 = setTimeout(() => el.classList.add('nt-shake-once'), 50);
    return () => clearTimeout(t1);
  }, []);

  // Non-reminder toasts auto-dismiss after 4s
  useEffect(() => {
    if (isReminder) return;
    const timer = setTimeout(() => onDismiss(t.id), 4000);
    return () => clearTimeout(timer);
  }, [t.id, onDismiss, isReminder]);

  // Simple notification — just message + auto dismiss
  if (!isReminder) {
    return (
      <div className="nt-card nt-card--simple" ref={cardRef}>
        <div className="nt-progress" style={{ background: color }} />
        <div className="nt-body">
          <div className="nt-row-top">
            <div className="nt-avatar" style={{ background: bg, color }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <p className="nt-title" style={{ flex: 1, margin: 0 }}>{t.title}</p>
            <button className="nt-close" onClick={() => onDismiss(t.id)}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Reminder toast — stays until acted on, has View + Mark as Read
  return (
    <div className="nt-card" ref={cardRef}>
      <div className="nt-progress" style={{ background: color }} />
      <div className="nt-body">
        <div className="nt-row-top">
          <div className="nt-avatar" style={{ background: bg, color }}>
            <svg className="nt-bell" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div className="nt-meta">
            <span className="nt-source">{t.source === 'break' ? 'Break Reminder' : 'Reminder'}</span>
            <span className="nt-dot" />
            <span className="nt-time">{timeLabel}</span>
          </div>
          <button className="nt-close" onClick={() => onDismiss(t.id)}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <p className="nt-title">{t.title}</p>
        <div className="nt-actions">
          <button className="nt-action-btn nt-action-view" onClick={() => { onView(); onDismiss(t.id); }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            View
          </button>
          <button className="nt-action-btn nt-action-read" onClick={() => { onMarkRead(t.id); onDismiss(t.id); }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            Mark as Read
          </button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toasts, onDismiss, onView, onMarkRead }) {
  if (!toasts.length) return null;
  return (
    <div className="toast-stack">
      {toasts.map(t => (
        <ToastCard key={t.id} t={t} onDismiss={onDismiss} onView={onView} onMarkRead={onMarkRead} />
      ))}
    </div>
  );
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL || window.location.origin;
const BACKEND_CONFIGURED = !!(import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_URL);
const API_KEY = import.meta.env.VITE_API_KEY || '';
const API_KEY_CONFIGURED = !!API_KEY;
const apiFetch = (url, opts = {}) => {
  const fullUrl = url.startsWith('http') ? url : `${BACKEND_URL}${url}`;
  return fetch(fullUrl, {
    ...opts,
    headers: { 'X-API-Key': API_KEY, ...(opts.headers || {}) },
  });
};

const DISTRACTION_SITES = ['youtube', 'instagram', 'facebook', 'whatsapp', 'twitter', 'x.com', 'tiktok', 'snapchat', 'reddit', 'netflix'];
const isDistraction = (name) => DISTRACTION_SITES.some(s => String(name).toLowerCase().includes(s));

export default function App() {
  const localToday = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  };
  const today = localToday();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nav, setNav] = useState('Dashboard Home');
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [data, setData] = useState([]);
  const [apiError, setApiError] = useState(null);
  const [dateRange, setDateRange] = useState({ start: today, end: today });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [refreshTick, setRefreshTick] = useState(0);
  const [reminders, setReminders] = useState([]);
  const remindersLoadedRef = useRef(false);
  const [distractionAlerts, setDistractionAlerts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('hyrup-distraction-alerts') || '[]'); } catch { return []; }
  });
  const firedDistractionRef = useRef(new Set([
    ...JSON.parse(localStorage.getItem('hyrup-distraction-alerts') || '[]').map(a => a.id),
    ...JSON.parse(localStorage.getItem('hyrup-fired-distractions') || '[]'),
  ]));
  const [toasts, setToasts] = useState([]);
  const firedRef = useRef(new Set());
  const toastsLoadedRef = useRef(false);

  // Load toasts and fired state from Supabase on mount
  useEffect(() => {
    apiFetch('/api/notifications')
      .then(r => r.ok ? r.json() : [])
      .then(rows => {
        if (Array.isArray(rows) && rows.length > 0)
          setToasts(rows.map(r => ({ id: r.notification_id, title: r.title, priority: r.priority, createdAt: r.created_at, source: r.source || '' })));
        toastsLoadedRef.current = true;
      })
      .catch(() => { toastsLoadedRef.current = true; });
    apiFetch('/api/notifications/fired')
      .then(r => r.ok ? r.json() : [])
      .then(rows => {
        rows.forEach(r => {
          if (r.key === 'reminders' && Array.isArray(r.ids)) r.ids.forEach(id => firedRef.current.add(id));
        });
      })
      .catch(() => {});
  }, []);

  const persistToasts = (updated) => {
    localStorage.setItem('hyrup-toasts', JSON.stringify(updated));
    apiFetch('/api/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated.map(t => ({ notification_id: String(t.id), title: t.title, priority: t.priority, created_at: t.createdAt, source: t.source || '' }))),
    }).catch(() => {});
  };

  const persistFired = () => {
    const ids = [...firedRef.current];
    localStorage.setItem('hyrup-fired-reminders', JSON.stringify(ids));
    apiFetch('/api/notifications/fired', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'reminders', ids }),
    }).catch(() => {});
  };

  // Load reminders from API on mount
  useEffect(() => {
    apiFetch('/api/reminders')
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setReminders(data);
        } else {
          // fallback defaults if table is empty
          setReminders([
            { id: 1, title: 'Review weekly activity report', time: '09:00', date: '', priority: 'High', done: false },
            { id: 2, title: 'Check employee screenshots', time: '11:30', date: '', priority: 'Medium', done: false },
            { id: 3, title: 'Update monitoring schedule', time: '14:00', date: '', priority: 'Low', done: true },
          ]);
        }
        remindersLoadedRef.current = true;
      })
      .catch(() => { remindersLoadedRef.current = true; });
  }, []);

  // Save reminders to API whenever they change (skip first render before load)
  useEffect(() => {
    if (!remindersLoadedRef.current) return;
    apiFetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(reminders),
    }).catch(() => {});
    localStorage.setItem('hyrup-reminders', JSON.stringify(reminders));
  }, [reminders]);

  useEffect(() => {
    if (!toastsLoadedRef.current) return;
    persistToasts(toasts);
  }, [toasts]);

  // Restore firedRef from done reminders so already-fired ones don't re-fire
  useEffect(() => {
    reminders.forEach(r => { if (r.done) firedRef.current.add(r.id); });
  }, []);

  // Request browser notification permission once
  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  // Break time reminders
  useEffect(() => {
    const BREAKS = [
      { id: 'break_morning_tea', time: '11:00', title: '☕ Morning Tea Break — Time for a 10 minute break!', priority: 'Medium' },
      { id: 'break_lunch',       time: '14:00', title: '🍽️ Lunch Break — Time for your 30 minute lunch!',   priority: 'Medium' },
      { id: 'break_evening_tea', time: '16:00', title: '🍵 Evening Tea Break — Time for a 10 minute break!', priority: 'Medium' },
    ];
    const todayKey = () => new Date().toISOString().split('T')[0];
    const storageKey = `hyrup-fired-breaks-${todayKey()}`;
    const firedBreaks = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));
    const check = () => {
      const now = new Date();
      // Reset fired breaks if it's a new day
      const key = `hyrup-fired-breaks-${todayKey()}`;
      const pad = n => String(n).padStart(2, '0');
      const nowTime = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      BREAKS.forEach(b => {
        if (b.time !== nowTime || firedBreaks.has(b.id)) return;
        firedBreaks.add(b.id);
        localStorage.setItem(key, JSON.stringify([...firedBreaks]));
        setToasts(prev => [...prev, { id: b.id + '_' + todayKey(), title: b.title, priority: b.priority, createdAt: Date.now(), source: 'break' }]);
        if (Notification.permission === 'granted') {
          new Notification('HyrUp — Break Time', { body: b.title, icon: '/favicon.svg' });
        }
      });
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, []);

  // Check reminders every 30s
  useEffect(() => {
    const check = () => {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      const todayStr = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
      const nowTime  = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
      reminders.forEach(r => {
        if (r.done || firedRef.current.has(r.id)) return;
        const dateMatch = !r.date || r.date === todayStr;
        const timeMatch = r.time && r.time === nowTime;
        if (dateMatch && timeMatch) {
          firedRef.current.add(r.id);
          persistFired();
          setToasts(prev => {
            const updated = [...prev, { ...r, createdAt: Date.now() }];
            return updated;
          });
          if (Notification.permission === 'granted') {
            new Notification('HyrUp Reminder', { body: r.title, icon: '/favicon.svg' });
          }
        }
      });
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [reminders]);

  // Distraction detection — check data every 30s, fire only once per unique event
  useEffect(() => {
    const check = () => {
      if (!data || data.length === 0) return;
      const now = new Date();
      const cutoff = new Date(now.getTime() - 2 * 60 * 1000);
      data.forEach(r => {
        const app = String(r['App/Website'] || '');
        if (!isDistraction(app)) return;
        const ts = new Date(r.Timestamp.replace(' ', 'T'));
        if (ts < cutoff) return;
        const alertId = `${r['Employee Name']}_${app}_${r.Timestamp}`;
        if (firedDistractionRef.current.has(alertId)) return;
        firedDistractionRef.current.add(alertId);
        // Persist fired IDs so they don't re-fire after refresh
        localStorage.setItem('hyrup-fired-distractions', JSON.stringify([...firedDistractionRef.current]));
        const alert = {
          id: alertId,
          employee: r['Employee Name'],
          app,
          timestamp: r.Timestamp,
          createdAt: Date.now(),
          priority: 'High',
          read: false,
        };
        setDistractionAlerts(prev => {
          const updated = [alert, ...prev].slice(0, 50);
          localStorage.setItem('hyrup-distraction-alerts', JSON.stringify(updated));
          return updated;
        });
        const msg = `⚠ ${r['Employee Name']} is using ${app}`;
        setToasts(prev => [...prev, { id: alertId, title: msg, priority: 'High', createdAt: Date.now(), source: 'distraction' }]);
        if (Notification.permission === 'granted') {
          new Notification('HyrUp — Distraction Alert', { body: msg, icon: '/favicon.svg' });
        }
      });
    };
    check();
    const iv = setInterval(check, 30000);
    return () => clearInterval(iv);
  }, [data]);

  const dismissToast = (id) => setToasts(prev => prev.filter(t => t.id !== id));
  const pendingCount = reminders.filter(r => !r.done).length + distractionAlerts.filter(a => !a.read).length;

  useEffect(() => {
    const saved = localStorage.getItem('hyrup-theme') || 'light';
    if (saved === 'dark') document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('hyrup-theme', isDark ? 'dark' : 'light');
  };

  useEffect(() => {
    let retryTimeout = null;
    const load = (isRetry = false) => {
      apiFetch(`/api/activity?start=${dateRange.start}&end=${dateRange.end}`)
        .then(r => {
          if (!r.ok) throw new Error(String(r.status));
          return r.json();
        })
        .then(rows => {
          const parsed = rows
            .filter(r => r['Employee Name'] && r['Timestamp'])
            .map(r => ({
              'Timestamp':     String(r['Timestamp']     || '').trim(),
              'Date':          String(r['Date']          || '').trim(),
              'Employee Name': String(r['Employee Name'] || '').trim(),
              'App/Website':   String(r['App/Website']   || '').trim(),
              'Duration':      String(r['Duration']      || '1').trim(),
            }));
          setData(parsed);
          setApiError(null);
        })
        .catch(err => {
          const msg = String(err.message || '');
          if (msg === '401') setApiError('API key mismatch - VITE_API_KEY does not match HYRUP_API_KEY on the server.');
          else if (msg === '403') setApiError('Forbidden - check HYRUP_API_KEY.');
          else {
            setApiError('Cannot connect to API - make sure central_api.py is running on port 5001.');
            // auto-retry every 3s until connected
            retryTimeout = setTimeout(() => load(true), 3000);
          }
        });
    };
    // small initial delay so API has time to start
    const initDelay = setTimeout(() => load(), 1500);
    const interval = setInterval(() => load(), 10000);
    return () => {
      clearTimeout(initDelay);
      clearTimeout(retryTimeout);
      clearInterval(interval);
    };
  }, [refreshTick, dateRange]);

  const handleSelectEmp = (emp) => {
    setSelectedEmp(emp);
    setNav('Employee Insights');
  };

  if (!isLoggedIn) {
    return <Login onLogin={() => setIsLoggedIn(true)} />;
  }

  return (
    <div className="app-layout">
      {(!BACKEND_CONFIGURED || !API_KEY_CONFIGURED) && (
        <div className="app-warning-bar" style={{ padding: '12px', background: '#FEE2E2', color: '#991B1B', textAlign: 'center' }}>
          {!BACKEND_CONFIGURED && <span>VITE_BACKEND_URL or VITE_API_URL is not configured. </span>}
          {!API_KEY_CONFIGURED && <span>VITE_API_KEY is not configured. </span>}
          <strong>Set the missing env values in Vercel and redeploy.</strong>
        </div>
      )}
      <Sidebar
        active={nav}
        onNav={setNav}
        dateRange={dateRange}
        onDateChange={setDateRange}
        onOpenChange={v => setSidebarOpen(v)}
        onToggleTheme={toggleTheme}
        pendingCount={pendingCount}
      />
      <Toast
        toasts={toasts}
        onDismiss={dismissToast}
        onView={() => setNav('Reminders')}
        onMarkRead={id => setReminders(prev => prev.map(r => r.id === id ? { ...r, done: true } : r))}
      />
      <main className={`main-content${sidebarOpen ? '' : ' main-expanded'}`}>
        {nav === 'Dashboard Home' && (
          <DashboardHome data={data} dateRange={dateRange} onSelectEmp={handleSelectEmp} apiError={apiError} onRefresh={() => setRefreshTick(t => t + 1)} />
        )}
        {nav === 'Employee Insights' && (
          <EmployeeInsights data={data} dateRange={dateRange} selectedEmp={selectedEmp} onBack={() => setNav('Dashboard Home')} />
        )}
        {nav === 'App Analytics' && (
          <AppAnalytics data={data} dateRange={dateRange} onBack={() => setNav('Dashboard Home')} />
        )}
        {nav === 'Screenshots' && (
          <Screenshots onBack={() => setNav('Dashboard Home')} dateRange={dateRange} data={data} onRefresh={() => setRefreshTick(t => t + 1)} />
        )}
        {nav === 'Live Stream' && (
          <LiveStream data={data} />
        )}
        {nav === 'Delete Data' && (
          <DeleteData
            onBack={() => setNav('Dashboard Home')}
            dateRange={dateRange}
            onNotify={(msg, priority = 'High') =>
              setToasts(prev => [...prev, { id: Date.now(), title: msg, priority, createdAt: Date.now(), source: 'system' }])
            }
          />
        )}
        {nav === 'Reminders' && <Reminders reminders={reminders} setReminders={setReminders} distractionAlerts={distractionAlerts}
          onBack={() => setNav('Dashboard Home')}
          onClearDistraction={id => {
            setDistractionAlerts(prev => {
              const u = prev.filter(a => a.id !== id);
              localStorage.setItem('hyrup-distraction-alerts', JSON.stringify(u));
              return u;
            });
          }}
          onClearAllDistractions={() => {
            setDistractionAlerts([]);
            localStorage.setItem('hyrup-distraction-alerts', '[]');
          }}
          onReminderSaved={() => setToasts(prev => [...prev, { id: Date.now(), title: '✅ Reminder saved successfully', priority: 'Low', createdAt: Date.now(), source: 'system' }])}
          onReminderDeleted={() => setToasts(prev => [...prev, { id: Date.now(), title: '🗑️ Reminder deleted', priority: 'Medium', createdAt: Date.now(), source: 'system' }])}
          onReminderDone={() => setToasts(prev => [...prev, { id: Date.now(), title: '✅ Reminder marked as done', priority: 'Low', createdAt: Date.now(), source: 'system' }])}
        />}
      </main>
    </div>
  );
}
