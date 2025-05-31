/* eslint-disable */
import React, { useEffect, useState } from 'react'
import axios from 'axios'
import CheckboxIcon from './checkbox.svg'


const API_BASE = 'http://localhost:5000'

function NextWeekTodos({ eventChanged, onEventsChanged }) {
  const [todos, setTodos] = useState([])

  // 다음주 월~일 구하기
  const getNextWeekRange = () => {
    const now = new Date()
    const start = new Date(now)
    start.setDate(now.getDate() - now.getDay() + 8) // 다음주 월요일
    const end = new Date(start)
    end.setDate(start.getDate() + 6)
    return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)]
  }

  const fetchTodos = () => {
    const [start, end] = getNextWeekRange()
    axios
      .get(`${API_BASE}/events/list`)
      .then(res => {
        const sorted = res.data
          .filter(ev => {
            if (!ev.end_date) return false
            return ev.end_date >= start && ev.end_date <= end
          })
          .sort((a, b) => a.priority - b.priority)
        setTodos(sorted)
      })
  }

  useEffect(() => {
    fetchTodos()
  }, [eventChanged])

  const handleToggle = id => {
    axios.patch(`${API_BASE}/events/${id}/completed`).then(() => {
      fetchTodos()
      if (onEventsChanged) onEventsChanged()
    })
  }

  return (
    <div className="info-card">
      <div className="card-title">🕓 다음주 해야 할 투두리스트</div>
      <ul className="todo-list" style={{ listStyle: 'none', padding: 0 }}>
        {todos.map(todo => (
          <li
            key={todo.id}
            className={todo.completed === 1 ? 'done' : ''}
            style={{
              display: 'flex',
              alignItems: 'center',
              cursor: 'pointer',
              userSelect: 'none'
            }}
            onClick={() => handleToggle(todo.id)}
          >
            <span style={{ marginRight: 8, fontSize: '1.2em' }}>
              {todo.completed === 1
                ? '✅'
                : <img src={CheckboxIcon} alt="ㅁ" style={{ width: 22, height: 22, verticalAlign: 'middle' }} />}
            </span>
            <span>{todo.title}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default NextWeekTodos
