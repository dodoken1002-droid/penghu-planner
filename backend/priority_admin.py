"""Survey dashboard protected by the existing admin session."""
import os
import json
from datetime import datetime, timedelta
from functools import wraps
from flask import jsonify, make_response, send_from_directory, session
from backend.app import app, db, frontend_dir, require_role
from backend.priorities import ISSUES, PriorityDemographic, PriorityResponse, PriorityNetworkSignal, priority_results

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
    ranks = {item['name']: [0, 0, 0, 0, 0] for item in aggregate['issues']}
    for (raw,) in db.session.query(PriorityResponse.ranking).all():
        try:
            items = json.loads(raw)
        except (ValueError, TypeError):
            continue
        if not isinstance(items, list):
            continue
        for pos, name in enumerate(items[:5]):
            if isinstance(name, str) and name in ranks:
                ranks[name][pos] += 1
    for item in aggregate['issues']:
        item['ranks'] = ranks[item['name']]
    grouped = {}
    rows = (db.session.query(PriorityDemographic.age_range, PriorityResponse.ranking)
            .join(PriorityResponse, PriorityDemographic.response_id == PriorityResponse.id).all())
    for age, raw in rows:
        try:
            items = json.loads(raw)
        except (ValueError, TypeError):
            continue
        if not isinstance(items, list) or len(items) != 5 or not all(isinstance(name, str) and name in ISSUES for name in items) or len(set(items)) != 5:
            continue
        group = grouped.setdefault(age, {'count': 0, 'scores': {name: 0 for name in ISSUES},
                                         'selected': {name: 0 for name in ISSUES}})
        group['count'] += 1
        for pos, name in enumerate(items):
            group['scores'][name] += 5 - pos
            group['selected'][name] += 1
    breakdown = {}
    for age, group in grouped.items():
        n = group['count']
        item = {'count': n, 'suppressed': n < 5}
        if n >= 5:
            item['issues'] = sorted(
                [{'name': name, 'points': group['scores'][name],
                  'average': round(group['scores'][name] / n, 2),
                  'selected': group['selected'][name]} for name in ISSUES],
                key=lambda row: (-row['points'], row['name']))
        breakdown[age] = item
    cutoff = datetime.utcnow() - timedelta(days=7)
    PriorityNetworkSignal.query.filter(PriorityNetworkSignal.created_at < cutoff).delete(synchronize_session=False)
    db.session.commit()
    groups = (db.session.query(db.func.count(PriorityNetworkSignal.response_id))
              .group_by(PriorityNetworkSignal.fingerprint).having(db.func.count(PriorityNetworkSignal.response_id) >= 3).all())
    response = jsonify(count=aggregate['count'], issues=aggregate['issues'], ages=dict(ages), genders=dict(genders), age_breakdowns=breakdown,
                       network={'groups': len(groups), 'responses': sum(row[0] for row in groups),
                                'recorded': PriorityNetworkSignal.query.count(),
                                'enabled': len(os.environ.get('SECRET_KEY', '')) >= 32 and bool(os.environ.get('RAILWAY_ENVIRONMENT_NAME'))})
    response.headers['Cache-Control'] = 'no-store'
    return response
