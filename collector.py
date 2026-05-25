import time, os, csv, threading, signal, sys, atexit, io as _io, base64
from datetime import datetime

try:
    import pygetwindow as gw
    _HAS_GW = True
except Exception as e:
    _HAS_GW = False
    print(f'[HyrUp] pygetwindow not available: {e}')

try:
    from pynput import mouse, keyboard
    _HAS_INPUT = True
except Exception as e:
    _HAS_INPUT = False
    print(f'[HyrUp] pynput not available: {e}')

try:
    from PIL import ImageGrab
    _HAS_PIL = True
except Exception as e:
    _HAS_PIL = False
    print(f'[HyrUp] Pillow not available: {e}')

try:
    from supabase import create_client
    _HAS_SUPABASE = True
except Exception as e:
    _HAS_SUPABASE = False
    print(f'[HyrUp] supabase not available: {e}')

try:
    import socketio as _sio_lib
    _HAS_SIO = True
except Exception as e:
    _HAS_SIO = False
    print(f'[HyrUp] python-socketio not available: {e}')

# Load .env for local development — Railway/production sets env vars directly
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# ── Supabase Config ───────────────────────────────────────────
SUPABASE_URL  = os.environ.get('SUPABASE_URL', '')
SUPABASE_KEY  = os.environ.get('SUPABASE_KEY', '')
HYRUP_API_URL = os.environ.get('HYRUP_API_URL', '').rstrip('/')
_supabase = None
if _HAS_SUPABASE:
    try:
        _supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    except Exception as e:
        print(f'[HyrUp] Supabase client init error: {e}')

# ── Paths & error logger (must be defined first) ─────────────
_ERR_LOG   = os.path.join(os.environ.get('TEMP', os.path.expanduser('~')), 'hyrup_errors.txt')
_LOCK_FILE = os.path.join(os.environ.get('TEMP', os.path.expanduser('~')), 'hyrup_collector.lock')
_HOME_DIR  = os.path.join(os.environ.get('TEMP', os.path.expanduser('~')), 'HyrUp')
LOG_PATH       = os.path.join(_HOME_DIR, 'activity.log')
SCREENSHOT_DIR = os.path.join(_HOME_DIR, 'Screenshots')

for d in [_HOME_DIR, SCREENSHOT_DIR]:
    try:
        os.makedirs(d, exist_ok=True)
    except Exception as e:
        print(f'[HyrUp] makedirs error: {e}')

def _err(msg):
    try:
        with open(_ERR_LOG, 'a', encoding='utf-8') as f:
            f.write(f"{datetime.now()} {msg}\n")
    except Exception as e:
        print(f'[HyrUp] _err write failed: {e}')

# ── Settings ──────────────────────────────────────────────────
EMPLOYEE_NAME           = os.environ.get('HYRUP_EMPLOYEE_NAME', '').strip() or 'Employee'
IDLE_THRESHOLD_SEC      = 120
SCREENSHOT_INTERVAL_SEC = 1 * 60 * 60  # every 1 hour

def _get_central_url():
    """Read central API URL from env or Supabase config.

    Prefer HYRUP_API_URL if set, otherwise use the ngrok_url value from Supabase.
    This avoids stale ngrok addresses when the backend is deployed to Railway.
    """
    if HYRUP_API_URL:
        return HYRUP_API_URL
    if not _supabase:
        return os.environ.get('HYRUP_API_URL', 'https://hyrup-production.up.railway.app').rstrip('/')
    try:
        res = _supabase.table('config').select('value').eq('key', 'ngrok_url').execute()
        url = res.data[0]['value'] if res.data else ''
        return url.rstrip('/') if url else os.environ.get('HYRUP_API_URL', 'https://hyrup-production.up.railway.app').rstrip('/')
    except Exception as e:
        _err(f'_get_central_url error: {e}')
        return os.environ.get('HYRUP_API_URL', 'https://hyrup-production.up.railway.app').rstrip('/')

CENTRAL_API_URL = _get_central_url()
_err(f"Central API URL: {CENTRAL_API_URL}")

