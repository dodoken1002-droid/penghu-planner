"""Read-only, authenticated aggregates for the miniature island view.

No migrations, external requests, customer fields, or raw audit text are used.
"""
from collections import Counter
from datetime import date, datetime, timedelta, timezone
import json
from threading import Lock
from time import monotonic

from flask import jsonify, redirect, request, send_from_directory, session
from sqlalchemy import func, or_

ISLAND_IDS = ('magong', 'inland', 'wang', 'east', 'north', 'qimei')
TAIPEI = timezone(timedelta(hours=8))


def island_for(name, location):
    text = f'{name or ""} {location or ""}'
    for island, words in (
        ('qimei', ('七美', '雙心石滬')),
        ('wang', ('望安', '花宅')),
        ('inland', ('內海', '小城故事')),
        ('east', ('東海', '員貝', '澎澎灘', '屈爪', '鳥嶼')),
        ('north', ('北海', '吉貝', '赤崁')),
        ('magong', ('馬公', '白沙', '西嶼', '湖西', '本島', '天后宮')),
    ):
        if any(word in text for word in words):
            return island
    return None


def trip_islands(raw, day_number, attractions):
    """Only saved catalog IDs count; no guesses from customer notes or transport."""
    try:
        itinerary = json.loads(raw or '{}')
    except (ValueError, TypeError):
        return set()
    if not isinstance(itinerary, dict) or not isinstance(itinerary.get('days'), list):
        return set()
    result = set()
    for day in itinerary['days']:
        if not isinstance(day, dict) or day.get('day') != day_number:
            continue
        for slot in ('am_attractions', 'pm_attractions'):
            entries = day.get(slot)
            if not isinstance(entries, list):
                continue
            for entry in entries:
                if not isinstance(entry, dict):
                    continue
                try:
                    catalog = attractions.get(int(entry.get('id')))
                except (ValueError, TypeError):
                    continue
                if catalog:
                    island = island_for(catalog.name, catalog.location)
                    if island:
                        result.add(island)
    return result


def register_islands(app, db, Trip, Attraction, TripBookingCheck, ActivityLog, require_role, frontend_dir):
    cache = {}
    cache_lock = Lock()

    @app.route('/islands')
    @app.route('/islands/')
    def islands_page():
        if 'user_id' not in session:
            return redirect('/login')
        if session.get('role') not in ('admin', 'viewer'):
            return '此帳號沒有行程檢視權限。', 403
        return send_from_directory(frontend_dir, 'islands/index.html')

    @app.route('/api/islands/summary')
    @require_role('admin', 'viewer')
    def islands_summary():
        raw_date = request.args.get('date')
        try:
            selected = date.fromisoformat(raw_date) if raw_date else datetime.now(TAIPEI).date()
            if raw_date and selected.isoformat() != raw_date:
                raise ValueError()
        except ValueError:
            return jsonify(error='日期需為 YYYY-MM-DD'), 400
        day_key = selected.isoformat()
        # Authenticate before cache lookup. Small shared cache bounds DB work per service.
        with cache_lock:
            existing = cache.get(day_key)
            if not app.testing and existing and monotonic() - existing[0] < 25:
                return _response(existing[1])

        now = datetime.now(timezone.utc)
        utc_now = now.replace(tzinfo=None)
        since = utc_now - timedelta(hours=24)
        catalog = {a.id: a for a in db.session.query(Attraction.id, Attraction.name, Attraction.location).all()}
        # Select only fields needed for aggregation, never Trip.to_dict().
        candidates = db.session.query(
            Trip.id, Trip.trip_date, Trip.return_date, Trip.days,
            Trip.total_people, Trip.itinerary_data,
        ).filter(
            Trip.status == '確認', Trip.trip_date <= day_key,
            or_(Trip.return_date >= day_key, Trip.return_date == '', Trip.return_date.is_(None)),
        ).all()
        selected_trips = []
        for trip in candidates:
            try:
                start = date.fromisoformat(trip.trip_date)
                end = date.fromisoformat(trip.return_date) if trip.return_date else start + timedelta(days=max(1, trip.days or 1) - 1)
            except (ValueError, TypeError, OverflowError):
                continue
            if start <= selected <= end:
                selected_trips.append((trip, (selected - start).days + 1))

        ids = [t.id for t, _ in selected_trips]
        confirmed_by_trip = Counter()
        if ids:
            for row in db.session.query(TripBookingCheck.trip_id, func.count(TripBookingCheck.id)).filter(
                TripBookingCheck.trip_id.in_(ids), TripBookingCheck.is_confirmed.is_(True),
                TripBookingCheck.category.in_(('itinerary', 'transportation', 'accommodation')),
            ).group_by(TripBookingCheck.trip_id).all():
                confirmed_by_trip[row[0]] = row[1]

        islands = {key: dict(id=key, people=0, groups=0, confirmedChecks=0, totalChecks=0) for key in ISLAND_IDS}
        total_people, unmapped = 0, 0
        for trip, day_number in selected_trips:
            people = max(0, trip.total_people or 0)
            total_people += people
            mapped = trip_islands(trip.itinerary_data, day_number, catalog)
            if not mapped:
                unmapped += 1
            for key in mapped:
                island = islands[key]
                island['groups'] += 1
                island['people'] += people
                island['confirmedChecks'] += min(3, confirmed_by_trip[trip.id])
                island['totalChecks'] += 3

        # SQL groups audit records; no username, target_name, IP, or raw text is selected.
        audit_filter = (ActivityLog.created_at >= since, ActivityLog.created_at <= utc_now,
                        ActivityLog.action.in_(('create', 'update', 'delete')))
        collaboration = db.session.query(
            func.count(ActivityLog.id), func.count(func.distinct(ActivityLog.user_id)),
        ).filter(*audit_filter).one()
        if db.engine.dialect.name == 'postgresql':
            bucket = func.date_trunc('hour', ActivityLog.created_at)
        else:
            bucket = func.strftime('%Y-%m-%d %H:00:00', ActivityLog.created_at)
        buckets = db.session.query(bucket.label('bucket'), func.count(ActivityLog.id)).filter(
            *audit_filter,
        ).group_by(bucket).order_by(bucket.desc()).limit(12).all()
        events = []
        for stamp, count in buckets:
            timestamp = datetime.fromisoformat(stamp) if isinstance(stamp, str) else stamp
            local = timestamp.replace(tzinfo=timezone.utc).astimezone(TAIPEI)
            events.append(dict(time=local.strftime('%H:%M'), date=local.strftime('%m/%d'),
                               title='後台協作更新', text=f'此時段共 {count} 次新增、更新或停用操作（匿名彙整）。'))

        snapshot = dict(
            mode='planner', source='penghu-planner', date=day_key, updatedAt=now.isoformat(),
            trips=list(islands.values()), events=events,
            summary=dict(groups=len(ids), people=total_people, unmappedGroups=unmapped,
                         confirmedChecks=sum(min(3, confirmed_by_trip[i]) for i in ids), totalChecks=3 * len(ids),
                         collaborationActions=collaboration[0], collaboratingStaff=collaboration[1]),
        )
        if not app.testing:
            with cache_lock:
                cache[day_key] = (monotonic(), snapshot)
                while len(cache) > 32:
                    del cache[next(iter(cache))]
        return _response(snapshot)


def _response(snapshot):
    response = jsonify(snapshot)
    response.headers['Cache-Control'] = 'private, no-store'
    response.headers['Vary'] = 'Cookie'
    return response
