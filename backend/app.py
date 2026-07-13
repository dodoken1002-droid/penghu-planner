

from flask import Flask, request, jsonify, send_from_directory, session
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from datetime import datetime
import os, json

basedir = os.path.abspath(os.path.dirname(__file__))
frontend_dir = os.path.join(basedir, '..', 'frontend')

app = Flask(__name__, static_folder=frontend_dir, static_url_path='')
CORS(app, supports_credentials=True)

_db_url = os.environ.get('DATABASE_URL', f'sqlite:///{os.path.join(basedir, "penghu.db")}')
if _db_url.startswith('postgres://'):
    _db_url = _db_url.replace('postgres://', 'postgresql://', 1)
app.config['SQLALCHEMY_DATABASE_URI'] = _db_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = 'DATABASE_URL' in os.environ
app.secret_key = os.environ.get('SECRET_KEY', 'penghu-chao-travel-secret-2024')
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
    price_per_person = db.Column(db.Integer, default=0)
    price_child = db.Column(db.Integer, default=0)
    price_senior = db.Column(db.Integer, default=0)
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


class AccommodationRoom(db.Model):
    __tablename__ = 'accommodation_rooms'
    id = db.Column(db.Integer, primary_key=True)
    accommodation_id = db.Column(db.Integer, db.ForeignKey('accommodations.id'), nullable=False)
    room_type = db.Column(db.String(50), default='雙人房')
    room_number = db.Column(db.String(20), default='')
    price = db.Column(db.Integer, default=0)
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self):
        return {'id': self.id, 'accommodation_id': self.accommodation_id,
                'room_type': self.room_type, 'room_number': self.room_number,
                'price': self.price, 'is_active': self.is_active}


class Accommodation(db.Model):
    __tablename__ = 'accommodations'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    type = db.Column(db.String(50), default='飯店')
    location = db.Column(db.String(100), default='馬公市')
    price_per_room_night = db.Column(db.Integer, default=2000)
    description = db.Column(db.Text, default='')
    is_active = db.Column(db.Boolean, default=True)

    def to_dict(self, include_rooms=True):
        d = {'id': self.id, 'name': self.name, 'type': self.type,
             'location': self.location,
             'price_per_room_night': self.price_per_room_night,
             'description': self.description, 'is_active': self.is_active}
        if include_rooms:
            rooms = AccommodationRoom.query.filter_by(
                accommodation_id=self.id, is_active=True).all()
            d['rooms'] = [r.to_dict() for r in rooms]
        return d


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
    service_fee = db.Column(db.Integer, default=0)
    markup_percent = db.Column(db.Float, default=0)
    final_quote = db.Column(db.Integer, default=0)
    quote_per_person = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='草稿')
    notes = db.Column(db.Text, default='')
    itinerary_data = db.Column(db.Text, default='{}')
    booking_checks = db.relationship(
        'TripBookingCheck', backref='trip', cascade='all, delete-orphan',
        lazy='selectin'
    )
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
            'booking_summary': build_booking_summary(self.booking_checks),
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else '',
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M') if self.updated_at else '',
        }


BOOKING_CHECK_CATEGORIES = {
    'itinerary': '行程預訂',
    'transportation': '交通／車輛',
    'accommodation': '住宿',
}


class TripBookingCheck(db.Model):
    __tablename__ = 'trip_booking_checks'
    __table_args__ = (
        db.UniqueConstraint('trip_id', 'category', name='uq_trip_booking_check_category'),
    )

    id = db.Column(db.Integer, primary_key=True)
    trip_id = db.Column(db.Integer, db.ForeignKey('trips.id'), nullable=False, index=True)
    category = db.Column(db.String(30), nullable=False)
    is_confirmed = db.Column(db.Boolean, default=False, nullable=False)
    note = db.Column(db.Text, default='')
    confirmed_by = db.Column(db.String(100), default='')
    confirmed_at = db.Column(db.DateTime, nullable=True)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self):
        return {
            'category': self.category,
            'label': BOOKING_CHECK_CATEGORIES.get(self.category, self.category),
            'confirmed': bool(self.is_confirmed),
            'note': self.note or '',
            'confirmed_by': self.confirmed_by or '',
            'confirmed_at': self.confirmed_at.strftime('%Y-%m-%d %H:%M') if self.confirmed_at else '',
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M') if self.updated_at else '',
        }


