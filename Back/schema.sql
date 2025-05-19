/*
/*태그 테이블 생성*/
import sqlite3
from flask import Flask, g, jsonify

DATABASE = 'database.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row  # 결과를 딕셔너리 형태로 받을 수 있도록 설정
    return conn

def init_db():
    db = get_db()
    try:
        with open('schema.sql', 'r', encoding='utf-8') as f:
            db.cursor().executescript(f.read())
    except UnicodeDecodeError:
        print("UTF-8 인코딩 실패. CP949로 재시도합니다.")
        with open('schema.sql', 'r', encoding='cp949') as f:
            db.cursor().executescript(f.read())
    db.commit()
    db.close()

app = Flask(__name__)

def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        db.row_factory = sqlite3.Row
    return db

@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()

def query_db(query, args=(), one=False):
    cur = get_db().execute(query, args)
    rv = cur.fetchall()
    cur.close()
    return (rv[0] if rv else None) if one else rv

@app.route('/tags/list', methods=['GET'])
def get_tags():
    tags = query_db('SELECT id, name FROM tags')
    return jsonify([dict(row) for row in tags])

if __name__ == '__main__':
    #init_db() # 데이터베이스 초기화
    app.run(debug=True) # Flask 개발 서버 실행 (이 부분을 if __name__ == '__main__': 안으로 옮겼습니다.)
*/

/* 태그 테이블 생성 */
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL
);

/* 이벤트 테이블 생성 */
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_date TEXT NOT NULL,
    end_date TEXT
);