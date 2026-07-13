

import os
import tempfile
import unittest

_temp_dir = tempfile.TemporaryDirectory()
os.environ['DATABASE_URL'] = f"sqlite:///{os.path.join(_temp_dir.name, 'booking-checks.db')}"
os.environ['SECRET_KEY'] = 'test-secret'

from backend.app import (  # noqa: E402
    ActivityLog,
    Trip,
    TripBookingCheck,
    User,
    app,
    db,
)


class BookingChecksApiTest(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        with app.app_context():
            db.session.remove()
            db.engine.dispose()
        _temp_dir.cleanup()

    def setUp(self):
        app.config.update(TESTING=True)
        with app.app_context():
            db.drop_all()
            db.create_all()

            admin = User(username='admin-test', role='admin', display_name='王小明')
            admin.set_password('password')
            viewer = User(username='viewer-test', role='viewer', display_name='出團確認員')
            viewer.set_password('password')
            editor = User(username='editor-test', role='editor', display_name='資料編輯員')
            editor.set_password('password')
            trip = Trip(
                customer_name='測試旅客',
                trip_date='2026-08-01',
                return_date='2026-08-03',
                days=3,
                adults=2,
                total_people=2,
                itinerary_data='{}',
            )
            db.session.add_all([admin, viewer, editor, trip])
            db.session.commit()
            self.trip_id = trip.id

        self.client = app.test_client()

    def login(self, username):
        response = self.client.post('/api/auth/login', json={
            'username': username,
            'password': 'password',
        })
        self.assertEqual(response.status_code, 200)

    @staticmethod
    def checks(itinerary=False, transportation=False, accommodation=False):
        return {
            'checks': {
                'itinerary': {'confirmed': itinerary, 'note': '行程訂位 A001'},
                'transportation': {'confirmed': transportation, 'note': '車輛訂位 B002'},
                'accommodation': {'confirmed': accommodation, 'note': '住宿訂位 C003'},
            }
        }

    def test_tracks_partial_and_complete_booking_progress(self):
        self.login('viewer-test')

        initial = self.client.get(f'/api/trips/{self.trip_id}/booking-checks')
        self.assertEqual(initial.status_code, 200)
        self.assertEqual(initial.json['status'], 'pending')
        self.assertEqual(initial.json['confirmed_count'], 0)

        partial = self.client.put(
            f'/api/trips/{self.trip_id}/booking-checks',
            json=self.checks(itinerary=True),
        )
        self.assertEqual(partial.status_code, 200)
        self.assertEqual(partial.json['status'], 'partial')
        confirmed = next(item for item in partial.json['items'] if item['category'] == 'itinerary')
        self.assertEqual(confirmed['confirmed_by'], '出團確認員')
        self.assertTrue(confirmed['confirmed_at'])

        complete = self.client.put(
            f'/api/trips/{self.trip_id}/booking-checks',
            json=self.checks(True, True, True),
        )
        self.assertEqual(complete.status_code, 200)
        self.assertEqual(complete.json['status'], 'complete')
        self.assertEqual(complete.json['confirmed_count'], 3)

        trips = self.client.get('/api/trips')
        self.assertEqual(trips.status_code, 200)
        self.assertEqual(trips.json[0]['booking_summary']['status'], 'complete')

    def test_unchecking_clears_confirmation_identity_and_time(self):
        self.login('admin-test')
        self.client.put(
            f'/api/trips/{self.trip_id}/booking-checks',
            json=self.checks(itinerary=True),
        )
        response = self.client.put(
            f'/api/trips/{self.trip_id}/booking-checks',
            json=self.checks(itinerary=False),
        )
        item = next(entry for entry in response.json['items'] if entry['category'] == 'itinerary')
        self.assertFalse(item['confirmed'])
        self.assertEqual(item['confirmed_by'], '')
        self.assertEqual(item['confirmed_at'], '')

    def test_copy_starts_with_a_fresh_checklist_and_delete_cascades(self):
        self.login('admin-test')
        self.client.put(
            f'/api/trips/{self.trip_id}/booking-checks',
            json=self.checks(True, True, True),
        )

        copied = self.client.post(f'/api/trips/{self.trip_id}/copy')
        self.assertEqual(copied.status_code, 201)
        self.assertEqual(copied.json['booking_summary']['status'], 'pending')

        deleted = self.client.delete(f'/api/trips/{self.trip_id}')
        self.assertEqual(deleted.status_code, 200)
        with app.app_context():
            self.assertEqual(
                TripBookingCheck.query.filter_by(trip_id=self.trip_id).count(),
                0,
            )
            self.assertGreater(ActivityLog.query.filter_by(target_type='booking_check').count(), 0)

    def test_rejects_invalid_payload_and_editor_role(self):
        self.login('editor-test')
        forbidden = self.client.put(
            f'/api/trips/{self.trip_id}/booking-checks',
            json=self.checks(itinerary=True),
        )
        self.assertEqual(forbidden.status_code, 403)

        self.client.post('/api/auth/logout')
        self.login('admin-test')
        invalid = self.client.put(
            f'/api/trips/{self.trip_id}/booking-checks',
            json={'checks': {'flight': {'confirmed': True}}},
        )
        self.assertEqual(invalid.status_code, 400)


if __name__ == '__main__':
    unittest.main()




