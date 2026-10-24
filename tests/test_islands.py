import json
import os
import tempfile
import unittest
from datetime import datetime, timedelta, timezone

_temp = tempfile.TemporaryDirectory()
os.environ['DATABASE_URL'] = 'sqlite:///' + os.path.join(_temp.name, 'islands.db')
os.environ['SECRET_KEY'] = 'islands-test-only'

from backend.app import app, db, Attraction, Trip, TripBookingCheck, ActivityLog  # noqa: E402


class IslandsTest(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        with app.app_context():
            db.session.remove()
            db.engine.dispose()
        _temp.cleanup()

    def setUp(self):
        app.config.update(TESTING=True, SESSION_COOKIE_SECURE=False)
        with app.app_context():
            db.drop_all()
            db.create_all()
            db.session.add_all([
                Attraction(id=1, name='七美雙心石滬', location='七美島'),
                Attraction(id=2, name='望安綠蠵龜', location='望安島'),
                Attraction(id=3, name='澎湖天后宮', location='馬公市'),
            ])
            itinerary = json.dumps({'days': [
                {'day': 1, 'am_attractions': [{'id': 1}, {'id': 1}], 'pm_attractions': [{'id': 2}]},
                {'day': 2, 'am_attractions': [{'id': 3}], 'pm_attractions': []},
            ]})
            db.session.add_all([
                Trip(id=1, status='確認', trip_date='2026-10-24', return_date='2026-10-25', days=2,
                     total_people=12, itinerary_data=itinerary, customer_name='SECRET_CUSTOMER',
                     customer_phone='PRIVATE_PHONE', notes='PRIVATE_NOTE'),
                Trip(id=2, status='取消', trip_date='2026-10-24', return_date='2026-10-25',
                     total_people=99, itinerary_data=itinerary),
                Trip(id=3, status='草稿', trip_date='2026-10-24', return_date='2026-10-25',
                     total_people=99, itinerary_data=itinerary),
                Trip(id=4, status='確認', trip_date='2026-10-24', return_date='', days=1,
                     total_people=3, itinerary_data='malformed'),
            ])
            db.session.flush()
            db.session.add_all([
                TripBookingCheck(trip_id=1, category='itinerary', is_confirmed=True,
                                 note='PRIVATE_BOOKING_NOTE', confirmed_by='PRIVATE_STAFF'),
                ActivityLog(user_id=1, username='PRIVATE_STAFF', action='update', target_type='trip',
                            target_name='SECRET_CUSTOMER', ip_address='PRIVATE_IP', created_at=datetime.now(timezone.utc).replace(tzinfo=None)-timedelta(hours=1)),
                ActivityLog(user_id=1, username='PRIVATE_STAFF', action='update', target_type='trip',
                            target_name='SECRET_CUSTOMER', created_at=datetime.now(timezone.utc).replace(tzinfo=None)-timedelta(hours=2)),
                ActivityLog(user_id=2, action='login', created_at=datetime.now(timezone.utc).replace(tzinfo=None)),
            ])
            db.session.commit()
        self.client = app.test_client()

    def login(self, role='viewer'):
        with self.client.session_transaction() as session:
            session.update(user_id=1, role=role)

    def snapshot(self, day='2026-10-24'):
        return self.client.get('/api/islands/summary?date=' + day)

    def test_page_and_api_require_same_existing_trip_roles(self):
        self.assertEqual(self.client.get('/islands/').status_code, 302)
        self.assertEqual(self.snapshot().status_code, 401)
        self.login('editor')
        self.assertEqual(self.snapshot().status_code, 403)
        self.assertEqual(self.client.get('/islands/').status_code, 403)
        for role in ('viewer', 'admin'):
            self.login(role)
            self.assertEqual(self.client.get('/islands/').status_code, 200)
            self.assertEqual(self.snapshot().status_code, 200)

    def test_counts_confirmed_only_and_deduplicates_cross_island_totals(self):
        self.login()
        data = self.snapshot().json
        self.assertEqual(data['summary']['groups'], 2)
        self.assertEqual(data['summary']['people'], 15)
        self.assertEqual(data['summary']['unmappedGroups'], 1)
        self.assertEqual(data['summary']['confirmedChecks'], 1)
        self.assertEqual(data['summary']['totalChecks'], 6)
        islands = {t['id']: t for t in data['trips']}
        self.assertEqual(islands['qimei']['groups'], 1)
        self.assertEqual(islands['qimei']['people'], 12)
        self.assertEqual(islands['wang']['people'], 12)
        self.assertEqual(islands['magong']['people'], 0)
        self.assertEqual(data['summary']['collaborationActions'], 2)
        self.assertEqual(data['summary']['collaboratingStaff'], 1)

    def test_date_uses_correct_itinerary_day_and_handles_empty_date(self):
        self.login()
        data = self.snapshot('2026-10-25').json
        self.assertEqual(data['summary']['people'], 12)
        self.assertEqual(next(t for t in data['trips'] if t['id'] == 'magong')['people'], 12)
        self.assertEqual(next(t for t in data['trips'] if t['id'] == 'qimei')['people'], 0)
        self.assertEqual(self.snapshot('2026-10-26').json['summary']['groups'], 0)
        self.assertEqual(self.snapshot('invalid').status_code, 400)
        self.assertEqual(self.snapshot('20261024').status_code, 400)

    def test_payload_does_not_include_customer_or_staff_fields_and_never_writes(self):
        self.login()
        with app.app_context():
            before = (Trip.query.count(), ActivityLog.query.count(), TripBookingCheck.query.count())
        response = self.snapshot()
        for text in ('SECRET_CUSTOMER', 'PRIVATE_PHONE', 'PRIVATE_NOTE', 'PRIVATE_STAFF', 'PRIVATE_BOOKING_NOTE', 'PRIVATE_IP', 'customer_name', 'target_name', 'username', 'ip_address'):
            self.assertNotIn(text, response.get_data(as_text=True))
        self.assertEqual(response.headers['Cache-Control'], 'private, no-store')
        self.assertEqual(response.headers['Vary'], 'Cookie')
        with app.app_context():
            self.assertEqual(before, (Trip.query.count(), ActivityLog.query.count(), TripBookingCheck.query.count()))
        self.assertEqual(self.client.post('/api/islands/summary', json={}).status_code, 405)


if __name__ == '__main__':
    unittest.main()
