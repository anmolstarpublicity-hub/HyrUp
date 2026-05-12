import { useState, useRef, useEffect } from 'react';
import './DatePicker.css';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export default function DatePicker({ label, value, onChange }) {
  const [open, setOpen] = useState(false);
  const [calStyle, setCalStyle] = useState({});
  const [openUp, setOpenUp] = useState(false);
  const [viewDate, setViewDate] = useState(() => value ? new Date(value) : new Date());
  const ref = useRef(null);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (value) setViewDate(new Date(value));
  }, [value]);

  const handleOpen = () => {
    if (!open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const calH = 300;
      const spaceBelow = window.innerHeight - rect.bottom;
      const up = spaceBelow < calH;
      setOpenUp(up);
      setCalStyle({
        left: rect.left,
        width: rect.width,
        ...(up
          ? { bottom: window.innerHeight - rect.top + 8 }
          : { top: rect.bottom + 8 }
        ),
      });
    }
    setOpen(o => !o);
  };

  const selected = value ? new Date(value) : null;
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const selectDay = (d) => {
    if (!d) return;
    const date = new Date(year, month, d);
    const str = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    onChange(str);
    setOpen(false);
  };

  const prevMonth = () => setViewDate(new Date(year, month - 1, 1));
  const nextMonth = () => setViewDate(new Date(year, month + 1, 1));

  const isSelected = (d) => {
    if (!d || !selected) return false;
    return selected.getFullYear() === year && selected.getMonth() === month && selected.getDate() === d;
  };
  const isToday = (d) => {
    if (!d) return false;
    const t = new Date();
    return t.getFullYear() === year && t.getMonth() === month && t.getDate() === d;
  };

  const displayValue = selected
    ? selected.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Select date';

  return (
    <div className="dp-wrap" ref={ref}>
      <div className="dp-label">{label}</div>
      <button className={`dp-trigger${open ? ' dp-open' : ''}`} onClick={handleOpen} type="button">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span>{displayValue}</span>
        <svg className="dp-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {open && (
        <div className={`dp-calendar${openUp ? ' dp-calendar-up' : ''}`} style={calStyle}>
          <div className="dp-cal-header">
            <button className="dp-nav-btn" onClick={prevMonth} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span className="dp-month-label">{MONTHS[month]} {year}</span>
            <button className="dp-nav-btn" onClick={nextMonth} type="button">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>

          <div className="dp-day-names">
            {DAYS.map(d => <span key={d} className="dp-day-name">{d}</span>)}
          </div>

          <div className="dp-grid">
            {cells.map((d, i) => (
              <button
                key={i}
                type="button"
                className={`dp-cell${!d ? ' dp-empty' : ''}${isSelected(d) ? ' dp-selected' : ''}${isToday(d) && !isSelected(d) ? ' dp-today' : ''}`}
                onClick={() => selectDay(d)}
                disabled={!d}
              >
                {d || ''}
              </button>
            ))}
          </div>

          <div className="dp-footer">
            <button className="dp-today-btn" type="button" onClick={() => {
              const t = new Date();
              const str = `${t.getFullYear()}-${String(t.getMonth()+1).padStart(2,'0')}-${String(t.getDate()).padStart(2,'0')}`;
              onChange(str);
              setOpen(false);
            }}>Today</button>
          </div>
        </div>
      )}
    </div>
  );
}
