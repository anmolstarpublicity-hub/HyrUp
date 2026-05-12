from flask import Flask, jsonify, abort, request, Response, send_from_directory
from werkzeug.security import safe_join
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_cors import CORS
import os, secrets, base64, threading, time, sys, urllib.request, json as _json
from datetime import datetime, timedelta
from supabase import create_client

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('HYRUP_SECRET', 'hyrup-secret-key-2024')
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading', logger=False, engineio_logger=False)
limiter = Limiter(get_remote_address, app=app, default_limits=["200 per minute"], storage_uri="memory://")

SUPABASE_URL = os.environ.get('SUPABASE_URL', 'https://paqujlxftcnqogwvetra.supabase.co')
SUPABASE_KEY = os.environ.get('SUPABASE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBhcXVqbHhmdGNucW9nd3ZldHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTU3MjMsImV4cCI6MjA5MTI5MTcyM30.oJ8wpnfEPwM0BO_VViDEtXc6Scs2b2-H_bi_CsFRAyA')
_API_KEY = os.environ.get('HYRUP_API_KEY', 'e616fffda5c50197244bec1d41d5387cb03bdd6a2ec27fd5a3ce428dfd518f05')

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def _get_supabase():
    global supabase
    try:
        supabase.table('activity_logs').select('id').limit(1).execute()
    except Exception as e:
        print(f'[HyrUp] Supabase reconnect: {e}')
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
    return supabase

# ── Ngrok — read URL from already-running ngrok ───────────────
def _read_ngrok_url():
    """Retries for 60s waiting for ngrok (started by start_admin.bat) then saves URL to Supabase."""
    for i in range(20):
        try:
            with urllib.request.urlopen('http://127.0.0.1:4040/api/tunnels', timeout=3) as res:
                tunnels = _json.loads(res.read()).get('tunnels', [])
            url = next((t['public_url'] for t in tunnels if t['public_url'].startswith('https')), None)
            if url:
                supabase.table('config').upsert({'key': 'ngrok_url', 'value': url}).execute()
                print(f'[HyrUp] Ngrok URL saved: {url}')
                return
        except Exception as e:
            print(f'[HyrUp] Ngrok retry {i+1}/20: {e}')
        time.sleep(3)
    print('[HyrUp] Ngrok not detected — live stream will use local URL only')

threading.Thread(target=_read_ngrok_url, daemon=True).start()

@app.route('/api/config/ngrok')
def get_ngrok_url():
    try:
        res = supabase.table('config').select('value').eq('key', 'ngrok_url').execute()
        return jsonify({'url': res.data[0]['value'] if res.data else ''})
    except Exception as e:
        print(f'[HyrUp] get_ngrok_url error: {e}')
        return jsonify({'url': ''})

# ── Auto-delete old data (older than 30 days) ─────────────────
def _auto_delete_old_data():
    while True:
        try:
            cutoff = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
            supabase.table('activity_logs').delete().lt('date', cutoff).execute()
            supabase.table('screenshots').delete().lt('created_at', cutoff).execute()
        except Exception as e:
            print(f'[HyrUp] Auto-delete error: {e}')
        threading.Event().wait(86400)

threading.Thread(target=_auto_delete_old_data, daemon=True).start()

# ── In-memory live stream state ───────────────────────────────
_live_state = {}
_live_lock  = threading.Lock()
_sid_to_emp = {}

def _require_api_key():
    if not _API_KEY:
        return
    key = request.headers.get('X-API-Key') or request.args.get('api_key', '')
    if not secrets.compare_digest(key, _API_KEY):
        abort(401, 'Unauthorized')

def _fmt(r):
    ts = str(r.get('timestamp', ''))
    # Strip timezone suffix so JS treats it as local time, not UTC
    ts = ts[:19].replace('T', ' ')
    return {
        'Timestamp':     ts,
        'Date':          r.get('date', ''),
        'Employee Name': r.get('employee_name', ''),
        'App/Website':   r.get('app_website', ''),
        'Duration':      r.get('duration', 0),
    }

# ── SocketIO events ───────────────────────────────────────────

@socketio.on('collector_connect')
def on_collector_connect(data):
    emp = data.get('employee', '').replace(' ', '_')
    if not emp:
        return
    with _live_lock:
        if emp not in _live_state:
            _live_state[emp] = {'frame': None, 'viewers': 0, 'active': False}
        _live_state[emp]['connected'] = True
        _sid_to_emp[request.sid] = emp
    join_room(f'collector_{emp}')
    emit('connected', {'status': 'ok', 'employee': emp})
    socketio.emit('employee_online', {'employee': emp})

