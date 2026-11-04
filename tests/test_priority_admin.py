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
os.environ['RAILWAY_ENVIRONMENT_NAME'] = 'test'
from backend.priorities import ISSUES, PriorityNetworkSignal
payload = {'ranking': ISSUES[:5], 'age_range':'不願透露', 'gender':'不願透露'}
for _ in range(3):
    assert client.post('/api/priorities/responses', json=payload, headers={'X-Real-IP':'198.51.100.8'}).status_code == 201
result = client.get('/api/priorities/admin/summary').json
assert result['count'] == 3
assert result['network']['groups'] == 1 and result['network']['responses'] == 3
assert next(x for x in result['issues'] if x['name'] == ISSUES[0])['ranks'] == [3,0,0,0,0]
with app.app_context():
    stored = PriorityNetworkSignal.query.first()
    assert stored and '198.51.100.8' not in stored.fingerprint
del os.environ['SECRET_KEY']
assert client.get('/api/priorities/admin/summary').status_code == 503
'''
        p = subprocess.run([sys.executable, '-c', code], capture_output=True, text=True, env=os.environ.copy())
        self.assertEqual(p.returncode, 0, p.stderr)

if __name__ == '__main__':
    unittest.main()