def build_booking_summary(checks):
    by_category = {check.category: check for check in checks}
    items = []
    for category, label in BOOKING_CHECK_CATEGORIES.items():
        check = by_category.get(category)
        items.append(check.to_dict() if check else {
            'category': category, 'label': label, 'confirmed': False,
            'note': '', 'confirmed_by': '', 'confirmed_at': '', 'updated_at': '',
        })

    confirmed_count = sum(1 for item in items if item['confirmed'])
    if confirmed_count == len(items):
        status = 'complete'
    elif confirmed_count:
        status = 'partial'
    else:
        status = 'pending'
    return {
        'status': status,
        'confirmed_count': confirmed_count,
        'total_count': len(items),
        'items': items,
    }


class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    role = db.Column(db.String(20), default='viewer')  # admin | editor | viewer
    display_name = db.Column(db.String(100), default='')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def set_password(self, pw):
        self.password_hash = generate_password_hash(pw)

    def check_password(self, pw):
        return check_password_hash(self.password_hash, pw)

    def to_dict(self):
        return {'id': self.id, 'username': self.username, 'role': self.role,
                'display_name': self.display_name, 'is_active': self.is_active,
                'created_at': self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else ''}


class TripTemplate(db.Model):
    __tablename__ = 'trip_templates'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    days = db.Column(db.Integer, default=2)
    description = db.Column(db.Text, default='')
    itinerary_data = db.Column(db.Text, default='{}')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.String(50), default='')

    def to_dict(self):
        return {
            'id': self.id, 'name': self.name, 'days': self.days,
            'description': self.description,
            'itinerary_data': json.loads(self.itinerary_data) if self.itinerary_data else {},
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M') if self.created_at else '',
            'created_by': self.created_by,
        }


class ActivityLog(db.Model):
    __tablename__ = 'activity_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=True)
    username = db.Column(db.String(50), default='')
    action = db.Column(db.String(50), default='')
    target_type = db.Column(db.String(50), default='')
    target_name = db.Column(db.String(200), default='')
    ip_address = db.Column(db.String(50), default='')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        ACTION_LABEL = {'login': '登入', 'logout': '登出', 'create': '新增',
                        'update': '修改', 'delete': '停用'}
        TYPE_LABEL = {'attraction': '景點', 'restaurant': '餐廳',
                      'transportation': '交通', 'accommodation': '住宿',
                      'room': '房型', 'trip': '行程', 'user': '帳號', 'system': '系統',
                      'template': '範本', 'booking_check': '出團確認'}
        return {
            'id': self.id, 'username': self.username,
            'action': ACTION_LABEL.get(self.action, self.action),
            'target_type': TYPE_LABEL.get(self.target_type, self.target_type),  # noqa
            'target_name': self.target_name,
            'ip_address': self.ip_address,
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else '',
        }


# ─── Auth Helpers ─────────────────────────────────────────────────────────────

def require_role(*roles):
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            if 'user_id' not in session:
                return jsonify({'error': '請先登入', 'code': 'UNAUTHORIZED'}), 401
            if roles and session.get('role') not in roles:
                return jsonify({'error': '權限不足', 'code': 'FORBIDDEN'}), 403
            return f(*args, **kwargs)
        return wrapped
    return decorator


def log_activity(action, target_type, target_name):
    try:
        log = ActivityLog(
            user_id=session.get('user_id'),
            username=session.get('username', ''),
            action=action, target_type=target_type, target_name=str(target_name)[:200],
            ip_address=request.remote_addr or ''
        )
        db.session.add(log)
    except Exception:
        pass


# ─── Health Check ─────────────────────────────────────────────────────────────

@app.route('/api/healthz')
def healthz():
    db_url = app.config['SQLALCHEMY_DATABASE_URI']
    db_type = 'postgresql' if 'postgresql' in db_url else 'sqlite'
    return jsonify({'status': 'ok', 'db': db_type, 'has_pg': db_type == 'postgresql'})


