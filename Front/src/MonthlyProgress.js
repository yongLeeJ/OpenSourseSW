import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(ArcElement, Tooltip, Legend)

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

  const data = {
    labels: ['완료', '미완료'],
    datasets: [
      {
        data: [progress.completed, progress.total - progress.completed],
        backgroundColor: ['#42c77a', '#e0e0e0'],
        borderWidth: 2,
      },
    ],
  }

  const options = {
    cutout: '70%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: true },
    },
  }

  return (
    <div className="info-card">
      <div className="card-title">📑 이번달 투두 달성률</div>
      <div style={{ width: 150, height: 150, margin: '0 auto', position: 'relative' }}>
      <Doughnut data={data} options={options} />
      <div
        style={{
          position: 'absolute',
          top: 0, left: 0, right: 0, bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '2em',
          fontWeight: 700,
          color: '#333',
          pointerEvents: 'none'
        }}
      >
        {percent}%
      </div>
    </div>
      <div className="progress-text">
        {progress.completed} / {progress.total}개 완료
      </div>
    </div>
  )
}

export default MonthlyProgress
