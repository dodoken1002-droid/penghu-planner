import unittest
from sqlalchemy.engine import make_url
from backend.database_url import normalize_database_url


class DatabaseUrlTest(unittest.TestCase):
    def test_railway_urls_explicitly_select_installed_psycopg2(self):
        for prefix in ('postgres://', 'postgresql://'):
            url = make_url(normalize_database_url(prefix + 'user:pass@db:5432/planner?sslmode=require'))
            self.assertEqual(url.drivername, 'postgresql+psycopg2')
            self.assertEqual(url.username, 'user')
            self.assertEqual(url.password, 'pass')
            self.assertEqual(url.query['sslmode'], 'require')

    def test_preserves_sqlite_and_explicit_driver_urls(self):
        for url in ('sqlite:///:memory:', 'postgresql+psycopg2://user@db/planner', 'postgresql+psycopg://user@db/planner'):
            self.assertEqual(normalize_database_url(url), url)


if __name__ == '__main__':
    unittest.main()