# ─── Auth API ─────────────────────────────────────────────────────────────────

@app.route('/api/auth/login', methods=['POST'])
def auth_login():
    d = request.json or {}
    user = User.query.filter_by(username=d.get('username', ''), is_active=True).first()
    if not user or not user.check_password(d.get('password', '')):
        return jsonify({'error': '帳號或密碼錯誤'}), 401
    session.permanent = True
    session['user_id'] = user.id
    session['role'] = user.role
    session['username'] = user.username
    log_activity('login', 'system', '登入系統')
    db.session.commit()
    return jsonify({'id': user.id, 'username': user.username,
                    'role': user.role, 'display_name': user.display_name})


@app.route('/api/auth/logout', methods=['POST'])
def auth_logout():
    if 'user_id' in session:
        log_activity('logout', 'system', '登出系統')
        db.session.commit()
    session.clear()
    return jsonify({'success': True})


@app.route('/api/auth/me', methods=['GET'])
def auth_me():
    if 'user_id' not in session:
        return jsonify({'error': 'UNAUTHORIZED'}), 401
    user = User.query.get(session['user_id'])
    if not user or not user.is_active:
        session.clear()
        return jsonify({'error': 'UNAUTHORIZED'}), 401
    return jsonify({'id': user.id, 'username': user.username,
                    'role': user.role, 'display_name': user.display_name})


# ─── User Management API (admin only) ─────────────────────────────────────────

@app.route('/api/users', methods=['GET'])
@require_role('admin')
def get_users():
    return jsonify([u.to_dict() for u in User.query.order_by(User.created_at).all()])


@app.route('/api/users', methods=['POST'])
@require_role('admin')
def create_user():
    d = request.json or {}
    if User.query.filter_by(username=d.get('username', '')).first():
        return jsonify({'error': '帳號已存在'}), 400
    u = User(username=d['username'], role=d.get('role', 'viewer'),
             display_name=d.get('display_name', ''))
    u.set_password(d.get('password', 'Changeme123'))
    db.session.add(u)
    log_activity('create', 'user', u.username)
    db.session.commit()
    return jsonify(u.to_dict()), 201


@app.route('/api/users/<int:uid>', methods=['PUT'])
@require_role('admin')
def update_user(uid):
    u = db.get_or_404(User, uid)
    d = request.json or {}
    for k in ['display_name', 'role', 'is_active']:
        if k in d:
            setattr(u, k, d[k])
    if d.get('password'):
        u.set_password(d['password'])
    log_activity('update', 'user', u.username)
    db.session.commit()
    return jsonify(u.to_dict())


@app.route('/api/users/<int:uid>', methods=['DELETE'])
@require_role('admin')
def delete_user(uid):
    if uid == session.get('user_id'):
        return jsonify({'error': '不能停用自己的帳號'}), 400
    u = db.get_or_404(User, uid)
    u.is_active = False
    log_activity('delete', 'user', u.username)
    db.session.commit()
    return jsonify({'success': True})


# ─── Activity Log API (admin only) ────────────────────────────────────────────

@app.route('/api/activity_logs', methods=['GET'])
@require_role('admin')
def get_activity_logs():
    limit = int(request.args.get('limit', 200))
    logs = ActivityLog.query.order_by(ActivityLog.created_at.desc()).limit(limit).all()
    return jsonify([l.to_dict() for l in logs])


# ─── Page Routes ──────────────────────────────────────────────────────────────

@app.route('/login')
def login_page():
    return send_from_directory(frontend_dir, 'login.html')

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
@require_role('admin', 'editor', 'viewer')
def get_attractions():
    return jsonify([a.to_dict() for a in Attraction.query.filter_by(is_active=True).all()])

