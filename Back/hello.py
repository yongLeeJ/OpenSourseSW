import sqlite3
from flask_cors import CORS
from flask import Flask, g, jsonify, request
from datetime import datetime, timedelta

DATABASE = 'database.db' # 데이터 베이스 파일 경로
app = Flask(__name__)
CORS(app) # Flask 애플리케이션 초기화

## 데이터 베이스 연결 얻는 함수 - 요청당 하나의 데이터베이스 연결 유지
def get_db():
    db = getattr(g, '_database', None)
    if db is None:
        db = g._database = sqlite3.connect(DATABASE)
        # 행을 딕셔너리처럼 접근할 수 있도록 설정 (컬럼명으로 값 접근 가능)
        db.row_factory = sqlite3.Row
    return db


## 애플리케이션 컨텍스트 종료 시 데이터 베이스 연결 닫는 함수
@app.teardown_appcontext
def close_connection(exception):
    db = getattr(g, '_database', None)
    if db is not None:
        db.close()


## 데이터 베이스 쿼리를 실행 하는 헬퍼 함수
def query_db(query, args=(), one=False):
    cur = get_db().execute(query, args)
    rv = cur.fetchall()  # 모든 결과 행을 가져옴
    cur.close()
    # one=True이면 첫 번째 행만 반환, 아니면 모든 행 반환
    return (rv[0] if rv else None) if one else rv


## 데이터베이스 초기화 함수
#schema.sql 파일을 읽어 데이터베이스 스키마를 생성
def init_db():
    db = get_db()
    # 인코딩 명시 권장
    with open('schema.sql', 'r', encoding='utf-8') as f:
        db.cursor().executescript(f.read())
    db.commit()  # 변경 사항 커밋
    db.close()  # init_db에서 직접 연 연결은 닫음

## 전체 태그 조회 API
@app.route('/tags/list', methods=['GET'])
def get_tags():
    tags = query_db('SELECT id, name, color FROM tags')
    # 조회된 태그 목록을 JSON 형식으로 반환
    return jsonify([dict(row) for row in tags])


## 새 태그 추가 API
@app.route('/tags/new', methods=['POST'])
def add_tag():
    data = request.get_json()
    # 요청 본문에 'name' 필드가 없으면 에러 반환
    if not data or 'name' not in data:
        return jsonify({'error': '태그 이름을 입력해주세요.'}), 400

    name = data['name']
    db = get_db()
    try:
        cursor = db.cursor()
        # 태그 이름 삽입
        cursor.execute("INSERT INTO tags (name) VALUES (?)", (name,))
        db.commit()  # 변경 사항 커밋
        tag_id = cursor.lastrowid  # 새로 추가된 태그의 ID 가져 오기
        return jsonify({'message': '새로운 태그가 추가되었습니다.', 'id': tag_id}), 201
    except sqlite3.Error as e:
        db.rollback()  # 오류 발생 시 롤백
        return jsonify({'error': f'태그 추가에 실패했습니다: {str(e)}'}), 500
    finally:
        cursor.close()

## 전체 이벤트 조회 API
# 우선순위 정렬, 마감일 임박 필터링 옵션
@app.route('/events/list', methods=['GET'])
def get_events():
    # 쿼리 파라미터로 우선순위 정렬 여부 확인
    sort_by_priority = request.args.get('sort_by_priority', 'false').lower() == 'true'
    # 쿼리 파라미터로 마감일 임박 필터링 여부 및 임박 기준일 확인
    due_soon_days = request.args.get('due_soon_days', type=int)

    # 기본 쿼리문: 우선순위, 반복 정보 컬럼 포함
    query = 'SELECT id, title, description, start_date, end_date, priority, recurrence, completed FROM events'
    where_clauses = []
    order_clauses = []
    args = []

    # 마감일 임박 필터링
    if due_soon_days is not None:
        today = datetime.now().strftime('%Y-%m-%d')
        # 오늘부터 지정된 일수까지의 이벤트를 필터링
        due_date_threshold = (datetime.now() + timedelta(days=due_soon_days)).strftime('%Y-%m-%d')
        where_clauses.append('end_date BETWEEN ? AND ?')
        args.extend([today, due_date_threshold])
        order_clauses.append('end_date ASC')  # 마감일이 가까운 순으로 정렬

    # 우선순위 정렬 (마감일 정렬보다 후순위)
    if sort_by_priority:
        order_clauses.append('priority ASC')  # 낮은 숫자가 높은 우선순위라고 가정

    if where_clauses:
        query += ' WHERE ' + ' AND '.join(where_clauses)
    if order_clauses:
        query += ' ORDER BY ' + ', '.join(order_clauses)

    events = query_db(query, args)

    # 각 이벤트에 연결된 태그 정보 추가
    events_with_tags = []
    for event_row in events:
        event_dict = dict(event_row)
        tags = query_db(
            'SELECT t.id, t.name FROM tags t JOIN event_tags et ON t.id = et.tag_id WHERE et.event_id = ?',
            (event_dict['id'],)
        )
        event_dict['tags'] = [dict(tag_row) for tag_row in tags]
        events_with_tags.append(event_dict)

    return jsonify(events_with_tags)


