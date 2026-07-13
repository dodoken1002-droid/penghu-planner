import io
import re
from datetime import date, datetime

from flask import jsonify, request, session
from openpyxl import load_workbook


REFERENCE_SHEETS = {'範例', '內海巡禮-同業紀錄', '追風音樂祭', '機票與夢想民宿價格', '景點參考'}
SUPPORTING_MARKERS = ('名單', '費用表', '時間安排', '價格', '紀錄', '參考')
OPERATION_FIELDS = (
    'group_name', 'source_sheet', 'contact_channel', 'sales_owner',
    'outbound_transport', 'return_transport', 'accommodation_details',
    'rooming_details', 'special_requirements', 'payment_status',
    'deposit_amount', 'balance_amount', 'supplier_notes',
)


def _date_from_parts(year, compact):
    compact = str(compact)
    if len(compact) == 2:
        month, day = int(compact[0]), int(compact[1])
    elif len(compact) == 3:
        month, day = int(compact[0]), int(compact[1:])
    elif len(compact) == 4:
        month, day = int(compact[:2]), int(compact[2:])
    else:
        return None
    try:
        return date(year, month, day)
    except ValueError:
        return None


def parse_sheet_dates(title, default_year=None):
    year = default_year or datetime.utcnow().year
    normalized = title.replace('/', '').replace('.', '').replace('月', '').replace('日', '')
    full = re.search(r'(?P<year>20\d{2})(?P<start>\d{4})\s*[-~到]\s*(?P<end>\d{3,4})', normalized)
    if full:
        year = int(full.group('year'))
        start = _date_from_parts(year, full.group('start'))
        end = _date_from_parts(year, full.group('end'))
    else:
        pair = re.search(r'(?<!\d)(?P<start>\d{3,4})\s*[-~到]\s*(?P<end>\d{2,4})(?!\d)', normalized)
        if not pair:
            return '', ''
        start_text, end_text = pair.group('start'), pair.group('end')
        start = _date_from_parts(year, start_text)
        if len(end_text) <= 2 and start:
            end = (date(year, start.month, int(end_text))
                   if int(end_text) <= 31
                   else _date_from_parts(year, end_text))
        else:
            end = _date_from_parts(year, end_text)
    if not start or not end:
        return '', ''
    if end < start:
        try:
            end = end.replace(year=end.year + 1)
        except ValueError:
            return '', ''
    return start.isoformat(), end.isoformat()


def clean_group_name(title):
    name = re.sub(r'20\d{2}\d{4}\s*[-~到]\s*\d{3,4}', '', title)
    name = re.sub(r'(?<!\d)\d{3,4}\s*[-~到]\s*\d{2,4}(?!\d)', '', name)
    name = re.sub(r'[-_ ]*取消$', '', name)
    name = re.sub(r'^[-_ ]+|[-_ ]+$', '', name)
    return name or title


def estimate_people(title, text):
    for source in (title, text[:3000]):
        match = re.search(r'[Xx×]\s*(\d{1,3})\s*(?:人|位)?|(?<!\d)(\d{1,3})\s*(?:人|位)', source)
        if match:
            return max(1, min(500, int(match.group(1) or match.group(2))))
    return 2


def sheet_signals(text):
    checks = {
        '含每日行程': ('Day', '行程', '景點/內容'),
        '含航班資訊': ('航班', '機票', '航空'),
        '含車輛資訊': ('租車', '遊覽車', '機車', '車輛'),
        '含住宿資訊': ('住宿', '民宿', '飯店', '酒店'),
        '含房型資訊': ('房型', '雙人房', '四人房', '包棟'),
        '含付款資訊': ('已付款', '未付款', '訂金', '尾款'),
        '含訂妥註記': ('訂好了', '已訂', '訂位'),
    }
    return [label for label, words in checks.items() if any(word in text for word in words)]


def classify_sheet(title, trip_date):
    if title in REFERENCE_SHEETS:
        return 'reference'
    if any(marker in title for marker in SUPPORTING_MARKERS):
        return 'supporting'
    if trip_date:
        return 'cancelled' if '取消' in title else 'trip'
    return 'review'


def preview_workbook(file_bytes):
    workbook = load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    items = []
    try:
        for worksheet in workbook.worksheets:
            cells = []
            for row in worksheet.iter_rows(max_row=min(worksheet.max_row or 1, 120),
                                           max_col=min(worksheet.max_column or 1, 30),
                                           values_only=True):
                cells.extend(str(value) for value in row if value not in (None, ''))
            text = '\n'.join(cells)
            trip_date, return_date = parse_sheet_dates(worksheet.title, 2026)
            kind = classify_sheet(worksheet.title, trip_date)
            people = estimate_people(worksheet.title, text)
            items.append({
                'selected': kind == 'trip',
                'source_sheet': worksheet.title,
                'group_name': clean_group_name(worksheet.title),
                'trip_date': trip_date,
                'return_date': return_date,
                'days': ((date.fromisoformat(return_date) - date.fromisoformat(trip_date)).days + 1)
                        if trip_date and return_date else 2,
                'adults': people,
                'status': '取消' if kind == 'cancelled' else '草稿',
                'kind': kind,
                'signals': sheet_signals(text),
                'warning': '' if trip_date else '未能從工作表名稱辨識日期',
            })
    finally:
        workbook.close()
    return items