@socketio.on('push_frame')
def on_push_frame(data):
    emp   = data.get('employee', '').replace(' ', '_')
    frame = data.get('frame', '')
    if not emp or not frame:
        return
    with _live_lock:
        if emp not in _live_state:
            _live_state[emp] = {'frame': None, 'viewers': 0, 'active': False}
        _live_state[emp]['frame'] = frame
    socketio.emit('frame', {'employee': emp, 'frame': frame}, room=f'watch_{emp}')

@socketio.on('collector_ping')
def on_collector_ping(data):
    emp = data.get('employee', '').replace(' ', '_')
    with _live_lock:
        watching = _live_state.get(emp, {}).get('viewers', 0) > 0
    emit('ping_response', {'watching': watching})

@socketio.on('start_watch')
def on_start_watch(data):
    emp = data.get('employee', '').replace(' ', '_')
    if not emp:
        return
    join_room(f'watch_{emp}')
    with _live_lock:
        if emp not in _live_state:
            _live_state[emp] = {'frame': None, 'viewers': 0, 'active': False}
        _live_state[emp]['viewers'] += 1
        last_frame = _live_state[emp].get('frame')
    if last_frame:
        emit('frame', {'employee': emp, 'frame': last_frame})
    socketio.emit('start_stream', {}, room=f'collector_{emp}')
    emit('watch_started', {'employee': emp})

@socketio.on('stop_watch')
def on_stop_watch(data):
    emp = data.get('employee', '').replace(' ', '_')
    if not emp:
        return
    leave_room(f'watch_{emp}')
    with _live_lock:
        if emp in _live_state:
            _live_state[emp]['viewers'] = max(0, _live_state[emp]['viewers'] - 1)
            if _live_state[emp]['viewers'] == 0:
                socketio.emit('stop_stream', {}, room=f'collector_{emp}')
    emit('watch_stopped', {'employee': emp})

@socketio.on('disconnect')
def on_disconnect():
    emp = _sid_to_emp.pop(request.sid, None)
    if emp:
        with _live_lock:
            if emp in _live_state:
                _live_state[emp]['connected'] = False
        socketio.emit('employee_offline', {'employee': emp})

# ── REST API ──────────────────────────────────────────────────

@app.route('/api/cleanup', methods=['POST'])
def manual_cleanup():
    _require_api_key()
    try:
        days   = int(request.args.get('days', 30))
        cutoff = (datetime.now() - timedelta(days=days)).strftime('%Y-%m-%d')
        supabase.table('activity_logs').delete().lt('date', cutoff).execute()
        supabase.table('screenshots').delete().lt('created_at', cutoff).execute()
        return jsonify({'status': 'ok', 'cutoff': cutoff})
    except Exception as e:
        abort(500, str(e))

@app.route('/api/debug/screenshots')
def debug_screenshots():
    _require_api_key()
    try:
        db = _get_supabase()
        table_data    = db.table('screenshots').select('*').limit(10).execute()
        storage_files = db.storage.from_('screenshots').list()
        return jsonify({
            'table_rows':      table_data.data,
            'storage_folders': [f['name'] for f in (storage_files or [])]
        })
    except Exception as e:
        return jsonify({'error': str(e)})

@app.route('/api/employees')
def employees():
    _require_api_key()
    try:
        db    = _get_supabase()
        res   = db.table('activity_logs').select('employee_name').execute()
        names = set(r['employee_name'] for r in res.data if r.get('employee_name'))
        try:
            ss = db.table('screenshots').select('employee_name').execute()
            for r in ss.data:
                if r.get('employee_name'):
                    names.add(r['employee_name'])
        except Exception as e:
            print(f'[HyrUp] screenshots employee fetch error: {e}')
        return jsonify(sorted(names))
    except Exception as e:
        print(f'[HyrUp] employees error: {e}')
        return jsonify([])

@app.route('/api/activity')
def activity_all():
    _require_api_key()
    try:
        start = request.args.get('start', '')
        end   = request.args.get('end', '')
        db    = _get_supabase()
        all_rows = []
        page = 0
        page_size = 1000
        while True:
            q = db.table('activity_logs').select('*').order('timestamp', desc=False)
            if start: q = q.gte('date', start)
            if end:   q = q.lte('date', end)
            q = q.range(page * page_size, (page + 1) * page_size - 1)
            batch = q.execute().data
            all_rows.extend(batch)
            if len(batch) < page_size:
                break
            page += 1
        return jsonify([_fmt(r) for r in all_rows])
    except Exception as e:
        print(f'[HyrUp] activity_all error: {e}')
        return jsonify([])

