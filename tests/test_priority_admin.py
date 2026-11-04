import os
import subprocess
import sys
import unittest


class PriorityAdminTest(unittest.TestCase):
    def test_independent_password_and_aggregate_access(self):
        code = r'''
import base64, os
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['SURVEY_ADMIN_PASSWORD'] = 'this-is-a-long-test-password-123456'
from backend.app import app, db
import backend.priorities
import backend.priority_admin
with app.app_context():
    db.create_all()
client = app.test_client()
assert client.get('/api/priorities/admin/summary').status_code == 401
basic = base64.b64encode(b'owner:wrong-password').decode()
assert client.get('/api/priorities/admin/summary', headers={'Authorization':'Basic '+basic}).status_code == 401
basic = base64.b64encode(b'owner:this-is-a-long-test-password-123456').decode()
r = client.get('/api/priorities/admin/summary', headers={'Authorization':'Basic '+basic})
assert r.status_code == 200 and r.json['count'] == 0
assert r.headers['Cache-Control'] == 'no-store'
del os.environ['SURVEY_ADMIN_PASSWORD']
assert client.get('/api/priorities/admin/summary', headers={'Authorization':'Basic '+basic}).status_code == 503
'''
        p = subprocess.run([sys.executable, '-c', code], capture_output=True, text=True, env=os.environ.copy())
        self.assertEqual(p.returncode, 0, p.stderr)


if __name__ == '__main__':
    unittest.main()

