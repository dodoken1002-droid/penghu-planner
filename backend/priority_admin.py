"""Survey dashboard protected by the existing admin session."""
import os
from functools import wraps
from flask import jsonify, make_response, send_from_directory, session
from backend.app import app, db, frontend_dir, require_role
from backend.priorities import PriorityDemographic, priority_results

def designated_owner(view):
    @wraps(view)
    def wrapped(*args, **kwargs):
        if len(os.environ.get('SECRET_KEY', '')) < 32:
            return jsonify(error='調查後台尚未設定安全的登入金鑰'), 503
        if session.get('username') != 'admin':
            return jsonify(error='此帳號無權查看調查資料'), 403
        return view(*args, **kwargs)
    return wrapped

@app.get('/priorities/admin')
@require_role('admin')
@designated_owner
def priority_admin_page():
    response = make_response(send_from_directory(frontend_dir, 'priorities-admin.html'))
    response.headers['Cache-Control'] = 'no-store'
    return response

@app.get('/api/priorities/admin/summary')
@require_role('admin')
@designated_owner
def priority_admin_summary():
    aggregate = priority_results().get_json()
    ages = db.session.query(PriorityDemographic.age_range, db.func.count()).group_by(PriorityDemographic.age_range).all()
    genders = db.session.query(PriorityDemographic.gender, db.func.count()).group_by(PriorityDemographic.gender).all()
    response = jsonify(count=aggregate['count'], issues=aggregate['issues'], ages=dict(ages), genders=dict(genders))
    response.headers['Cache-Control'] = 'no-store'
    return response