def register_group_import(app, db, Trip, require_role, log_activity):
    class TripOperation(db.Model):
        __tablename__ = 'trip_operations'

        id = db.Column(db.Integer, primary_key=True)
        trip_id = db.Column(db.Integer, db.ForeignKey('trips.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
        group_name = db.Column(db.String(200), default='')
        source_sheet = db.Column(db.String(200), default='')
        contact_channel = db.Column(db.String(100), default='')
        sales_owner = db.Column(db.String(100), default='')
        outbound_transport = db.Column(db.Text, default='')
        return_transport = db.Column(db.Text, default='')
        accommodation_details = db.Column(db.Text, default='')
        rooming_details = db.Column(db.Text, default='')
        special_requirements = db.Column(db.Text, default='')
        payment_status = db.Column(db.String(50), default='未確認')
        deposit_amount = db.Column(db.Integer, default=0)
        balance_amount = db.Column(db.Integer, default=0)
        supplier_notes = db.Column(db.Text, default='')
        updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

        def to_dict(self):
            return {field: getattr(self, field) or (0 if field.endswith('_amount') else '')
                    for field in OPERATION_FIELDS}

    def operation_for(trip_id):
        return TripOperation.query.filter_by(trip_id=trip_id).first()

    @app.post('/api/trips/import/preview')
    @require_role('admin')
    def preview_trip_import():
        upload = request.files.get('file')
        if not upload or not upload.filename.lower().endswith('.xlsx'):
            return jsonify({'error': '請上傳 .xlsx Excel 檔'}), 400
        try:
            items = preview_workbook(upload.read())
        except Exception:
            return jsonify({'error': 'Excel 檔案無法解析，請確認檔案未損壞'}), 400
        counts = {kind: sum(1 for item in items if item['kind'] == kind)
                  for kind in ('trip', 'cancelled', 'reference', 'supporting', 'review')}
        return jsonify({'items': items, 'counts': counts, 'total_sheets': len(items)})

    @app.post('/api/trips/import')
    @require_role('admin')
    def import_trips():
        payload = request.get_json(silent=True) or {}
        items = payload.get('items')
        if not isinstance(items, list):
            return jsonify({'error': 'items 必須是陣列'}), 400
        created, skipped = [], []
        for item in items[:200]:
            if not item.get('selected'):
                continue
            source_sheet = str(item.get('source_sheet', '')).strip()[:200]
            existing = TripOperation.query.filter_by(source_sheet=source_sheet).first() if source_sheet else None
            if existing:
                skipped.append({'source_sheet': source_sheet, 'reason': '已匯入'})
                continue
            trip_date = str(item.get('trip_date', ''))[:20]
            return_date = str(item.get('return_date', ''))[:20]
            adults = max(0, min(500, int(item.get('adults', 2) or 0)))
            trip = Trip(
                customer_name=str(item.get('group_name', '')).strip()[:100],
                trip_date=trip_date,
                return_date=return_date,
                days=max(1, min(60, int(item.get('days', 2) or 2))),
                adults=adults,
                total_people=adults,
                status=str(item.get('status', '草稿'))[:20],
                notes=f'由 Excel 工作表「{source_sheet}」匯入，請確認人數、成本與行程內容。',
                itinerary_data='{}',
            )
            db.session.add(trip)
            db.session.flush()
            signals = item.get('signals') if isinstance(item.get('signals'), list) else []
            operation = TripOperation(
                trip_id=trip.id,
                group_name=str(item.get('group_name', '')).strip()[:200],
                source_sheet=source_sheet,
                payment_status='待核對',
                supplier_notes='；'.join(str(value) for value in signals)[:2000],
            )
            db.session.add(operation)
            log_activity('create', 'trip', f'Excel 匯入：{trip.customer_name}')
            created.append({'id': trip.id, 'source_sheet': source_sheet})
        db.session.commit()
        return jsonify({'created': created, 'skipped': skipped, 'created_count': len(created)}), 201

    @app.get('/api/trips/<int:trip_id>/operations')
    @require_role('admin', 'viewer')
    def get_trip_operations(trip_id):
        trip = db.get_or_404(Trip, trip_id)
        operation = operation_for(trip.id)
        return jsonify(operation.to_dict() if operation else {
            **{field: 0 if field.endswith('_amount') else '' for field in OPERATION_FIELDS},
            'group_name': trip.customer_name,
        })

    @app.put('/api/trips/<int:trip_id>/operations')
    @require_role('admin')
    def update_trip_operations(trip_id):
        trip = db.get_or_404(Trip, trip_id)
        data = request.get_json(silent=True) or {}
        operation = operation_for(trip.id) or TripOperation(trip_id=trip.id)
        db.session.add(operation)
        for field in OPERATION_FIELDS:
            if field not in data:
                continue
            if field.endswith('_amount'):
                setattr(operation, field, max(0, int(data[field] or 0)))
            else:
                limit = 200 if field in ('group_name', 'source_sheet') else 4000
                setattr(operation, field, str(data[field]).strip()[:limit])
        if operation.group_name:
            trip.customer_name = operation.group_name[:100]
        trip.updated_at = datetime.utcnow()
        log_activity('update', 'trip', f'團務資料：{trip.customer_name}')
        db.session.commit()
        return jsonify(operation.to_dict())

    return TripOperation