@app.route('/api/attractions', methods=['POST'])
@require_role('admin', 'editor')
def create_attraction():
    d = request.json
    item = Attraction(name=d['name'], category=d.get('category', '自然景觀'),
                      location=d.get('location', '馬公市'),
                      duration_hours=d.get('duration_hours', 1.5),
                      price=d.get('price', 0), description=d.get('description', ''))
    db.session.add(item)
    log_activity('create', 'attraction', item.name)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/attractions/<int:id>', methods=['PUT'])
@require_role('admin', 'editor')
def update_attraction(id):
    item = db.get_or_404(Attraction, id)
    for k in ['name', 'category', 'location', 'duration_hours', 'price', 'description', 'is_active']:
        if k in request.json: setattr(item, k, request.json[k])
    log_activity('update', 'attraction', item.name)
    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/attractions/<int:id>', methods=['DELETE'])
@require_role('admin', 'editor')
def delete_attraction(id):
    item = db.get_or_404(Attraction, id)
    item.is_active = False
    log_activity('delete', 'attraction', item.name)
    db.session.commit()
    return jsonify({'success': True})


# ─── Restaurants API ──────────────────────────────────────────────────────────

@app.route('/api/restaurants', methods=['GET'])
@require_role('admin', 'editor', 'viewer')
def get_restaurants():
    return jsonify([r.to_dict() for r in Restaurant.query.filter_by(is_active=True).all()])

@app.route('/api/restaurants', methods=['POST'])
@require_role('admin', 'editor')
def create_restaurant():
    d = request.json
    item = Restaurant(name=d['name'], category=d.get('category', '海鮮'),
                      location=d.get('location', '馬公市'),
                      meal_type=d.get('meal_type', '午晚餐'),
                      price_per_person=d.get('price_per_person', 300),
                      description=d.get('description', ''))
    db.session.add(item)
    log_activity('create', 'restaurant', item.name)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/restaurants/<int:id>', methods=['PUT'])
@require_role('admin', 'editor')
def update_restaurant(id):
    item = db.get_or_404(Restaurant, id)
    for k in ['name', 'category', 'location', 'meal_type', 'price_per_person', 'description', 'is_active']:
        if k in request.json: setattr(item, k, request.json[k])
    log_activity('update', 'restaurant', item.name)
    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/restaurants/<int:id>', methods=['DELETE'])
@require_role('admin', 'editor')
def delete_restaurant(id):
    item = db.get_or_404(Restaurant, id)
    item.is_active = False
    log_activity('delete', 'restaurant', item.name)
    db.session.commit()
    return jsonify({'success': True})


# ─── Transportation API ───────────────────────────────────────────────────────

@app.route('/api/transportation', methods=['GET'])
@require_role('admin', 'editor', 'viewer')
def get_transportation():
    return jsonify([t.to_dict() for t in Transportation.query.filter_by(is_active=True).all()])

@app.route('/api/transportation', methods=['POST'])
@require_role('admin', 'editor')
def create_transportation():
    d = request.json
    item = Transportation(type=d.get('type', '飛機'), name=d['name'],
                          price_per_person=d.get('price_per_person', 0),
                          price_child=d.get('price_child', 0),
                          price_senior=d.get('price_senior', 0),
                          price_per_unit=d.get('price_per_unit', 0),
                          unit=d.get('unit', '人'),
                          description=d.get('description', ''))
    db.session.add(item)
    log_activity('create', 'transportation', item.name)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/transportation/<int:id>', methods=['PUT'])
@require_role('admin', 'editor')
def update_transportation(id):
    item = db.get_or_404(Transportation, id)
    for k in ['type', 'name', 'price_per_person', 'price_child', 'price_senior',
              'price_per_unit', 'unit', 'description', 'is_active']:
        if k in request.json: setattr(item, k, request.json[k])
    log_activity('update', 'transportation', item.name)
    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/transportation/<int:id>', methods=['DELETE'])
@require_role('admin', 'editor')
def delete_transportation(id):
    item = db.get_or_404(Transportation, id)
    item.is_active = False
    log_activity('delete', 'transportation', item.name)
    db.session.commit()
    return jsonify({'success': True})


# ─── Accommodations API ───────────────────────────────────────────────────────

