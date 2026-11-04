"""Password-protected aggregate dashboard for the public priority survey."""
import hmac
import os
import threading
import time
from functools import wraps
from flask import jsonify, make_response, request, send_from_directory
from backend.app import app, db, frontend_dir
from backend.priorities import PriorityDemographic, priority_results

_failures = []
_lock = threading.Lock()

def owner_only(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        password = os.environ.get('SURVEY_ADMIN_PASSWORD', '')
        if len(password) < 24:
            return jsonify(error='管理後台尚未設定專屬密碼'), 503
        with _lock:
            now = time.monotonic()
            _failures[:] = [t for t in _failures if now - t < 900]
            if len(_failures) >= 10:
                return jsonify(error='登入嘗試過多，請稍後再試'), 429
            auth = request.authorization
            valid = bool(auth and hmac.compare_digest((auth.username or '').encode('utf-8'), b'owner') and hmac.compare_digest((auth.password or '').encode('utf-8'), password.encode('utf-8')))
            if not valid:
                _failures.append(now)
                response = make_response('請輸入管理員帳號與密碼', 401)
                response.headers['WWW-Authenticate'] = 'Basic realm="Penghu survey admin", charset="UTF-8"'
                response.headers['Cache-Control'] = 'no-store'
                return response
        response = make_response(view(*args, **kwargs))
        response.headers['Cache-Control'] = 'no-store'
        response.headers['X-Content-Type-Options'] = 'nosniff'
        return response
    return wrapped

@app.get('/priorities/admin')
@owner_only
def priority_admin_page():
    return send_from_directory(frontend_dir, 'priorities-admin.html')

@app.get('/api/priorities/admin/summary')
@owner_only
def priority_admin_summary():
    aggregate = priority_results().get_json()
    ages = db.session.query(PriorityDemographic.age_range, db.func.count()).group_by(PriorityDemographic.age_range).all()
    genders = db.session.query(PriorityDemographic.gender, db.func.count()).group_by(PriorityDemographic.gender).all()
    return jsonify(count=aggregate['count'], issues=aggregate['issues'], ages=dict(ages), genders=dict(genders))

