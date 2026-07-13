import io
import os
import tempfile
import unittest

from openpyxl import Workbook

_temp_dir = tempfile.TemporaryDirectory()
os.environ['DATABASE_URL'] = f"sqlite:///{os.path.join(_temp_dir.name, 'group-import.db')}"
os.environ['SECRET_KEY'] = 'test-secret'

from backend.app import ActivityLog, Trip, TripOperation, User, app, db  # noqa: E402
from backend.group_import import parse_sheet_dates, preview_workbook  # noqa: E402


def workbook_bytes():
    workbook = Workbook()
    sheet = workbook.active
    sheet.title = '0702-0705台南團X14'
    sheet.append(['項目', '單價', '數量', '總價', '備註'])
    sheet.append(['機票', 3500, 14, 49000, '已付款'])
    sheet.append(['雙人房', 5000, 7, 35000, '已付訂金'])
    cancelled = workbook.create_sheet('20260303-0305測試團-取消')
    cancelled.append(['行程', '航班', '未付款'])
    reference = workbook.create_sheet('景點參考')
    reference.append(['景點', '價格'])
    output = io.BytesIO()
    workbook.save(output)
    return output.getvalue()


class GroupImportTest(unittest.TestCase):
    @classmethod
    def tearDownClass(cls):
        with app.app_context():
            db.session.remove()
            db.engine.dispose()
        _temp_dir.cleanup()

    def setUp(self):
        app.config.update(TESTING=True)
        with app.app_context():
            database_path = db.engine.url.database
            if database_path and database_path != ':memory:':
                os.makedirs(os.path.dirname(database_path), exist_ok=True)
            db.drop_all()
            db.create_all()
            admin = User(username='admin-import', role='admin', display_name='管理員')
            admin.set_password('password')
            viewer = User(username='viewer-import', role='viewer', display_name='檢視者')
            viewer.set_password('password')
            db.session.add_all([admin, viewer])
            db.session.commit()
        self.client = app.test_client()

    def login(self, username='admin-import'):
        response = self.client.post('/api/auth/login', json={'username': username, 'password': 'password'})
        self.assertEqual(response.status_code, 200)

    def test_date_parser_handles_compact_cross_month_ranges(self):
        self.assertEqual(parse_sheet_dates('0529-0601測試', 2026), ('2026-05-29', '2026-06-01'))
        self.assertEqual(parse_sheet_dates('729-82測試', 2026), ('2026-07-29', '2026-08-02'))

    def test_preview_classifies_sheets_and_detects_signals(self):
        items = preview_workbook(workbook_bytes())
        self.assertEqual(len(items), 3)
        self.assertEqual(items[0]['kind'], 'trip')
        self.assertTrue(items[0]['selected'])
        self.assertEqual(items[0]['adults'], 14)
        self.assertIn('含付款資訊', items[0]['signals'])
        self.assertEqual(items[1]['kind'], 'cancelled')
        self.assertFalse(items[1]['selected'])
        self.assertEqual(items[2]['kind'], 'reference')

    def test_preview_import_deduplication_and_operations_update(self):
        self.login()
        preview = self.client.post('/api/trips/import/preview', data={
            'file': (io.BytesIO(workbook_bytes()), 'groups.xlsx'),
        }, content_type='multipart/form-data')
        self.assertEqual(preview.status_code, 200)
        self.assertEqual(preview.json['counts']['trip'], 1)

        imported = self.client.post('/api/trips/import', json={'items': preview.json['items']})
        self.assertEqual(imported.status_code, 201)
        self.assertEqual(imported.json['created_count'], 1)
        trip_id = imported.json['created'][0]['id']

        repeated = self.client.post('/api/trips/import', json={'items': preview.json['items']})
        self.assertEqual(repeated.json['created_count'], 0)
        self.assertEqual(len(repeated.json['skipped']), 1)

        updated = self.client.put(f'/api/trips/{trip_id}/operations', json={
            'group_name': '台南測試團', 'payment_status': '已付訂金',
            'deposit_amount': 10000, 'rooming_details': '雙人房 7 間',
        })
        self.assertEqual(updated.status_code, 200)
        self.assertEqual(updated.json['deposit_amount'], 10000)
        with app.app_context():
            self.assertEqual(db.session.get(Trip, trip_id).customer_name, '台南測試團')
            self.assertEqual(TripOperation.query.filter_by(trip_id=trip_id).count(), 1)
            self.assertGreater(ActivityLog.query.filter_by(target_type='trip').count(), 0)

    def test_viewer_cannot_preview_or_update(self):
        self.login('viewer-import')
        preview = self.client.post('/api/trips/import/preview', data={
            'file': (io.BytesIO(workbook_bytes()), 'groups.xlsx'),
        }, content_type='multipart/form-data')
        self.assertEqual(preview.status_code, 403)


if __name__ == '__main__':
    unittest.main()
