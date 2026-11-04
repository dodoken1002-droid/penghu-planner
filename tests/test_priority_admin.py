import os
import subprocess
import sys
import unittest

class PriorityAdminTest(unittest.TestCase):
    def test_existing_session_roles(self):
        code = r'''
import os
os.environ['DATABASE_URL'] = 'sqlite:///:memory:'
os.environ['SECRET_KEY'] = 'test-only-secret-with-at-least-32-characters'
from backend.app import app, db
import backend.priorities
import backend.priority_admin
with app.app_context():
    db.create_all()
client = app.test_client()
assert client.get('/api/priorities/admin/summary').status_code == 401
assert client.get('/priorities/admin').status_code == 401
with client.session_transaction() as sess:
    sess['user_id'] = 1
    sess['role'] = 'editor'
assert client.get('/api/priorities/admin/summary').status_code == 403
assert client.get('/priorities/admin').status_code == 403
with client.session_transaction() as sess:
    sess['role'] = 'viewer'
assert client.get('/api/priorities/admin/summary').status_code == 403
with client.session_transaction() as sess:
    sess['role'] = 'admin'
    sess['username'] = 'other-admin'
assert client.get('/api/priorities/admin/summary').status_code == 403
with client.session_transaction() as sess:
    sess['username'] = 'admin'
r = client.get('/api/priorities/admin/summary')
assert r.status_code == 200 and r.json['count'] == 0
assert r.headers['Cache-Control'] == 'no-store'
assert client.get('/priorities/admin').status_code == 200
del os.environ['SECRET_KEY']
assert client.get('/api/priorities/admin/summary').status_code == 503
'''
        p = subprocess.run([sys.executable, '-c', code], capture_output=True, text=True, env=os.environ.copy())
        self.assertEqual(p.returncode, 0, p.stderr)

if __name__ == '__main__':
    unittest.main()
