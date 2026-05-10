import os
from backend.app import app, db
from backend.seed_data import seed_database

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_database()

    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') != 'production'
    print(f'Server starting at http://localhost:{port}')
    app.run(host='0.0.0.0', debug=debug, port=port)
