from flask import Flask, request, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from datetime import datetime
import os, json

basedir = os.path.abspath(os.path.dirname(__file__))
frontend_dir = os.path.join(basedir, '..', 'frontend')

app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
CORS(app)

# Railway 提供 DATABASE_URL（PostgreSQL）；本地開發用 SQLite
_db_url = os.environ.get('DATABASE_URL', f'sqlite:///{os.path.join(basedir, "penghu.db")}')
# SQLAlchemy 需要 postgresql:// 而 Railway 有時給 postgres://
if _db_url.startswith('postgres://'):
    _db_url = _db_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = _db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db = SQLAlchemy(app)


# ─── Models ───────────────────────────────────────────────────────────────────

class Attraction(db.Model):
    __tablename__ = 'attractions'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), default='自然景觀')
    location = db.Column(db.String(100), default='馬公市')
    duration_hours = db.Column(db.Float, default=1.5)
    price = db.Column(db.Integer, default=0)
    description = db.Column(db.Text, default='')
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'category': self.category,
                'location': self.location, 'duration_hours': self.duration_hours,
                'price': self.price, 'description': self.description, 'is_active': self.is_active}


class Restaurant(db.Model):
    __tablename__ = 'restaurants'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), default='海鮮')
    location = db.Column(db.String(100), default='馬公市')
    meal_type = db.Column(db.String(50), default='午晚餐')
    price_per_person = db.Column(db.Integer, default=300)
    description = db.Column(db.Text, default='')
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'category': self.category,
                'location': self.location, 'meal_type': self.meal_type,
                'price_per_person': self.price_per_person,
                'description': self.description, 'is_active': self.is_active}


class Transportation(db.Model):
    __tablename__ = 'transportation'
    id = db.Column(db.Integer, primary_key=True)
    type = db.Column(db.String(50), default='飛機')
    name = db.Column(db.String(100), nullable=False)
    price_per_person = db.Column(db.Integer, default=0)   # 成人
    price_child = db.Column(db.Integer, default=0)         # 兒童
    price_senior = db.Column(db.Integer, default=0)        # 敬老/愛陪
    price_per_unit = db.Column(db.Integer, default=0)
    unit = db.Column(db.String(20), default='人')
    description = db.Column(db.Text, default='')
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {'id': self.id, 'type': self.type, 'name': self.name,
                'price_per_person': self.price_per_person,
                'price_child': self.price_child,
                'price_senior': self.price_senior,
                'price_per_unit': self.price_per_unit, 'unit': self.unit,
                'description': self.description, 'is_active': self.is_active}


class Accommodation(db.Model):
    __tablename__ = 'accommodations'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), default='飯店')
    location = db.Column(db.String(100), default='馬公市')
    price_per_room_night = db.Column(db.Integer, default=2000)
    description = db.Column(db.Text, default='')
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {'id': self.id, 'name': self.name, 'type': self.type,
                'location': self.location,
                'price_per_room_night': self.price_per_room_night,
                'description': self.description, 'is_active': self.is_active}


class Trip(db.Model):
    __tablename__ = 'trips'
    id = db.Column(db.Integer, primary_key=True)
    customer_name = db.Column(db.String(100), default='')
    customer_phone = db.Column(db.String(20), default='')
    customer_email = db.Column(db.String(100), default='')
    trip_date = db.Column(db.String(20), default='')
    return_date = db.Column(db.String(20), default='')
    days = db.Column(db.Integer, default=2)
    adults = db.Column(db.Integer, default=2)
    children = db.Column(db.Integer, default=0)
    seniors = db.Column(db.Integer, default=0)
    total_people = db.Column(db.Integer, default=2)
    transport_cost = db.Column(db.Integer, default=0)
    accommodation_cost = db.Column(db.Integer, default=0)
    activity_cost = db.Column(db.Integer, default=0)
    meal_cost = db.Column(db.Integer, default=0)
    other_cost = db.Column(db.Integer, default=0)
    cost_subtotal = db.Column(db.Integer, default=0)
    service_fee = db.Column(db.Integer, default=0)    # 代辦服務費（固定金額）
    markup_percent = db.Column(db.Float, default=0)   # 保留舊欄位，前端不再使用
    final_quote = db.Column(db.Integer, default=0)
    quote_per_person = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='草稿')
    notes = db.Column(db.Text, default='')
    itinerary_data = db.Column(db.Text, default='{}')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id': self.id, 'customer_name': self.customer_name,
            'customer_phone': self.customer_phone, 'customer_email': self.customer_email,
            'trip_date': self.trip_date, 'return_date': self.return_date,
            'days': self.days, 'adults': self.adults, 'children': self.children,
            'seniors': self.seniors, 'total_people': self.total_people,
            'transport_cost': self.transport_cost,
            'accommodation_cost': self.accommodation_cost,
            'activity_cost': self.activity_cost, 'meal_cost': self.meal_cost,
            'other_cost': self.other_cost, 'cost_subtotal': self.cost_subtotal,
            'service_fee': self.service_fee,
            'markup_percent': self.markup_percent, 'final_quote': self.final_quote,
            'quote_per_person': self.quote_per_person,
            'status': self.status, 'notes': self.notes,
            'itinerary_data': json.loads(self.itinerary_data) if self.itinerary_data else {},
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else '',
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M') if self.updated_at else '',
        }


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.route('/api/healthz')
def healthz():
    db_url = app.config['SQLALCHEMY_DATABASE_URI']
    db_type = 'postgresql' if 'postgresql' in db_url else 'sqlite'
    return jsonify({'status': 'ok', 'db': db_type, 'has_pg': db_type == 'postgresql'})


