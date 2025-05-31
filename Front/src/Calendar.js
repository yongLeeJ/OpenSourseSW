/* eslint-disable */
import React, { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import Modal from 'react-modal'
import axios from 'axios'
import './Calendar.css'

Modal.setAppElement('#root')

const API_BASE = 'http://localhost:5000'

function Calendar() {
  const [tags, setTags] = useState([])
  const [tagColors, setTagColors] = useState({})
  const [events, setEvents] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [formData, setFormData] = useState({ title: '', start: '', end: '', tag_id: null })
  const [selectedId, setSelectedId] = useState(null)

  useEffect(() => {
    axios.get(`${API_BASE}/tags/list`).then(res => {
      setTags(res.data)
      const colors = {}
      res.data.forEach(tag => { colors[tag.id] = tag.color || '#3788d8' })
      setTagColors(colors)
      // *** 여기서 colors를 바로 fetchEvents에 넘긴다! ***
      fetchEvents(colors)
    })
  }, [])

const fetchEvents = (colors) => {
  axios.get(`${API_BASE}/events/list`).then(res => {
    setEvents(res.data.map(ev => ({
      id: ev.id,
      title: ev.title,
      start: ev.start_date,
      end: ev.end_date,
      tag_id: ev.tags[0]?.id || null,
      color: (colors && colors[ev.tags[0]?.id]) || '#3788d8',
      completed: !!ev.completed,
    })))
  })
}

  const handleDateSelect = ({ startStr, endStr }) => {
    setFormData({ title: '', start: startStr.slice(0,16), end: endStr.slice(0,16), tag_id: tags[0]?.id || null })
    setSelectedId(null)
    setModalOpen(true)
  }

  const handleEventClick = ({ event }) => {
    setFormData({
      title: event.title,
      start: event.startStr.slice(0,16),
      end: event.endStr.slice(0,16),
      tag_id: event.extendedProps.tag_id
    })
    setSelectedId(event.id)
    setModalOpen(true)
  }

  const handleSubmit = e => {
    e.preventDefault()
    axios.post(`${API_BASE}/events/new`, {
      title: formData.title,
      start_date: formData.start,
      end_date: formData.end,
      tag_ids: [formData.tag_id]
    }).then(() => {
      fetchEvents()
      setModalOpen(false)
    }).catch(() => alert('이벤트 추가 실패'))
  }

  const renderEventContent = eventInfo => (
    <div className="fc-event-content">
      {/* <span className="fc-event-time-ko">{new Date(eventInfo.event.startStr).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}</span> */}
      <span className="fc-event-title">
        {eventInfo.event.title}
        {eventInfo.event.extendedProps.completed ? ' ✅' : ''}
      </span>
    </div>
  )

  return (
    <div className="CalendarContainer">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        selectable editable selectMirror
        events={events}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
      />
      <Modal
        isOpen={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        className="modalContent"
        overlayClassName="modalOverlay"
      >
        <h2 className="modalTitle">{selectedId ? '일정 수정' : '새 일정 추가'}</h2>
        <form onSubmit={handleSubmit}>
          <label>
            제목
            <input type="text" className="modalInput" value={formData.title} required maxLength={50}
              onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </label>
          <label>
            시작
            <input type="datetime-local" className="modalInput" value={formData.start} required
              onChange={e => setFormData({ ...formData, start: e.target.value })} />
          </label>
          <label>
            마감
            <input type="datetime-local" className="modalInput" value={formData.end} required
              onChange={e => setFormData({ ...formData, end: e.target.value })} />
          </label>
          <label>
            태그
            <select className="modalSelect" value={formData.tag_id}
              onChange={e => setFormData({ ...formData, tag_id: Number(e.target.value) })}>
              {tags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </label>
          <div className="modalButtons">
            <button type="submit" className="modalButton">저장</button>
            <button type="button" className="modalButton" onClick={() => setModalOpen(false)}>취소</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Calendar
