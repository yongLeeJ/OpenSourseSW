import sqlite3
from flask_cors import CORS
from flask import Flask, g, jsonify, request
from datetime import datetime, timedelta

DATABASE = 'database.db'
app = Flask(__name__)
CORS(app)

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

def init_db():
    db = get_db()
    with open('schema.sql', 'r', encoding='utf-8') as f:
        db.cursor().executescript(f.read())
    db.commit()
    db.close()

# ================== 태그 API ==================

@app.route('/tags/list', methods=['GET'])
def get_tags():
    tags = query_db('SELECT id, name, color FROM tags')
    return jsonify([dict(row) for row in tags])

@app.route('/tags/new', methods=['POST'])
def add_tag():
    data = request.get_json()
    if not data or 'name' not in data:
        return jsonify({'error': '태그 이름을 입력해주세요.'}), 400
    name = data['name']
    color = data.get('color', '#3788d8')  
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute("INSERT INTO tags (name, color) VALUES (?, ?)", (name, color))
        db.commit()
        tag_id = cursor.lastrowid
        return jsonify({'message': '새로운 태그가 추가되었습니다.', 'id': tag_id}), 201
    except sqlite3.Error as e:
        db.rollback()
        return jsonify({'error': f'태그 추가에 실패했습니다: {str(e)}'}), 500
    finally:
        cursor.close()

# ================== 이벤트 API ==================

@app.route('/events/list', methods=['GET'])
def get_events():
    sort_by_priority = request.args.get('sort_by_priority', 'false').lower() == 'true'
    due_soon_days = request.args.get('due_soon_days', type=int)
    query = 'SELECT id, title, description, start_date, end_date, priority, recurrence, completed FROM events'
    where_clauses = []
    order_clauses = []
    args = []

    if due_soon_days is not None:
        today = datetime.now().strftime('%Y-%m-%d')
        due_date_threshold = (datetime.now() + timedelta(days=due_soon_days)).strftime('%Y-%m-%d')
        where_clauses.append('end_date BETWEEN ? AND ?')
        args.extend([today, due_date_threshold])
        order_clauses.append('end_date ASC')
    if sort_by_priority:
        order_clauses.append('priority ASC')
    if where_clauses:
        query += ' WHERE ' + ' AND '.join(where_clauses)
    if order_clauses:
        query += ' ORDER BY ' + ', '.join(order_clauses)
    events = query_db(query, args)

    events_with_tags = []
    for event_row in events:
        event_dict = dict(event_row)
        tags = query_db(
            'SELECT t.id, t.name, t.color FROM tags t JOIN event_tags et ON t.id = et.tag_id WHERE et.event_id = ?',
            (event_dict['id'],)
        )
        event_dict['tags'] = [dict(tag_row) for tag_row in tags]
        events_with_tags.append(event_dict)

    return jsonify(events_with_tags)

