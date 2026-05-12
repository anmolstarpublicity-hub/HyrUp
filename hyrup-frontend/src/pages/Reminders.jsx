import { useState } from 'react';
import './Reminders.css';

const PRIORITIES = ['Low', 'Medium', 'High'];

export default function Reminders({ reminders, setReminders, distractionAlerts = [], onClearDistraction, onClearAllDistractions, onReminderSaved, onReminderDeleted, onReminderDone, onBack }) {
  const [tab, setTab] = useState('reminders');
  const [form, setForm] = useState({ title: '', time: '', date: '', priority: 'Medium' });
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);

  const openAdd = () => { setEditId(null); setForm({ title: '', time: '', date: '', priority: 'Medium' }); setShowForm(true); };
  const openEdit = (r) => { setEditId(r.id); setForm({ title: r.title, time: r.time, date: r.date, priority: r.priority }); setShowForm(true); };

  const save = () => {
    if (!form.title.trim()) return;
    if (editId) setReminders(prev => prev.map(r => r.id === editId ? { ...r, ...form } : r));
    else setReminders(prev => [...prev, { ...form, id: Date.now(), done: false }]);
    setForm({ title: '', time: '', date: '', priority: 'Medium' });
    setShowForm(false); setEditId(null);
    onReminderSaved?.();
  };

  const cancel = () => { setShowForm(false); setEditId(null); };
  const toggle = (id) => { setReminders(prev => prev.map(r => r.id === id ? { ...r, done: !r.done } : r)); onReminderDone?.(); };
  const remove = (id) => { setReminders(prev => prev.filter(r => r.id !== id)); onReminderDeleted?.(); };

  const pending  = reminders.filter(r => !r.done);
  const done     = reminders.filter(r => r.done);
  const unreadAlerts = distractionAlerts.filter(a => !a.read).length;

  return (
    <div className="rem-page page-anim">
      <button className="back-btn" onClick={onBack}>
        <svg width="14" height="14" viewBox="0 0 1024 1024" fill="currentColor">
          <path d="M224 480h640a32 32 0 1 1 0 64H224a32 32 0 0 1 0-64z"/>
          <path d="m237.248 512 265.408 265.344a32 32 0 0 1-45.312 45.312l-288-288a32 32 0 0 1 0-45.312l288-288a32 32 0 1 1 45.312 45.312L237.248 512z"/>
        </svg>
        Back
      </button>
      {/* Header */}
      <div className="rem-header" style={{ marginTop: '1rem' }}>
        <div className="rem-header-left">
          <div className="rem-header-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
          </div>
          <div className="rem-header-text">
            <div className="rem-header-eyebrow">Monitoring Suite</div>
            <div className="rem-title">Reminders &amp; Alerts</div>
            <div className="rem-sub">Manage reminders and distraction notifications</div>
          </div>
        </div>
        <div className="rem-header-right">
          {tab === 'reminders' && (
            <>
              <div className="rem-stat-chip rem-stat-pending">
                <span className="rem-stat-dot" />
                <span className="rem-stat-num">{pending.length}</span>
                <span className="rem-stat-label">Pending</span>
              </div>
              <div className="rem-stat-chip rem-stat-done">
                <span className="rem-stat-num">{done.length}</span>
                <span className="rem-stat-label">Done</span>
              </div>
              <button className="rem-add-btn" onClick={openAdd}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                New Reminder
              </button>
            </>
          )}
          {tab === 'notifications' && distractionAlerts.length > 0 && (
            <button className="rem-cancel-btn" onClick={onClearAllDistractions}>Clear All</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="rem-tabs">
        <button className={`rem-tab${tab === 'reminders' ? ' rem-tab-active' : ''}`} onClick={() => setTab('reminders')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          Reminders
          {pending.length > 0 && <span className="rem-tab-badge">{pending.length}</span>}
        </button>
        <button className={`rem-tab${tab === 'notifications' ? ' rem-tab-active rem-tab-alert' : ''}`} onClick={() => setTab('notifications')}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
            <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
          </svg>
          Notifications
          {unreadAlerts > 0 && <span className="rem-tab-badge rem-tab-badge-red">{unreadAlerts}</span>}
        </button>
      </div>

      {/* ── REMINDERS TAB ── */}
      {tab === 'reminders' && (
        <>
          {showForm && (
            <div className="rem-form">
              <div className="rem-form-title">{editId ? 'Edit Reminder' : 'New Reminder'}</div>
              <input className="rem-input" placeholder="Reminder title…" value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                onKeyDown={e => e.key === 'Enter' && save()} autoFocus />
              <div className="rem-form-row">
                <input type="date" className="rem-input rem-input-sm" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
                <input type="time" className="rem-input rem-input-sm" value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
                <select className="rem-input rem-input-sm" value={form.priority}
                  onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                  {PRIORITIES.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div className="rem-form-actions">
                <button className="rem-cancel-btn" onClick={cancel}>Cancel</button>
                <button className="rem-save-btn" onClick={save}>{editId ? 'Save Changes' : 'Add Reminder'}</button>
              </div>
            </div>
          )}

          {pending.length > 0 && (
            <div className="rem-section">
              <div className="rem-section-label">Pending</div>
              {pending.map(r => <ReminderItem key={r.id} r={r} onToggle={toggle} onRemove={remove} onEdit={openEdit} />)}
            </div>
          )}

          {done.length > 0 && (
            <div className="rem-section">
              <div className="rem-section-label">Completed</div>
              {done.map(r => <ReminderItem key={r.id} r={r} onToggle={toggle} onRemove={remove} onEdit={openEdit} />)}
            </div>
          )}

          {reminders.length === 0 && (
            <div className="rem-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              <p>No reminders yet. Add one above!</p>
            </div>
          )}
        </>
      )}

      {/* ── NOTIFICATIONS TAB ── */}
      {tab === 'notifications' && (
        <>
          {distractionAlerts.length === 0 ? (
            <div className="rem-empty">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p>No distraction alerts yet.</p>
            </div>
          ) : (
            <div className="rem-section">
              <div className="rem-section-label">Distraction Alerts — {distractionAlerts.length} total</div>
              {distractionAlerts.map(a => (
                <div key={a.id} className={`rem-item rem-alert-item${a.read ? ' rem-item-done' : ''}`}>
                  <div className="rem-alert-dot" style={{ background: a.read ? '#9ca3af' : '#EF4444' }} />
                  <div className="rem-item-body">
                    <span className="rem-item-title">
                      <span className="rem-alert-emp">{a.employee}</span>
                      <span className="rem-alert-verb"> used </span>
                      <span className="rem-alert-app">{a.app}</span>
                    </span>
                    <div className="rem-item-meta">
                      <span className="rem-meta-chip">{a.timestamp}</span>
                      <span className="rem-badge rem-badge-high">Distraction</span>
                      {!a.read && <span className="rem-badge" style={{background:'rgba(239,68,68,0.1)',color:'#EF4444'}}>Unread</span>}
                    </div>
                  </div>
                  <div className="rem-item-actions">
                    <button className="rem-delete-btn" onClick={() => onClearDistraction(a.id)} title="Dismiss">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ReminderItem({ r, onToggle, onRemove, onEdit }) {
  const priorityClass = `rem-badge rem-badge-${r.priority.toLowerCase()}`;
  return (
    <div className={`rem-item${r.done ? ' rem-item-done' : ''}`}>
      <button className={`rem-check${r.done ? ' rem-check-done' : ''}`} onClick={() => onToggle(r.id)}>
        {r.done && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
        )}
      </button>
      <div className="rem-item-body">
        <span className="rem-item-title">{r.title}</span>
        <div className="rem-item-meta">
          {r.date && <span className="rem-meta-chip">{r.date}</span>}
          {r.time && <span className="rem-meta-chip">{r.time}</span>}
          <span className={priorityClass}>{r.priority}</span>
        </div>
      </div>
      <div className="rem-item-actions">
        <button className="rem-edit-btn" onClick={() => onEdit(r)} title="Edit">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button className="rem-delete-btn" onClick={() => onRemove(r.id)} title="Delete">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