## 특정 날짜 범위의 이벤트 조회 API - 캘린더 뷰 활용
@app.route('/events/by_date', methods=['GET'])
def get_events_by_date():
    start_date_str = request.args.get('start_date')
    end_date_str = request.args.get('end_date')

    if not start_date_str or not end_date_str:
        return jsonify({'error': '시작일과 종료일을 입력해주세요.'}), 400

    try:
        # 날짜 형식 검증 (YYYY-MM-DD)
        datetime.strptime(start_date_str, '%Y-%m-%d')
        datetime.strptime(end_date_str, '%Y-%m-%d')
    except ValueError:
        return jsonify({'error': '잘못된 날짜 형식입니다. YYYY-MM-DD 형식으로 입력해주세요.'}), 400

    # 시작일과 종료일 사이에 포함되는 이벤트 조회
    events = query_db(
        'SELECT id, title, description, start_date, end_date, priority, recurrence FROM events WHERE start_date <= ? AND end_date >= ? ORDER BY start_date ASC, priority ASC',
        (end_date_str, start_date_str)
    )

    # 각 이벤트에 연결된 태그 정보 추가
    events_with_tags = []
    for event_row in events:
        event_dict = dict(event_row)
        tags = query_db(
            'SELECT t.id, t.name FROM tags t JOIN event_tags et ON t.id = et.tag_id WHERE et.event_id = ?',
            (event_dict['id'],)
        )
        event_dict['tags'] = [dict(tag_row) for tag_row in tags]
        events_with_tags.append(event_dict)

    return jsonify(events_with_tags)


## 특정 이벤트 조회 API
@app.route('/events/<int:id>', methods=['GET'])
def get_event(id):
    # priority와 recurrence 컬럼을 포함하도록 쿼리 수정
    event = query_db(
        'SELECT id, title, description, start_date, end_date, priority, recurrence FROM events WHERE id = ?', (id,),
        one=True)
    if event is None:
        return jsonify({'error': '해당 ID의 이벤트를 찾을 수 없습니다.'}), 404

    event_dict = dict(event)  # 딕셔너리로 변환하여 태그 정보 추가 준비

    # 연결된 태그 정보 조회
    tags = query_db(
        'SELECT t.id, t.name FROM tags t JOIN event_tags et ON t.id = et.tag_id WHERE et.event_id = ?',
        (id,)
    )
    event_dict['tags'] = [dict(row) for row in tags]  # 태그 목록 추가
    return jsonify(event_dict)  # 수정된 딕셔너리 반환


## 새 이벤트 추가 API
# 태그, 우선순위, 반복 설정 기능
@app.route('/events/new', methods=['POST'])
def add_event():
    data = request.get_json()
    # 필수 필드 검증
    if not data or 'title' not in data or 'start_date' not in data:
        return jsonify({'error': '제목과 시작일은 필수입니다.'}), 400

    title = data['title']
    description = data.get('description')
    start_date = data['start_date']
    end_date = data.get('end_date')
    tag_ids = data.get('tag_ids', [])  # 연결할 태그 ID 목록 (리스트 형태)
    priority = data.get('priority', 0)  # 우선순위 (기본값 0)
    recurrence = data.get('recurrence')  # 반복 설정 (예: 'daily', 'weekly')

    db = get_db()
    try:
        cursor = db.cursor()
        # 이벤트 정보 삽입: priority, recurrence 컬럼 포함
        cursor.execute(
            "INSERT INTO events (title, description, start_date, end_date, priority, recurrence) VALUES (?, ?, ?, ?, ?, ?)",
            (title, description, start_date, end_date, priority, recurrence)
        )
        event_id = cursor.lastrowid  # 새로 추가된 이벤트의 ID

        # 태그가 있으면 event_tags 테이블에 연결 정보 삽입
        for tag_id in tag_ids:
            # 태그 ID가 유효한지 확인하는 로직 추가 권장 (예: tags 테이블에 해당 tag_id가 존재하는지)
            cursor.execute("INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)", (event_id, tag_id))

        db.commit()  # 모든 변경사항 커밋
        return jsonify({'message': '새로운 이벤트가 추가되었습니다.', 'id': event_id}), 201
    except sqlite3.Error as e:
        db.rollback()  # 오류 발생 시 롤백
        return jsonify({'error': f'이벤트 추가에 실패했습니다: {str(e)}'}), 500
    finally:
        cursor.close()


