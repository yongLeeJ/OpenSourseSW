/* eslint-disable */
import React, { useEffect, useState } from 'react'
import axios from 'axios'


const API_BASE = 'http://localhost:5000'

function MonthlyProgress({ eventChanged }) {
  const [progress, setProgress] = useState({ completed: 0, total: 0 })

  useEffect(() => {
    const now = new Date()
    const thisMonth = now.toISOString().slice(0, 7)
    axios.get(`${API_BASE}/events/list`).then(res => {
      const monthEvents = res.data.filter(ev =>
        ev.end_date && ev.end_date.startsWith(thisMonth)
      )
      const completed = monthEvents.filter(ev => ev.completed === 1).length
      setProgress({ completed, total: monthEvents.length })
    })
  }, [eventChanged])

  const percent = progress.total === 0 ? 0 : Math.round(progress.completed / progress.total * 100)

  return (
    <div className="info-card">
      <div className="card-title">📑 이번달 투두 달성률</div>
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
      </div>
      <div className="progress-text">
        {progress.completed} / {progress.total}개 완료 ({percent}%)
      </div>
    </div>
  )
}

export default MonthlyProgress