@app.route('/api/activity/delete/byname', methods=['POST', 'OPTIONS'])
def delete_activity_byname():
    if request.method == 'OPTIONS':
        return '', 204
    _require_api_key()
    body       = request.get_json(silent=True) or {}
    employee   = body.get('employee', '')
    names      = body.get('names', [])
    date_start = body.get('date_start', '')
    date_end   = body.get('date_end', '')
    if not employee or not names:
        abort(400, 'Missing employee or names')
    try:
        for name in names:
            q = supabase.table('activity_logs').delete()\
                .eq('employee_name', employee)\
                .ilike('app_website', f'{name}%')
            if date_start: q = q.gte('date', date_start)
            if date_end:   q = q.lte('date', date_end)
            q.execute()
        return jsonify({'status': 'ok', 'deleted': len(names)})
    except Exception as e:
        abort(500, str(e))

@app.route('/api/activity/<employee>')
def activity_one(employee):
    _require_api_key()
    try:
        res = supabase.table('activity_logs').select('*').eq('employee_name', employee).order('timestamp', desc=True).execute()
        return jsonify([_fmt(r) for r in res.data])
    except Exception as e:
        print(f'[HyrUp] activity_one error: {e}')
        return jsonify([])

@app.route('/api/screenshot/trigger/<employee>', methods=['POST', 'OPTIONS'])
def trigger_screenshot(employee):
    if request.method == 'OPTIONS':
        return '', 204
    _require_api_key()
    try:
        emp  = employee.replace(' ', '_')
        flag = f"triggers/{emp}.trigger"
        try:
            supabase.storage.from_('screenshots').remove([flag])
        except Exception as e:
            print(f'[HyrUp] trigger flag remove error: {e}')
        supabase.storage.from_('screenshots').upload(flag, b'1', {'content-type': 'text/plain'})
        return jsonify({'status': 'triggered'})
    except Exception as e:
        return jsonify({'status': 'error', 'detail': str(e)}), 500

@app.route('/api/screenshots/<employee>')
def screenshots(employee):
    _require_api_key()
    try:
        db        = _get_supabase()
        emp_space = employee.replace('_', ' ')
        emp_under = employee.replace(' ', '_')
        res = db.table('screenshots').select('filename')\
            .in_('employee_name', [emp_space, emp_under])\
            .order('id', desc=True).execute()
        if res.data:
            return jsonify([r['filename'] for r in res.data if r.get('filename')])
        for emp_try in [emp_under, emp_space]:
            try:
                listed = db.storage.from_('screenshots').list(emp_try)
                files  = [f['name'] for f in (listed or []) if f.get('name', '').endswith('.png')]
                if files:
                    return jsonify(files)
            except Exception as e:
                print(f'[HyrUp] screenshot list error: {e}')
                continue
        return jsonify([])
    except Exception as e:
        print(f'[HyrUp] screenshots error: {e}')
        return jsonify([])

@app.route('/api/screenshots/<employee>/<filename>', methods=['GET', 'DELETE'])
def screenshot_file(employee, filename):
    _require_api_key()
    employee = os.path.basename(employee)
    filename = os.path.basename(filename)
    if not employee or not filename or '..' in filename or '/' in filename or '\\' in filename:
        abort(400)
    db = _get_supabase()
    if request.method == 'DELETE':
        try:
            db.storage.from_('screenshots').remove([f'{employee}/{filename}'])
            for n in [employee.replace('_', ' '), employee]:
                db.table('screenshots').delete().eq('employee_name', n).eq('filename', filename).execute()
            return jsonify({'status': 'ok'})
        except Exception as e:
            abort(500, str(e))
    try:
        data = None
        for emp_try in [employee.replace(' ', '_'), employee.replace('_', ' ')]:
            try:
                data = db.storage.from_('screenshots').download(f'{emp_try}/{filename}')
                if data:
                    break
            except Exception as e:
                print(f'[HyrUp] screenshot download error: {e}')
                continue
        if not data:
            abort(404)
        mime = 'image/png' if filename.lower().endswith('.png') else 'image/jpeg'
        return Response(data, mimetype=mime, headers={'Cache-Control': 'private, max-age=300'})
    except Exception as e:
        print(f'[HyrUp] screenshot_file error: {e}')
        abort(404)

