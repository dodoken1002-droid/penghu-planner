"""Keep Railway URLs on the PostgreSQL driver installed in requirements.txt."""


def normalize_database_url(url):
    for prefix in ('postgres://', 'postgresql://'):
        if url.startswith(prefix):
            return 'postgresql+psycopg2://' + url[len(prefix):]
    return url