## 이벤트 수정 API (우선순위, 태그, 반복 포함)
@app.route('/events/<int:id>', methods=['PUT'])
def update_event(id):
    data = request.get_json()
    if not data:
        return jsonify({'error': '수정할 이벤트 정보를 입력해주세요.'}), 400

    db = get_db()
    try:
        cursor = db.cursor()

        # 현재 이벤트 존재 여부 확인
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

        if not update_fields:
            return jsonify({'message': '변경된 내용이 없습니다.'}), 200

        # 이벤트 정보 업데이트
        update_args.append(id)
        cursor.execute(
            f"UPDATE events SET {', '.join(update_fields)} WHERE id = ?",
            update_args
        )

        # 태그 업데이트 (기존 태그 삭제 후 새로 추가)
        if 'tag_ids' in data:
            cursor.execute("DELETE FROM event_tags WHERE event_id = ?", (id,))  # 기존 태그 관계 삭제
            for tag_id in data['tag_ids']:
                cursor.execute("INSERT INTO event_tags (event_id, tag_id) VALUES (?, ?)", (id, tag_id))  # 새 태그 관계 추가

        db.commit()
        return jsonify({'message': '이벤트가 성공적으로 업데이트되었습니다.', 'id': id}), 200
    except sqlite3.Error as e:
        db.rollback()
        return jsonify({'error': f'이벤트 업데이트에 실패했습니다: {str(e)}'}), 500
    finally:
        cursor.close()


# 이벤트 삭제 API
@app.route('/events/<int:id>', methods=['DELETE'])
def delete_event(id):
    db = get_db()
    try:
        cursor = db.cursor()
        # 이벤트 삭제 (FOREIGN KEY CASCADE 설정으로 event_tags도 함께 삭제됨)
        cursor.execute("DELETE FROM events WHERE id = ?", (id,))
        if cursor.rowcount == 0:  # 삭제된 행이 없으면 해당 ID의 이벤트가 없다는 의미
            return jsonify({'error': '해당 ID의 이벤트를 찾을 수 없습니다.'}), 404
        db.commit()
        return jsonify({'message': '이벤트가 성공적으로 삭제되었습니다.'}), 200
    except sqlite3.Error as e:
        db.rollback()
        return jsonify({'error': f'이벤트 삭제에 실패했습니다: {str(e)}'}), 500
    finally:
        cursor.close()

# 이벤트 완료 상태 토글 API
@app.route('/events/<int:id>/completed', methods=['PATCH'])
def toggle_event_completed(id):
    db = get_db()
    try:
        cursor = db.cursor()
        # 현재 완료 상태 확인
        cursor.execute("SELECT completed FROM events WHERE id = ?", (id,))
        row = cursor.fetchone()
        if row is None:
            return jsonify({'error': '해당 ID의 이벤트를 찾을 수 없습니다.'}), 404

        # 현재 완료값 반전(토글)
        current_completed = row['completed'] if isinstance(row, sqlite3.Row) else row[0]
        new_completed = 0 if current_completed else 1

        # 업데이트
        cursor.execute("UPDATE events SET completed = ? WHERE id = ?", (new_completed, id))
        db.commit()
        return jsonify({'id': id, 'completed': new_completed}), 200
    except sqlite3.Error as e:
        db.rollback()
        return jsonify({'error': f'이벤트 완료 상태 토글에 실패했습니다: {str(e)}'}), 500
    finally:
        cursor.close()


# 애플리케이션 실행
if __name__ == '__main__':
    # 애플리케이션 컨텍스트 내에서 데이터베이스 초기화 -> 이렇게 해야 'get_db()'가 'g' 객체를 사용할 수 있음
    with app.app_context():
        init_db()  # 데이터베이스 스키마 생성

    # Flask 앱 실행 (디버그 모드 활성화)
    # 실제 운영 환경에서는 debug=False로 설정해야 함
    app.run(debug=True)