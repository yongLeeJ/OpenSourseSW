import React, { useEffect, useState } from 'react';

// 실제로는 fetch로 API 호출
function ThisWeekTodos() {
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    // 예시용 데이터. 실제로는 fetch('API/thisweek')
    setTodos([
      { id: 1, title: '과제 제출', completed: true },
      { id: 2, title: '운동하기', completed: false },
      { id: 3, title: '스터디 준비', completed: false }
    ]);
  }, []);

  return (
    <div className="info-card">
      <div className="card-title">이번주 투두리스트</div>
      <ul className="todo-list">
        {todos.map(todo => (
          <li key={todo.id} className={todo.completed ? 'done' : ''}>
            {todo.title} {todo.completed && '✅'}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ThisWeekTodos;