# ─── Page Routes ──────────────────────────────────────────────────────────────

@app.route('/')
def index():
    return send_from_directory(frontend_dir, 'index.html')

@app.route('/trips')
def trips_page():
    return send_from_directory(frontend_dir, 'trips.html')

@app.route('/quote')
def quote_page():
    return send_from_directory(frontend_dir, 'quote.html')

@app.route('/admin')
def admin_page():
    return send_from_directory(frontend_dir, 'admin.html')


# ─── Attractions API ──────────────────────────────────────────────────────────

@app.route('/api/attractions', methods=['GET'])
def get_attractions():
    return jsonify([a.to_dict() for a in Attraction.query.filter_by(is_active=True).all()])

@app.route('/api/attractions', methods=['POST'])
def create_attraction():
    d = request.json
    item = Attraction(name=d['name'], category=d.get('category', '自然景觀'),
                      location=d.get('location', '馬公市'),
                      duration_hours=d.get('duration_hours', 1.5),
                      price=d.get('price', 0), description=d.get('description', ''))
    db.session.add(item); db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/attractions/<int:id>', methods=['PUT'])
def update_attraction(id):
    item = db.get_or_404(Attraction, id)
    for k in ['name', 'category', 'location', 'duration_hours', 'price', 'description', 'is_active']:
        if k in request.json: setattr(item, k, request.json[k])
    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/attractions/<int:id>', methods=['DELETE'])
def delete_attraction(id):
    item = db.get_or_404(Attraction, id)
    item.is_active = False; db.session.commit()
    return jsonify({'success': True})


# ─── Restaurants API ──────────────────────────────────────────────────────────

@app.route('/api/restaurants', methods=['GET'])
def get_restaurants():
    return jsonify([r.to_dict() for r in Restaurant.query.filter_by(is_active=True).all()])

@app.route('/api/restaurants', methods=['POST'])
def create_restaurant():
    d = request.json
    item = Restaurant(name=d['name'], category=d.get('category', '海鮮'),
                      location=d.get('location', '馬公市'),
                      meal_type=d.get('meal_type', '午晚餐'),
                      price_per_person=d.get('price_per_person', 300),
                      description=d.get('description', ''))
    db.session.add(item); db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/restaurants/<int:id>', methods=['PUT'])
def update_restaurant(id):
    item = db.get_or_404(Restaurant, id)
    for k in ['name', 'category', 'location', 'meal_type', 'price_per_person', 'description', 'is_active']:
        if k in request.json: setattr(item, k, request.json[k])
    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/restaurants/<int:id>', methods=['DELETE'])
def delete_restaurant(id):
    item = db.get_or_404(Restaurant, id)
    item.is_active = False; db.session.commit()
    return jsonify({'success': True})


# ─── Transportation API ───────────────────────────────────────────────────────

@app.route('/api/transportation', methods=['GET'])
def get_transportation():
    return jsonify([t.to_dict() for t in Transportation.query.filter_by(is_active=True).all()])

@app.route('/api/transportation', methods=['POST'])
def create_transportation():
    d = request.json
    item = Transportation(type=d.get('type', '飛機'), name=d['name'],
                          price_per_person=d.get('price_per_person', 0),
                          price_child=d.get('price_child', 0),
                          price_senior=d.get('price_senior', 0),
                          price_per_unit=d.get('price_per_unit', 0),
                          unit=d.get('unit', '人'),
                          description=d.get('description', ''))
    db.session.add(item); db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/transportation/<int:id>', methods=['PUT'])
def update_transportation(id):
    item = db.get_or_404(Transportation, id)
    for k in ['type', 'name', 'price_per_person', 'price_child', 'price_senior', 'price_per_unit', 'unit', 'description', 'is_active']:
        if k in request.json: setattr(item, k, request.json[k])
    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/transportation/<int:id>', methods=['DELETE'])
def delete_transportation(id):
    item = db.get_or_404(Transportation, id)
    item.is_active = False; db.session.commit()
    return jsonify({'success': True})


# ─── Accommodations API ───────────────────────────────────────────────────────

