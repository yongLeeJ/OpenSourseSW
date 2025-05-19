import sqlite3
from flask import Flask, g, jsonify, request

DATABASE = 'database.db'

def get_db():
    conn = sqlite3.connect(DATABASE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    db = get_db()
    with open('schema.sql', 'r', encoding='utf-8') as f:
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

# 새 태그 추가 api
@app.route('/tags/new', methods=['POST'])
def add_tag():
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'error': '태그 이름을 입력해주세요.'}), 400

    name = data['name']
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute("INSERT INTO tags (name) VALUES (?)", (name,))
        db.commit()
        tag_id = cursor.lastrowid
        return jsonify({'message': '새로운 태그가 추가되었습니다.', 'id': tag_id}), 201
    except sqlite3.Error as e:
        db.rollback()
        return jsonify({'error': f'태그 추가에 실패했습니다: {str(e)}'}), 500
    finally:
        cursor.close()

# 전체 이벤트 조회 api
@app.route('/events/list', methods=['GET'])
def get_events():
    events = query_db('SELECT id, title, description, start_date, end_date FROM events')
    return jsonify([dict(row) for row in events])

# 특정 이벤트 조회 api
@app.route('/events/<int:id>', methods=['GET'])
def get_event(id):
    event = query_db('SELECT id, title, description, start_date, end_date FROM events WHERE id = ?', (id,), one=True)
    if event is None:
        return jsonify({'error': '해당 ID의 이벤트를 찾을 수 없습니다.'}), 404
    return jsonify(dict(event))

if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(debug=True)