def _acquire_lock():
    if os.path.exists(_LOCK_FILE):
        try:
            with open(_LOCK_FILE) as f:
                old_pid = int(f.read().strip())
            import ctypes
            handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, old_pid)
            if handle:
                exit_code = ctypes.c_ulong(0)
                ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(exit_code))
                ctypes.windll.kernel32.CloseHandle(handle)
                if exit_code.value == 259:
                    sys.exit(0)
        except Exception as e:
            _err(f'Lock check error: {e}')
    with open(_LOCK_FILE, 'w') as f:
        f.write(str(os.getpid()))
    atexit.register(lambda: os.remove(_LOCK_FILE) if os.path.exists(_LOCK_FILE) else None)

_acquire_lock()

# ── Scheduled Breaks ──────────────────────────────────────────
SCHEDULED_BREAKS = [
    (11,  0, 11, 10, 'Morning Tea Break'),
    (14,  0, 14, 30, 'Lunch Break'),
    (16,  0, 16, 10, 'Evening Tea Break'),
]

def _scheduled_break_label():
    now = datetime.now()
    t = now.hour * 60 + now.minute
    for sh, sm, eh, em, label in SCHEDULED_BREAKS:
        if sh * 60 + sm <= t < eh * 60 + em:
            return label
    return None

# ── Input Tracker ─────────────────────────────────────────────
class _InputTracker:
    def __init__(self):
        self._lock = threading.Lock()
        self._last = time.time()

    def update(self, *_):
        with self._lock:
            self._last = time.time()

    def idle_duration(self):
        with self._lock:
            return time.time() - self._last

_tracker = _InputTracker()

if _HAS_INPUT:
    try:
        mouse.Listener(on_move=_tracker.update, on_click=_tracker.update, on_scroll=_tracker.update).start()
        keyboard.Listener(on_press=_tracker.update).start()
    except Exception as e:
        _err(f"Input listener failed: {e}")

# ── Log Activity ──────────────────────────────────────────────
def log_activity(app_name, duration_sec, is_idle):
    break_label = _scheduled_break_label()
    if break_label:
        final_app = break_label
    else:
        final_app = 'Idle/No Movement' if is_idle else (app_name or 'Unknown')
    now = datetime.now()
    row = {
        "timestamp":     now.strftime('%Y-%m-%d %H:%M:%S'),
        "date":          now.strftime('%Y-%m-%d'),
        "employee_name": EMPLOYEE_NAME,
        "app_website":   final_app,
        "duration":      round(duration_sec / 60, 2)
    }
    if _supabase:
        try:
            _supabase.table("activity_logs").insert(row).execute()
        except Exception as e:
            _err(f"Supabase insert failed: {e}")
            _save_local(row)
    else:
        _save_local(row)

def _save_local(row):
    try:
        new_file = not os.path.isfile(LOG_PATH)
        with open(LOG_PATH, 'a', encoding='utf-8', newline='') as f:
            w = csv.writer(f)
            if new_file:
                w.writerow(['Timestamp', 'Date', 'Employee Name', 'App/Website', 'Duration'])
            w.writerow([row['timestamp'], row['date'], row['employee_name'], row['app_website'], row['duration']])
    except Exception as e:
        _err(f"Local save failed: {e}")

# ── Screenshot ────────────────────────────────────────────────
class _ShotTracker:
    def __init__(self):
        self._lock = threading.Lock()
        self._last = None

    def should_capture(self):
        with self._lock:
            now = datetime.now()
            if self._last is None or (now - self._last).total_seconds() >= SCREENSHOT_INTERVAL_SEC:
                self._last = now
                return True
            return False

_shot_tracker = _ShotTracker()

def take_screenshot():
    if not _HAS_PIL:
        return
    try:
        now  = datetime.now()
        emp  = EMPLOYEE_NAME.replace(' ', '_')
        name = f"{emp}_{now.strftime('%Y-%m-%d_%H-%M-%S')}.png"
        path = os.path.join(SCREENSHOT_DIR, name)
        ImageGrab.grab().save(path)
        if _supabase:
            try:
                with open(path, 'rb') as f:
                    _supabase.storage.from_("screenshots").upload(
                        f"{emp}/{name}", f.read(), {"content-type": "image/png"}
                    )
                _supabase.table("screenshots").insert({
                    "employee_name": EMPLOYEE_NAME,
                    "filename":      name,
                    "file_url":      f"{SUPABASE_URL}/storage/v1/object/public/screenshots/{emp}/{name}"
                }).execute()
            except Exception as e:
                _err(f"Screenshot upload failed: {e}")
    except Exception as e:
        _err(f"Screenshot failed: {e}")

