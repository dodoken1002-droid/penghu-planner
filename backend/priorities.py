import json
from flask import jsonify, request, send_from_directory
from backend.app import app, db, frontend_dir

ISSUES = ['醫療與離島就醫', '長者照顧與社會福利', '育兒、教育與青年發展', '對外及離島交通', '漁業、農業與在地產業', '就業、薪資與返鄉', '觀光與生活品質', '居住、建設與防災', '環境保護與海洋資源', '治安、消防與公共安全']

class PriorityResponse(db.Model):
    __tablename__ = 'public_priority_responses'
    id = db.Column(db.Integer, primary_key=True)
    ranking = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)

@app.get('/priorities')
def priority_page():
    return send_from_directory(frontend_dir, 'priorities.html')

@app.get('/api/priorities/results')
def priority_results():
    rows = db.session.query(PriorityResponse.ranking).all()
    totals = {n: {'name': n, 'points': 0, 'first': 0, 'selected': 0} for n in ISSUES}
    for (raw,) in rows:
        for index, name in enumerate(json.loads(raw)):
            if name in totals and index < 5:
                totals[name]['points'] += 5 - index
                totals[name]['first'] += int(index == 0)
                totals[name]['selected'] += 1
    return jsonify(count=len(rows), issues=sorted(totals.values(), key=lambda x: (-x['points'], -x['first'], x['name'])))

@app.post('/api/priorities/responses')
def priority_submit():
    if request.content_length is None or request.content_length > 4096:
        return jsonify(error='資料格式有誤'), 400
    data = request.get_json(silent=True)
    ranking = data.get('ranking') if isinstance(data, dict) else None
    if not isinstance(ranking, list) or len(ranking) != 5 or not all(isinstance(n, str) and n in ISSUES for n in ranking) or len(set(ranking)) != 5:
        return jsonify(error='請選擇五個不同的議題'), 400
    db.session.add(PriorityResponse(ranking=json.dumps(ranking, ensure_ascii=False)))
    db.session.commit()
    return jsonify(ok=True), 201