@app.route('/api/accommodations', methods=['GET'])
def get_accommodations():
    return jsonify([a.to_dict() for a in Accommodation.query.filter_by(is_active=True).all()])

@app.route('/api/accommodations', methods=['POST'])
def create_accommodation():
    d = request.json
    item = Accommodation(name=d['name'], type=d.get('type', '飯店'),
                         location=d.get('location', '馬公市'),
                         price_per_room_night=d.get('price_per_room_night', 2000),
                         description=d.get('description', ''))
    db.session.add(item); db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/accommodations/<int:id>', methods=['PUT'])
def update_accommodation(id):
    item = db.get_or_404(Accommodation, id)
    for k in ['name', 'type', 'location', 'price_per_room_night', 'description', 'is_active']:
        if k in request.json: setattr(item, k, request.json[k])
    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/accommodations/<int:id>', methods=['DELETE'])
def delete_accommodation(id):
    item = db.get_or_404(Accommodation, id)
    item.is_active = False; db.session.commit()
    return jsonify({'success': True})


# ─── Trips API ────────────────────────────────────────────────────────────────

def calc_quote(data, current=None):
    adults = data.get('adults', getattr(current, 'adults', 2))
    children = data.get('children', getattr(current, 'children', 0))
    seniors = data.get('seniors', getattr(current, 'seniors', 0))
    total_people = adults + children + seniors

    tc = int(data.get('transport_cost', getattr(current, 'transport_cost', 0)))
    ac = int(data.get('accommodation_cost', getattr(current, 'accommodation_cost', 0)))
    vc = int(data.get('activity_cost', getattr(current, 'activity_cost', 0)))
    mc = int(data.get('meal_cost', getattr(current, 'meal_cost', 0)))
    oc = int(data.get('other_cost', getattr(current, 'other_cost', 0)))
    sf = int(data.get('service_fee', getattr(current, 'service_fee', 0)))  # 代辦服務費（固定金額）
    subtotal = tc + ac + vc + mc + oc
    final = subtotal + sf
    per_person = int(final / total_people) if total_people > 0 else 0
    return total_people, tc, ac, vc, mc, oc, subtotal, sf, final, per_person


@app.route('/api/trips', methods=['GET'])
def get_trips():
    q = Trip.query
    if request.args.get('status'):
        q = q.filter_by(status=request.args.get('status'))
    return jsonify([t.to_dict() for t in q.order_by(Trip.created_at.desc()).all()])

@app.route('/api/trips', methods=['POST'])
def create_trip():
    d = request.json
    tp, tc, ac, vc, mc, oc, sub, sf, final, pp = calc_quote(d)
    trip = Trip(
        customer_name=d.get('customer_name', ''), customer_phone=d.get('customer_phone', ''),
        customer_email=d.get('customer_email', ''), trip_date=d.get('trip_date', ''),
        return_date=d.get('return_date', ''), days=d.get('days', 2),
        adults=d.get('adults', 2), children=d.get('children', 0), seniors=d.get('seniors', 0), total_people=tp,
        transport_cost=tc, accommodation_cost=ac, activity_cost=vc,
        meal_cost=mc, other_cost=oc, cost_subtotal=sub,
        service_fee=sf, markup_percent=0, final_quote=final, quote_per_person=pp,
        status=d.get('status', '草稿'), notes=d.get('notes', ''),
        itinerary_data=json.dumps(d.get('itinerary_data', {}), ensure_ascii=False)
    )
    db.session.add(trip); db.session.commit()
    return jsonify(trip.to_dict()), 201

@app.route('/api/trips/<int:id>', methods=['GET'])
def get_trip(id):
    return jsonify(db.get_or_404(Trip, id).to_dict())

@app.route('/api/trips/<int:id>', methods=['PUT'])
def update_trip(id):
    trip = db.get_or_404(Trip, id)
    d = request.json
    for k in ['customer_name', 'customer_phone', 'customer_email',
              'trip_date', 'return_date', 'days', 'adults', 'children', 'seniors', 'status', 'notes']:
        if k in d: setattr(trip, k, d[k])
    if 'itinerary_data' in d:
        trip.itinerary_data = json.dumps(d['itinerary_data'], ensure_ascii=False)
    tp, tc, ac, vc, mc, oc, sub, sf, final, pp = calc_quote(d, trip)
    trip.total_people = tp
    trip.transport_cost = tc; trip.accommodation_cost = ac
    trip.activity_cost = vc; trip.meal_cost = mc; trip.other_cost = oc
    trip.cost_subtotal = sub; trip.service_fee = sf; trip.markup_percent = 0
    trip.final_quote = final; trip.quote_per_person = pp
    trip.updated_at = datetime.utcnow()
    db.session.commit()
    return jsonify(trip.to_dict())

@app.route('/api/trips/<int:id>', methods=['DELETE'])
def delete_trip(id):
    trip = db.get_or_404(Trip, id)
    db.session.delete(trip); db.session.commit()
    return jsonify({'success': True})
