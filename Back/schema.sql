--태그 테이블
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
);

-- 이벤트 테이블
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    start_date TEXT NOT NULL, -- YYYY-MM-DD 형식 권장
    end_date TEXT,            -- YYYY-MM-DD 형식 권장 (마감일)
    priority INTEGER DEFAULT 0, -- 우선순위 (0-낮음, 1-보통, 2-높음)
    recurrence TEXT,          -- 반복 패턴 ('daily', 'weekly', 'monthly')
    parent_event_id INTEGER,  -- 반복 이벤트의 원본 이벤트 ID (선택 사항, 추후 확장 시 사용)
    FOREIGN KEY (parent_event_id) REFERENCES events (id) ON DELETE SET NULL
);

-- 이벤트와 태그 간의 다대다 관계를 위한 중간 테이블
CREATE TABLE IF NOT EXISTS event_tags (
    event_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    FOREIGN KEY (event_id) REFERENCES events (id) ON DELETE CASCADE, -- 이벤트 삭제 시 연결된 태그도 삭제
    FOREIGN KEY (tag_id) REFERENCES tags (id) ON DELETE CASCADE,     -- 태그 삭제 시 연결된 이벤트-태그 관계도 삭제
    PRIMARY KEY (event_id, tag_id) -- 이벤트와 태그 조합은 유니크해야 함
);