@app.route('/api/accommodations', methods=['GET'])
@require_role('admin', 'editor', 'viewer')
def get_accommodations():
    return jsonify([a.to_dict() for a in Accommodation.query.filter_by(is_active=True).all()])

@app.route('/api/accommodations', methods=['POST'])
@require_role('admin', 'editor')
def create_accommodation():
    d = request.json
    item = Accommodation(name=d['name'], type=d.get('type', '飯店'),
                         location=d.get('location', '馬公市'),
                         price_per_room_night=d.get('price_per_room_night', 2000),
                         description=d.get('description', ''))
    db.session.add(item)
    log_activity('create', 'accommodation', item.name)
    db.session.commit()
    return jsonify(item.to_dict()), 201

@app.route('/api/accommodations/<int:id>', methods=['PUT'])
@require_role('admin', 'editor')
def update_accommodation(id):
    item = db.get_or_404(Accommodation, id)
    for k in ['name', 'type', 'location', 'price_per_room_night', 'description', 'is_active']:
        if k in request.json: setattr(item, k, request.json[k])
    log_activity('update', 'accommodation', item.name)
    db.session.commit()
    return jsonify(item.to_dict())

@app.route('/api/accommodations/<int:id>', methods=['DELETE'])
@require_role('admin', 'editor')
def delete_accommodation(id):
    item = db.get_or_404(Accommodation, id)
    item.is_active = False
    log_activity('delete', 'accommodation', item.name)
    db.session.commit()
    return jsonify({'success': True})


# ─── Accommodation Rooms API ──────────────────────────────────────────────────

@app.route('/api/accommodations/<int:acc_id>/rooms', methods=['GET'])
@require_role('admin', 'editor', 'viewer')
def get_rooms(acc_id):
    rooms = AccommodationRoom.query.filter_by(accommodation_id=acc_id, is_active=True).all()
    return jsonify([r.to_dict() for r in rooms])

@app.route('/api/accommodations/<int:acc_id>/rooms', methods=['POST'])
@require_role('admin', 'editor')
def create_room(acc_id):
    d = request.json
    acc = db.get_or_404(Accommodation, acc_id)
    room = AccommodationRoom(
        accommodation_id=acc_id,
        room_type=d.get('room_type', '雙人房'),
        room_number=d.get('room_number', ''),
        price=d.get('price', 0)
    )
    db.session.add(room)
    log_activity('create', 'room', f'{acc.name} - {room.room_type} {room.room_number}')
    db.session.commit()
    return jsonify(room.to_dict()), 201

@app.route('/api/accommodations/rooms/<int:room_id>', methods=['PUT'])
@require_role('admin', 'editor')
def update_room(room_id):
    room = db.get_or_404(AccommodationRoom, room_id)
    d = request.json
    for k in ['room_type', 'room_number', 'price', 'is_active']:
        if k in d: setattr(room, k, d[k])
    log_activity('update', 'room', f'房型 {room.room_type} {room.room_number}')
    db.session.commit()
    return jsonify(room.to_dict())

@app.route('/api/accommodations/rooms/<int:room_id>', methods=['DELETE'])
@require_role('admin', 'editor')
def delete_room(room_id):
    room = db.get_or_404(AccommodationRoom, room_id)
    room.is_active = False
    log_activity('delete', 'room', f'房型 {room.room_type} {room.room_number}')
    db.session.commit()
    return jsonify({'success': True})


# ─── Trips API ────────────────────────────────────────────────────────────────

def calc_quote(data, current=None):
    adults   = data.get('adults',   getattr(current, 'adults',   2))
    children = data.get('children', getattr(current, 'children', 0))
    seniors  = data.get('seniors',  getattr(current, 'seniors',  0))
    total_people = adults + children + seniors
    tc  = int(data.get('transport_cost',      getattr(current, 'transport_cost',      0)))
    ac  = int(data.get('accommodation_cost',  getattr(current, 'accommodation_cost',  0)))
    vc  = int(data.get('activity_cost',       getattr(current, 'activity_cost',       0)))
    mc  = int(data.get('meal_cost',           getattr(current, 'meal_cost',           0)))
    oc  = int(data.get('other_cost',          getattr(current, 'other_cost',          0)))
    sf  = int(data.get('service_fee',         getattr(current, 'service_fee',         0)))
    subtotal = tc + ac + vc + mc + oc
    final    = subtotal + sf
    per_person = int(final / total_people) if total_people > 0 else 0
    return total_people, tc, ac, vc, mc, oc, subtotal, sf, final, per_person


