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

function Calendar({ onEventsChanged, eventChanged }) {
  const [tags, setTags] = useState([])
  const [tagColors, setTagColors] = useState({})
  const [events, setEvents] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [formData, setFormData] = useState({ title: '', start: '', end: '', tag_id: null, priority: 0, completed: 0 })
  const [selectedId, setSelectedId] = useState(null)
  const [showMenu, setShowMenu] = useState(false)

  const refreshTagsAndEvents = () => {
    axios.get(`${API_BASE}/tags/list`).then(res => {
      setTags(res.data)
      const colors = {}
      res.data.forEach(tag => { colors[tag.id] = tag.color || '#3788d8' })
      setTagColors(colors)
      fetchEvents(colors)
    })
  }

  useEffect(() => {
    refreshTagsAndEvents()
  }, [eventChanged])

  const fetchEvents = (colors) => {
    axios.get(`${API_BASE}/events/list`).then(res => {
      setEvents(res.data.map(ev => {
        let calendarEnd = ev.end_date
        if (calendarEnd) {
          const dt = new Date(calendarEnd)
          dt.setDate(dt.getDate() + 1)
          calendarEnd = dt.toISOString().slice(0, 10)
        }
        return {
          id: ev.id,
          title: ev.title,
          start: ev.start_date,
          end: calendarEnd,
          tag_id: ev.tags[0]?.id || null,
          color: (colors && colors[ev.tags[0]?.id]) || '#3788d8',
          completed: ev.completed,
          priority: ev.priority,
          originalEnd: ev.end_date
        }
      }))
    })
  }

  const handleDateSelect = ({ startStr, endStr }) => {
    setFormData({
      title: '',
      start: startStr.slice(0, 10),
      end: endStr.slice(0, 10),
      tag_id: tags[0]?.id || null,
      priority: 0,
      completed: 0
    })
    setSelectedId(null)
    setIsReadOnly(false)
    setModalOpen(true)
    setShowMenu(false)
  }

  const handleEventClick = ({ event }) => {
    setFormData({
      title: event.title,
      start: event.startStr.slice(0, 10),
      end: event.extendedProps.originalEnd || event.endStr.slice(0, 10),
      tag_id: event.extendedProps.tag_id,
      priority: event.extendedProps.priority ?? 0,
      completed: event.extendedProps.completed ?? 0
    })
    setSelectedId(event.id)
    setIsReadOnly(true)
    setModalOpen(true)
    setShowMenu(false)
  }

  const handleSubmit = e => {
    e.preventDefault()
    if (isReadOnly) return
    if (selectedId) {
      axios.put(`${API_BASE}/events/${selectedId}`, {
        title: formData.title,
        start_date: formData.start,
        end_date: formData.end,
        tag_ids: [formData.tag_id],
        priority: formData.priority
      }).then(() => {
        refreshTagsAndEvents()
        setModalOpen(false)
        if (onEventsChanged) onEventsChanged()
      }).catch(() => alert('이벤트 수정 실패'))
    } else {
      axios.post(`${API_BASE}/events/new`, {
        title: formData.title,
        start_date: formData.start,
        end_date: formData.end,
        tag_ids: [formData.tag_id],
        priority: formData.priority
      }).then(() => {
        refreshTagsAndEvents()
        setModalOpen(false)
        if (onEventsChanged) onEventsChanged()
      }).catch(() => alert('이벤트 추가 실패'))
    }
  }

  const handleDelete = () => {
    if (!selectedId) return
    axios.delete(`${API_BASE}/events/${selectedId}`).then(() => {
      refreshTagsAndEvents()
      setModalOpen(false)
      if (onEventsChanged) onEventsChanged()
    })
  }

  const handleEdit = () => {
    setIsReadOnly(false)
    setShowMenu(false)
  }

  const handleToggleComplete = id => {
    axios.patch(`${API_BASE}/events/${id}/completed`).then(res => {
      setFormData(prev => ({ ...prev, completed: res.data.completed }))
      refreshTagsAndEvents()
      if (onEventsChanged) onEventsChanged()
    })
  }

  const renderEventContent = eventInfo => (
    <div className="fc-event-content">
      <span className="fc-event-title">
        {eventInfo.event.title}
        {eventInfo.event.extendedProps.completed === 1 ? ' ✅' : ''}
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
        onRequestClose={() => { setModalOpen(false); setShowMenu(false); }}
        className="modalContent"
        overlayClassName="modalOverlay"
      >
        {selectedId && isReadOnly && (
          <button
            type="button"
            style={{
              marginBottom: 12,
              marginRight: 12,
              fontSize: 22,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: formData.completed === 1 ? '#2ecc40' : '#bbb',
              float: 'right'
            }}
            onClick={() => handleToggleComplete(selectedId)}
            title={formData.completed === 1 ? "미완료로 변경" : "완료로 변경"}
          >
            {formData.completed === 1 ? '✅ 완료' : '☐ 미완료'}
          </button>
        )}
        {selectedId && isReadOnly && (
          <div style={{ position: 'absolute', top: 12, right: 16 }}>
            <button onClick={() => setShowMenu(!showMenu)} style={{ fontSize: 24, background: 'none', border: 'none', cursor: 'pointer' }}>⋮</button>
            {showMenu && (
              <div style={{
                position: 'absolute', right: 0, top: 36, background: '#fff', border: '1px solid #eee', borderRadius: 8, boxShadow: '0 2px 8px #0001', zIndex: 2
              }}>
                <button className="modalButton" style={{ width: '100%', border: 'none', background: 'none', padding: 8, cursor: 'pointer' }}
                  onClick={handleEdit}>수정</button>
                <button className="modalButton" style={{ width: '100%', border: 'none', background: 'none', padding: 8, cursor: 'pointer', color: '#e74c3c' }}
                  onClick={handleDelete}>삭제</button>
              </div>
            )}
          </div>
        )}
        <h2 className="modalTitle" style={{ marginRight: 40 }}>
          {selectedId ? (isReadOnly ? '일정 정보' : '일정 수정') : '새 일정 추가'}
        </h2>
        <form onSubmit={handleSubmit}>
          <label>
            제목
            <input type="text" className="modalInput" value={formData.title} required maxLength={50}
              disabled={isReadOnly}
              onChange={e => setFormData({ ...formData, title: e.target.value })} />
          </label>
          <label>
            시작
            <input type="date" className="modalInput" value={formData.start} required
              disabled={isReadOnly}
              onChange={e => setFormData({ ...formData, start: e.target.value })} />
          </label>
          <label>
            마감
            <input type="date" className="modalInput" value={formData.end} required
              disabled={isReadOnly}
              onChange={e => setFormData({ ...formData, end: e.target.value })} />
          </label>
          <label>
            태그
            <select className="modalSelect" value={formData.tag_id} disabled={isReadOnly}
              onChange={e => setFormData({ ...formData, tag_id: Number(e.target.value) })}>
              {tags.map(tag => (
                <option key={tag.id} value={tag.id}>{tag.name}</option>
              ))}
            </select>
          </label>
          <label>
            우선순위
            <select className="modalSelect" value={formData.priority} disabled={isReadOnly}
              onChange={e => setFormData({ ...formData, priority: Number(e.target.value) })}>
              <option value={0}>낮음</option>
              <option value={1}>보통</option>
              <option value={2}>높음</option>
            </select>
          </label>
          {!isReadOnly && (
            <div className="modalButtons">
              <button type="submit" className="modalButton">{selectedId ? '수정' : '추가'}</button>
              <button type="button" className="modalButton" onClick={() => setModalOpen(false)}>취소</button>
            </div>
          )}
        </form>
      </Modal>
    </div>
  )
}

export default Calendar
