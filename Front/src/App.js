/* eslint-disable */
import React, { useState } from 'react'
import InfoPanel from './InfoPanel'
import Calendar from './Calendar'
import './App.css'

function App() {
  const [eventChanged, setEventChanged] = useState(0)
  const handleEventsChanged = () => setEventChanged(c => c + 1)

  return (
    <div className='App'>
      <InfoPanel eventChanged={eventChanged} onEventsChanged={handleEventsChanged}/>
      <Calendar eventChanged={eventChanged} onEventsChanged={handleEventsChanged} />
    </div>
  )
}

export default App