@app.route('/api/breaks', methods=['GET'])
def breaks_all():
    _require_api_key()
    try:
        return jsonify(supabase.table('break_logs').select('*').order('timestamp', desc=True).execute().data)
    except Exception as e:
        print(f'[HyrUp] breaks_all error: {e}')
        return jsonify([])

@app.route('/api/breaks/<employee>', methods=['GET'])
def breaks_one(employee):
    _require_api_key()
    try:
        return jsonify(supabase.table('break_logs').select('*').eq('employee_name', employee).order('timestamp', desc=True).execute().data)
    except Exception as e:
        print(f'[HyrUp] breaks_one error: {e}')
        return jsonify([])

@app.route('/api/breaks/<employee>', methods=['POST'])
def breaks_post(employee):
    _require_api_key()
    data  = request.get_json(silent=True) or {}
    event = data.get('event', '')
    if event not in ('BREAK_IN', 'BREAK_OUT'):
        abort(400, 'Invalid event')
    now = datetime.now()
    try:
        supabase.table('break_logs').insert({
            'timestamp':     now.strftime('%Y-%m-%d %H:%M:%S'),
            'date':          now.strftime('%Y-%m-%d'),
            'employee_name': employee.replace('_', ' '),
            'event':         event
        }).execute()
    except Exception as e:
        abort(500, str(e))
    return jsonify({'status': 'ok', 'event': event})

@app.route('/api/notifications', methods=['GET'])
def get_notifications():
    _require_api_key()
    try:
        return jsonify(supabase.table('notifications').select('*').order('created_at', desc=True).limit(100).execute().data)
    except Exception as e:
        print(f'[HyrUp] get_notifications error: {e}')
        return jsonify([])

@app.route('/api/notifications', methods=['POST'])
def save_notifications():
    _require_api_key()
    data = request.get_json(silent=True)
    if not isinstance(data, list):
        abort(400)
    try:
        supabase.table('notifications').delete().neq('id', 0).execute()
        if data:
            supabase.table('notifications').insert(data).execute()
        return jsonify({'status': 'ok'})
    except Exception as e:
        abort(500, str(e))

@app.route('/api/notifications/fired', methods=['GET'])
def get_fired():
    _require_api_key()
    try:
        return jsonify(supabase.table('fired_notifications').select('*').execute().data)
    except Exception as e:
        print(f'[HyrUp] get_fired error: {e}')
        return jsonify([])

@app.route('/api/notifications/fired', methods=['POST'])
def save_fired():
    _require_api_key()
    data = request.get_json(silent=True) or {}
    key  = data.get('key', '')
    ids  = data.get('ids', [])
    if not key:
        abort(400)
    try:
        supabase.table('fired_notifications').delete().eq('key', key).execute()
        if ids:
            supabase.table('fired_notifications').insert({'key': key, 'ids': ids}).execute()
        return jsonify({'status': 'ok'})
    except Exception as e:
        abort(500, str(e))

@app.route('/api/reminders', methods=['GET'])
def get_reminders():
    _require_api_key()
    try:
        return jsonify(supabase.table('reminders').select('*').order('id', desc=False).execute().data)
    except Exception as e:
        print(f'[HyrUp] get_reminders error: {e}')
        return jsonify([])

@app.route('/api/reminders', methods=['POST'])
def save_reminders():
    _require_api_key()
    data = request.get_json(silent=True)
    if not isinstance(data, list):
        abort(400)
    try:
        supabase.table('reminders').delete().neq('id', 0).execute()
        if data:
            supabase.table('reminders').insert(data).execute()
        return jsonify({'status': 'ok'})
    except Exception as e:
        abort(500, str(e))

# ── Serve React frontend ──────────────────────────────────────
def _get_dist():
    if getattr(sys, '_MEIPASS', None):
        return os.path.join(sys._MEIPASS, 'dist')
    return os.path.join(os.path.dirname(os.path.abspath(__file__)), 'dist')

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_react(path):
    # Don't intercept socket.io or API requests
    if path.startswith('socket.io') or path.startswith('api/'):
        abort(404)
    dist = _get_dist()
    if path:
        try:
            safe_path = safe_join(dist, path)
            if os.path.exists(safe_path):
                return send_from_directory(dist, path)
        except Exception as e:
            print(f'[HyrUp] serve_react error: {e}')
    if os.path.exists(os.path.join(dist, 'index.html')):
        return send_from_directory(dist, 'index.html')
    return jsonify({'status': 'API running', 'version': '1.0.0'})

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=5001, allow_unsafe_werkzeug=True, use_reloader=False, log_output=False)
