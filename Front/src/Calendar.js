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
  const [formData, setFormData] = useState({ title: '', start: '', end: '', tag_id: null, priority: 0, completed: 0 })
  const [selectedId, setSelectedId] = useState(null)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [showMenu, setShowMenu] = useState(false)

  // 데이터 로딩(동기화)
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

  const fetchEvents = (colors = tagColors) => {
    axios.get(`${API_BASE}/events/list`).then(res => {
      setEvents(res.data.map(ev => {
        let calendarEnd = ev.end_date
        if (calendarEnd) {
          // FullCalendar는 end일이 실제로는 포함 안됨 → 하루 더함
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
          color: colors[ev.tags[0]?.id] || '#3788d8',
          completed: ev.completed,
          priority: ev.priority,
          originalEnd: ev.end_date
        }
      }))
    })
  }

  // 일정 추가/수정/정보 모달 관련
  const handleDateSelect = ({ startStr, endStr }) => {
    setFormData({
      title: '',
      start: startStr.slice(0, 10),
      end: (endStr ? endStr.slice(0, 10) : startStr.slice(0, 10)),
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
    // 이벤트 정보 조회 모달 (수정 전 readOnly)
    setFormData({
      title: event.title,
      start: event.startStr.slice(0, 10),
      end: event.extendedProps.originalEnd ? event.extendedProps.originalEnd.slice(0, 10) : event.endStr.slice(0, 10),
      tag_id: event.extendedProps.tag_id,
      priority: event.extendedProps.priority,
      completed: event.extendedProps.completed
    })
    setSelectedId(event.id)
    setIsReadOnly(true)
    setModalOpen(true)
    setShowMenu(false)
  }

  // 일정 등록/수정
  const handleSubmit = e => {
    e.preventDefault()
    if (selectedId && !isReadOnly) {
      // 수정
      axios.put(`${API_BASE}/events/${selectedId}`, {
        title: formData.title,
        start_date: formData.start,
        end_date: formData.end,
        tag_ids: [formData.tag_id],
        priority: formData.priority,
        completed: formData.completed
      }).then(() => {
        setModalOpen(false)
        if (onEventsChanged) onEventsChanged()
      })
    } else {
      // 추가
      axios.post(`${API_BASE}/events/new`, {
        title: formData.title,
        start_date: formData.start,
        end_date: formData.end,
        tag_ids: [formData.tag_id],
        priority: formData.priority
      }).then(() => {
        setModalOpen(false)
        if (onEventsChanged) onEventsChanged()
      })
    }
  }

  // 일정 삭제
  const handleDelete = () => {
    if (selectedId) {
      axios.delete(`${API_BASE}/events/${selectedId}`).then(() => {
        setModalOpen(false)
        if (onEventsChanged) onEventsChanged()
      })
    }
  }

  // 정보 → 수정 모드 전환
  const handleEdit = () => setIsReadOnly(false)

  // 완료 토글
  const handleToggleComplete = (id) => {
    axios.patch(`${API_BASE}/events/${id}/completed`).then(() => {
      setFormData(fd => ({ ...fd, completed: fd.completed === 1 ? 0 : 1 }))
      if (onEventsChanged) onEventsChanged()
    })
  }

  // 모달 렌더
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
        onRequestClose={() => { setModalOpen(false); setShowMenu(false); setIsReadOnly(false); }}
        className="modalContent"
        overlayClassName="modalOverlay"
      >
        {selectedId ? (
          // 수정/정보 모달
          <div>
            <div className="modalHeader">
              <button
                type="button"
                className="modalCompleteToggle"
                disabled={!isReadOnly}
                onClick={() => handleToggleComplete(selectedId)}
                title={formData.completed === 1 ? "미완료로 변경" : "완료로 변경"}
                style={{
                  color: formData.completed === 1 ? "#2ecc40" : "#bbb",
                  cursor: isReadOnly ? "pointer" : "default"
                }}
              >
                {formData.completed === 1 ? "✅" : "⃣"}
              </button>
              <h2 className="modalTitle">{isReadOnly ? "일정 정보" : "일정 수정"}</h2>
              <div style={{ position: "relative" }}>
                <button
                  className="modalMenuButton"
                  onClick={() => setShowMenu(s => !s)}
                  style={{ fontSize: 24, background: "none", border: "none", cursor: "pointer", color: "#444" }}
                  disabled={!isReadOnly}
                  tabIndex={isReadOnly ? 0 : -1}
                >
                  ⋮
                </button>
                {showMenu && (
                  <div className="modalMenuDropdown"
                  style={{
                    position: "absolute", right: 0, top: 36, background: "#fff", border: "1px solid #eee", borderRadius: 8, boxShadow: "0 2px 8px #0001", zIndex: 2
                  }}
                  onMouseLeave={() => setShowMenu(false)}>
                    <button className="modalButton" style={{ width: "120px", border: "none", background: "none", padding: 8, cursor: "pointer", color : "#343434 " }}
                      onClick={handleEdit}>수정</button>
                    <button className="modalButton" style={{ width: "120px", border: "none", background: "none", padding: 8, cursor: "pointer", color: "#e74c3c" }}
                      onClick={handleDelete}>삭제</button>
                  </div>
                )}
              </div>
            </div>
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
                <select className="modalSelect" value={formData.tag_id}
                  disabled={isReadOnly}
                  onChange={e => setFormData({ ...formData, tag_id: Number(e.target.value) })}>
                  {tags.map(tag => (
                    <option key={tag.id} value={tag.id}>{tag.name}</option>
                  ))}
                </select>
              </label>
              <label>
                우선순위
                <select className="modalSelect" value={formData.priority}
                  disabled={isReadOnly}
                  onChange={e => setFormData({ ...formData, priority: Number(e.target.value) })}>
                  <option value={0}>낮음</option>
                  <option value={1}>보통</option>
                  <option value={2}>높음</option>
                </select>
              </label>
              {!isReadOnly && (
                <div className="modalButtons">
                  <button type="button" className="modalButton_cancel" onClick={() => { setModalOpen(false); setShowMenu(false); setIsReadOnly(false); }}>취소</button>
                  <button type="submit" className="modalButton">저장</button>
                </div>
              )}
            </form>
          </div>
        ) : (
          // 추가 모달
          <div>
            <h2 className="modalTitle">새 일정 추가</h2>
            <form onSubmit={handleSubmit}>
              <label>
                제목
                <input type="text" className="modalInput" value={formData.title} required maxLength={50}
                  onChange={e => setFormData({ ...formData, title: e.target.value })} />
              </label>
              <label>
                시작
                <input type="date" className="modalInput" value={formData.start} required
                  onChange={e => setFormData({ ...formData, start: e.target.value })} />
              </label>
              <label>
                마감
                <input type="date" className="modalInput" value={formData.end} required
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
              <label>
                우선순위
                <select className="modalSelect" value={formData.priority}
                  onChange={e => setFormData({ ...formData, priority: Number(e.target.value) })}>
                  <option value={0}>낮음</option>
                  <option value={1}>보통</option>
                  <option value={2}>높음</option>
                </select>
              </label>
              <div className="modalButtons">
                <button type="submit" className="modalButton">저장</button>
                <button type="button" className="modalButton" onClick={() => { setModalOpen(false); setShowMenu(false); setIsReadOnly(false); }}>취소</button>
              </div>
            </form>
          </div>
        )}
      </Modal>
    </div>
  )

  // 이벤트(일정) 캘린더에 렌더링
  function renderEventContent(eventInfo) {
    return (
      <div className="fc-event-content">
        <span className="fc-event-title">
          {eventInfo.event.title}
          {eventInfo.event.extendedProps.completed === 1 ? ' ✅' : ''}
        </span>
      </div>
    )
  }
}

export default Calendar
