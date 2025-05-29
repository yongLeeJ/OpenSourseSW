import React, { useEffect, useState } from 'react';

function NextWeekTodos() {
  const [todos, setTodos] = useState([]);

  useEffect(() => {
    // 예시용 데이터. 실제로는 fetch('API/nextweek')
    setTodos([
      { id: 4, title: '시험 공부', completed: false },
      { id: 5, title: '세미나 준비', completed: false }
    ]);
  }, []);

  return (
    <div className="info-card">
      <div className="card-title">다음주 투두리스트</div>
      <ul className="todo-list">
        {todos.map(todo => (
          <li key={todo.id}>{todo.title}</li>
        ))}
      </ul>
    </div>
  );
}

export default NextWeekTodos;
