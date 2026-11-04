"""Survey dashboard protected by the existing admin session."""
from flask import jsonify, make_response, send_from_directory
from backend.app import app, db, frontend_dir, require_role
from backend.priorities import PriorityDemographic, priority_results

@app.get('/priorities/admin')
@require_role('admin')
def priority_admin_page():
    response = make_response(send_from_directory(frontend_dir, 'priorities-admin.html'))
    response.headers['Cache-Control'] = 'no-store'
    return response

@app.get('/api/priorities/admin/summary')
@require_role('admin')
def priority_admin_summary():
    aggregate = priority_results().get_json()
    ages = db.session.query(PriorityDemographic.age_range, db.func.count()).group_by(PriorityDemographic.age_range).all()
    genders = db.session.query(PriorityDemographic.gender, db.func.count()).group_by(PriorityDemographic.gender).all()
    response = jsonify(count=aggregate['count'], issues=aggregate['issues'], ages=dict(ages), genders=dict(genders))
    response.headers['Cache-Control'] = 'no-store'
    return response