@app.route('/api/trips', methods=['GET'])
@require_role('admin', 'viewer')
def get_trips():
    q = Trip.query
    if request.args.get('status'):
        q = q.filter_by(status=request.args.get('status'))
    return jsonify([t.to_dict() for t in q.order_by(Trip.created_at.desc()).all()])

@app.route('/api/trips', methods=['POST'])
@require_role('admin')
def create_trip():
    d = request.json
    tp, tc, ac, vc, mc, oc, sub, sf, final, pp = calc_quote(d)
    trip = Trip(
        customer_name=d.get('customer_name', ''), customer_phone=d.get('customer_phone', ''),
        customer_email=d.get('customer_email', ''), trip_date=d.get('trip_date', ''),
        return_date=d.get('return_date', ''), days=d.get('days', 2),
        adults=d.get('adults', 2), children=d.get('children', 0),
        seniors=d.get('seniors', 0), total_people=tp,
        transport_cost=tc, accommodation_cost=ac, activity_cost=vc,
        meal_cost=mc, other_cost=oc, cost_subtotal=sub,
        service_fee=sf, markup_percent=0, final_quote=final, quote_per_person=pp,
        status=d.get('status', '草稿'), notes=d.get('notes', ''),
        itinerary_data=json.dumps(d.get('itinerary_data', {}), ensure_ascii=False)
    )
    db.session.add(trip)
    log_activity('create', 'trip', d.get('customer_name', '新行程'))
    db.session.commit()
    return jsonify(trip.to_dict()), 201

@app.route('/api/trips/<int:id>', methods=['GET'])
@require_role('admin', 'viewer')
def get_trip(id):
    return jsonify(db.get_or_404(Trip, id).to_dict())

@app.route('/api/trips/<int:id>', methods=['PUT'])
@require_role('admin')
def update_trip(id):
    trip = db.get_or_404(Trip, id)
    d = request.json
    for k in ['customer_name', 'customer_phone', 'customer_email',
              'trip_date', 'return_date', 'days', 'adults', 'children',
              'seniors', 'status', 'notes']:
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
    log_activity('update', 'trip', trip.customer_name or f'#{id}')
    db.session.commit()
    return jsonify(trip.to_dict())

