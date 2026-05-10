import os
from backend.app import app, db
from backend.seed_data import seed_database

# 初始化資料庫（gunicorn 啟動時執行）
with app.app_context():
    db.create_all()
    seed_database()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)
