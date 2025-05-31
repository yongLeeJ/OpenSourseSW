/* eslint-disable */
import React from 'react'
import './InfoPanel.css'
import ThisWeekTodos from './ThisWeekTodos'
import NextWeekTodos from './NextWeekTodos'
import MonthlyProgress from './MonthlyProgress'

function InfoPanel({ eventChanged, onEventsChanged }) { // ✅ 반드시 둘 다 선언!
  return (
    <div className="info-panel">
      <ThisWeekTodos eventChanged={eventChanged} onEventsChanged={onEventsChanged} />
      <NextWeekTodos eventChanged={eventChanged} onEventsChanged={onEventsChanged}/>
      <MonthlyProgress eventChanged={eventChanged} />
    </div>
  )
}
export default InfoPanel