def _shot_loop():
    while True:
        if _shot_tracker.should_capture():
            take_screenshot()
        if _supabase:
            try:
                emp   = EMPLOYEE_NAME.replace(' ', '_')
                files = _supabase.storage.from_('screenshots').list('triggers')
                names = [f['name'] for f in (files or [])]
                if f"{emp}.trigger" in names:
                    _supabase.storage.from_('screenshots').remove([f"triggers/{emp}.trigger"])
                    take_screenshot()
            except Exception as e:
                _err(f"Poll trigger failed: {e}")
        time.sleep(5)

threading.Thread(target=_shot_loop, daemon=True).start()

# ── Live Stream via WebSocket ─────────────────────────────────
_live_streaming = threading.Event()   # set = admin is watching, clear = stop
_sio_client     = None

def _capture_frame():
    """Capture screen and return base64 JPEG string."""
    if not _HAS_PIL:
        return None
    try:
        img = ImageGrab.grab()
        # Resize to 1280x720 max for performance
        img.thumbnail((1280, 720))
        buf = _io.BytesIO()
        img.save(buf, format='JPEG', quality=30)
        return base64.b64encode(buf.getvalue()).decode('utf-8')
    except Exception as e:
        _err(f"Frame capture failed: {e}")
        return None

def _live_stream_loop():
    """Continuously captures and pushes frames when streaming is active."""
    global _sio_client
    emp = EMPLOYEE_NAME.replace(' ', '_')
    while True:
        _live_streaming.wait()   # block until admin starts watching
        if _sio_client and _sio_client.connected:
            frame = _capture_frame()
            if frame:
                try:
                    _sio_client.emit('push_frame', {'employee': emp, 'frame': frame})
                except Exception as e:
                    _err(f"Frame push failed: {e}")
        time.sleep(0.4)          # ~2.5 fps

def _connect_socketio():
    """Connects to central_api SocketIO and handles start/stop stream events."""
    global _sio_client
    if not _HAS_SIO:
        _err("python-socketio not installed — live stream disabled")
        return
    emp = EMPLOYEE_NAME.replace(' ', '_')
    while True:
        try:
            sio = _sio_lib.Client(
                reconnection=True,
                reconnection_attempts=0,
                reconnection_delay=3,
                logger=False
            )

            @sio.on('connect')
            def on_connect():
                sio.emit('collector_connect', {'employee': emp})
                _err(f"Live stream connected: {emp}")

            @sio.on('start_stream')
            def on_start(_):
                _live_streaming.set()
                _err("Live stream started by admin")

            @sio.on('stop_stream')
            def on_stop(_):
                _live_streaming.clear()
                _err("Live stream stopped by admin")

            @sio.on('disconnect')
            def on_disconnect():
                _live_streaming.clear()
                _err("Live stream disconnected")

            _sio_client = sio
            # Try websocket first, fall back to polling
            try:
                sio.connect(CENTRAL_API_URL, transports=['websocket'])
            except Exception as e:
                _err(f'WebSocket connect failed, trying polling: {e}')
                sio.connect(CENTRAL_API_URL, transports=['polling', 'websocket'])
            sio.wait()
        except Exception as e:
            _err(f"SocketIO connect failed: {e}")
            _live_streaming.clear()
            _sio_client = None
            time.sleep(5)

threading.Thread(target=_connect_socketio, daemon=True).start()
threading.Thread(target=_live_stream_loop, daemon=True).start()

# ── Shutdown ──────────────────────────────────────────────────
def _shutdown(sig=None, frame=None):
    _err("Collector shutdown")
    sys.exit(0)

signal.signal(signal.SIGTERM, _shutdown)
signal.signal(signal.SIGINT,  _shutdown)

# ── Main Loop ─────────────────────────────────────────────────
_err(f"Collector started. Employee={EMPLOYEE_NAME}")

window = ''
try:
    if _HAS_GW:
        window = gw.getActiveWindowTitle() or ''
except Exception as e:
    _err(f"getActiveWindowTitle failed: {e}")

log_activity(window, 60, _tracker.idle_duration() > IDLE_THRESHOLD_SEC or not window)

while True:
    time.sleep(60)
    try:
        idle   = _tracker.idle_duration() > IDLE_THRESHOLD_SEC
        window = ''
        if _HAS_GW:
            window = gw.getActiveWindowTitle() or ''
        if not window:
            idle = True
        log_activity(window, 60, idle)
    except Exception as e:
        _err(f"Main loop error: {e}")