@app.route('/events/by_date', methods=['GET'])
def get_events_by_date():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')
    if not start_date_str or not end_date_str:
        return jsonify({'error': '시작일과 종료일을 입력해주세요.'}), 400
    try:
        datetime.strptime(start_date_str, '%Y-%m-%d')
        datetime.strptime(end_date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': '잘못된 날짜 형식입니다. YYYY-MM-DD 형식으로 입력해주세요.'}), 400
    events = query_db(
        'SELECT id, title, description, start_date, end_date, priority, recurrence, completed FROM events WHERE start_date <= ? AND end_date >= ? ORDER BY start_date ASC, priority ASC',
        (end_date_str, start_date_str)
    )
    events_with_tags = []
    for event_row in events:
        event_dict = dict(event_row)
        tags = query_db(
            'SELECT t.id, t.name, t.color FROM tags t JOIN event_tags et ON t.id = et.tag_id WHERE et.event_id = ?',
            (event_dict['id'],)
        )
        event_dict['tags'] = [dict(tag_row) for tag_row in tags]
        events_with_tags.append(event_dict)
    return jsonify(events_with_tags)

@app.route('/events/<int:id>', methods=['GET'])
def get_event(id):
    event = query_db(
        'SELECT id, title, description, start_date, end_date, priority, recurrence, completed FROM events WHERE id = ?', (id,), one=True)
    if event is None:
        return jsonify({'error': '해당 ID의 이벤트를 찾을 수 없습니다.'}), 404
    event_dict = dict(event)
    tags = query_db(
        'SELECT t.id, t.name, t.color FROM tags t JOIN event_tags et ON t.id = et.tag_id WHERE et.event_id = ?',
        (id,)
    )
    event_dict['tags'] = [dict(row) for row in tags]
    return jsonify(event_dict)

@app.route('/events/new', methods=['POST'])
def add_event():
    data = request.get_json()
    if not data or 'title' not in data or 'start_date' not in data:
        return jsonify({'error': '제목과 시작일은 필수입니다.'}), 400
    title = data['title']
    description = data.get('description')
    start_date = data['start_date']
    end_date = data.get('end_date')
    tag_ids = data.get('tag_ids', [])
    priority = data.get('priority', 0)
    recurrence = data.get('recurrence')
    completed = data.get('completed', 0)  # 기본값 0(미완료)
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute(
            "INSERT INTO events (title, description, start_date, end_date, priority, recurrence, completed) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (title, description, start_date, end_date, priority, recurrence, completed)
        )
        event_id = cursor.lastrowid
        for tag_id in tag_ids:
            cursor.execute("INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)", (event_id, tag_id))
        db.commit()
        return jsonify({'message': '새로운 이벤트가 추가되었습니다.', 'id': event_id}), 201
    except sqlite3.Error as e:
        db.rollback()
        return jsonify({'error': f'이벤트 추가에 실패했습니다: {str(e)}'}), 500
    finally:
        cursor.close()

@app.route('/events/<int:id>', methods=['PUT'])
def update_event(id):
    data = request.get_json()
    if not data:
        return jsonify({'error': '수정할 이벤트 정보를 입력해주세요.'}), 400
    db = get_db()
    try:
        cursor = db.cursor()
        event = query_db('SELECT id FROM events WHERE id = ?', (id,), one=True)
        if event is None:
            return jsonify({'error': '해당 ID의 이벤트를 찾을 수 없습니다.'}), 404
        update_fields = []
        update_args = []
        if 'title' in data:
            update_fields.append('title = ?')
            update_args.append(data['title'])
        if 'description' in data:
            update_fields.append('description = ?')
            update_args.append(data['description'])
        if 'start_date' in data:
            update_fields.append('start_date = ?')
            update_args.append(data['start_date'])
        if 'end_date' in data:
            update_fields.append('end_date = ?')
            update_args.append(data['end_date'])
        if 'priority' in data:
            update_fields.append('priority = ?')
            update_args.append(data['priority'])
        if 'recurrence' in data:
            update_fields.append('recurrence = ?')
            update_args.append(data['recurrence'])
        if 'completed' in data:
            update_fields.append('completed = ?')
            update_args.append(data['completed'])
        if not update_fields:
            return jsonify({'message': '변경된 내용이 없습니다.'}), 200
        update_args.append(id)
        cursor.execute(
            f"UPDATE events SET {', '.join(update_fields)} WHERE id = ?",
            update_args
        )
        # 태그 업데이트 (기존 태그 삭제 후 새로 추가)
        if 'tag_ids' in data:
            cursor.execute("DELETE FROM event_tags WHERE event_id = ?", (id,))
            for tag_id in data['tag_ids']:
                cursor.execute("INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)", (id, tag_id))
        db.commit()
        return jsonify({'message': '이벤트가 성공적으로 업데이트되었습니다.', 'id': id}), 200
    except sqlite3.Error as e:
        db.rollback()
        return jsonify({'error': f'이벤트 업데이트에 실패했습니다: {str(e)}'}), 500
    finally:
        cursor.close()

@app.route('/events/<int:id>', methods=['DELETE'])
def delete_event(id):
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute("DELETE FROM events WHERE id = ?", (id,))
        if cursor.rowcount == 0:
            return jsonify({'error': '해당 ID의 이벤트를 찾을 수 없습니다.'}), 404
        db.commit()
        return jsonify({'message': '이벤트가 성공적으로 삭제되었습니다.'}), 200
    except sqlite3.Error as e:
        db.rollback()
        return jsonify({'error': f'이벤트 삭제에 실패했습니다: {str(e)}'}), 500
    finally:
        cursor.close()

@app.route('/events/<int:id>/completed', methods=['PATCH'])
def toggle_event_completed(id):
    db = get_db()
    try:
        cursor = db.cursor()
        cursor.execute("SELECT completed FROM events WHERE id = ?", (id,))
        row = cursor.fetchone()
        if row is None:
            return jsonify({'error': '해당 ID의 이벤트를 찾을 수 없습니다.'}), 404
        current_completed = row['completed'] if isinstance(row, sqlite3.Row) else row[0]
        new_completed = 0 if current_completed else 1
        cursor.execute("UPDATE events SET completed = ? WHERE id = ?", (new_completed, id))
        db.commit()
        return jsonify({'id': id, 'completed': new_completed}), 200
    except sqlite3.Error as e:
        db.rollback()
        return jsonify({'error': f'이벤트 완료 상태 토글에 실패했습니다: {str(e)}'}), 500
    finally:
        cursor.close()

if __name__ == '__main__':
    with app.app_context():
        init_db()
    app.run(debug=True)