@app.route('/api/trips/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_trip(id):
    trip = db.get_or_404(Trip, id)
    log_activity('delete', 'trip', trip.customer_name or f'#{id}')
    db.session.delete(trip)
    db.session.commit()
    return jsonify({'success': True})


# ─── Pre-departure booking checks ────────────────────────────────────────────

@app.route('/api/trips/<int:id>/booking-checks', methods=['GET'])
@require_role('admin', 'viewer')
def get_trip_booking_checks(id):
    trip = db.get_or_404(Trip, id)
    return jsonify(build_booking_summary(trip.booking_checks))


@app.route('/api/trips/<int:id>/booking-checks', methods=['PUT'])
@require_role('admin', 'viewer')
def update_trip_booking_checks(id):
    trip = db.get_or_404(Trip, id)
    payload = request.json or {}
    requested_checks = payload.get('checks')
    if not isinstance(requested_checks, dict):
        return jsonify({'error': 'checks 必須是物件'}), 400

    unknown = set(requested_checks) - set(BOOKING_CHECK_CATEGORIES)
    if unknown:
        return jsonify({'error': f'不支援的確認項目：{", ".join(sorted(unknown))}'}), 400

    existing = {check.category: check for check in trip.booking_checks}
    user = db.session.get(User, session.get('user_id'))
    checker = (user.display_name or user.username) if user else session.get('username', '')

    for category, values in requested_checks.items():
        if not isinstance(values, dict) or not isinstance(values.get('confirmed'), bool):
            return jsonify({'error': f'{category}.confirmed 必須是布林值'}), 400

        check = existing.get(category)
        if not check:
            check = TripBookingCheck(trip=trip, category=category)
            db.session.add(check)
            existing[category] = check

        was_confirmed = bool(check.is_confirmed)
        check.is_confirmed = values['confirmed']
        check.note = str(values.get('note', '')).strip()[:1000]
        check.updated_at = datetime.utcnow()

        if check.is_confirmed and not was_confirmed:
            check.confirmed_by = checker
            check.confirmed_at = datetime.utcnow()
        elif not check.is_confirmed:
            check.confirmed_by = ''
            check.confirmed_at = None

    log_activity('update', 'booking_check', f'行程 #{trip.id} {trip.customer_name}')
    db.session.commit()
    return jsonify(build_booking_summary(trip.booking_checks))


# ─── Trip Copy ────────────────────────────────────────────────────────────────

@app.route('/api/trips/<int:id>/copy', methods=['POST'])
@require_role('admin')
def copy_trip(id):
    src = db.get_or_404(Trip, id)
    copy = Trip(
        customer_name=src.customer_name, customer_phone=src.customer_phone,
        customer_email=src.customer_email, trip_date=src.trip_date,
        return_date=src.return_date, days=src.days, adults=src.adults,
        children=src.children, seniors=src.seniors, total_people=src.total_people,
        transport_cost=src.transport_cost, accommodation_cost=src.accommodation_cost,
        activity_cost=src.activity_cost, meal_cost=src.meal_cost,
        other_cost=src.other_cost, cost_subtotal=src.cost_subtotal,
        service_fee=src.service_fee, markup_percent=0,
        final_quote=src.final_quote, quote_per_person=src.quote_per_person,
        status='草稿', notes=src.notes, itinerary_data=src.itinerary_data,
    )
    db.session.add(copy)
    log_activity('create', 'trip', f'複製自 #{id} {src.customer_name}')
    db.session.commit()
    return jsonify(copy.to_dict()), 201


# ─── Templates API ────────────────────────────────────────────────────────────

@app.route('/api/templates', methods=['GET'])
@require_role('admin', 'editor', 'viewer')
def get_templates():
    templates = TripTemplate.query.filter_by(is_active=True).order_by(TripTemplate.created_at.desc()).all()
    return jsonify([t.to_dict() for t in templates])


@app.route('/api/templates', methods=['POST'])
@require_role('admin', 'editor')
def create_template():
    d = request.json or {}
    tpl = TripTemplate(
        name=d.get('name', '未命名範本'), days=d.get('days', 2),
        description=d.get('description', ''),
        itinerary_data=json.dumps(d.get('itinerary_data', {}), ensure_ascii=False),
        created_by=session.get('username', ''),
    )
    db.session.add(tpl)
    log_activity('create', 'template', tpl.name)
    db.session.commit()
    return jsonify(tpl.to_dict()), 201


@app.route('/api/templates/<int:id>', methods=['DELETE'])
@require_role('admin', 'editor')
def delete_template(id):
    tpl = db.get_or_404(TripTemplate, id)
    tpl.is_active = False
    log_activity('delete', 'template', tpl.name)
    db.session.commit()
    return jsonify({'success': True})


# ─── Customer Search ──────────────────────────────────────────────────────────

@app.route('/api/customers/search', methods=['GET'])
@require_role('admin', 'editor', 'viewer')
def search_customers():
    q = request.args.get('q', '').strip()
    if len(q) < 2:
        return jsonify([])
    trips = Trip.query.filter(
        db.or_(Trip.customer_name.ilike(f'%{q}%'), Trip.customer_phone.ilike(f'%{q}%'))
    ).order_by(Trip.created_at.desc()).limit(50).all()
    seen, customers = set(), []
    for t in trips:
        key = (t.customer_name, t.customer_phone)
        if key not in seen and (t.customer_name or t.customer_phone):
            seen.add(key)
            customers.append({'name': t.customer_name, 'phone': t.customer_phone, 'email': t.customer_email})
    return jsonify(customers[:10])



