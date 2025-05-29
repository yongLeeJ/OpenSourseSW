/* eslint-disable */

import React, { useState } from 'react';
import './App.css';
import './Calendar.css';

import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import Modal from 'react-modal';

const defaultTags = ['업무', '개인', '공부', '운동'];
const TAG_COLORS = {
  업무: '#ff9f89',
  개인: '#a6d8f1',
  공부: '#c0e3b9',
  운동: '#f3c057'
};

Modal.setAppElement('#root');

// 한글 시간 변환 함수 (예: "오전 9:30")
function getKoreanTime(dateStr) {
  const date = new Date(dateStr);
  let h = date.getHours();
  const m = date.getMinutes();
  const isAm = h < 12;
  let period = isAm ? 'AM' : 'PM';
  h = h % 12;
  if (h === 0) h = 12;
  return `${period} ${h}:${m.toString().padStart(2, '0')}`;
}

// ISO 문자열 'YYYY-MM-DDTHH:mm:ssZ'을 'MM-DD HH:mm' 형식으로 변환
function formatDateStr(isoStr) {
  const dt = new Date(isoStr);
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  const hh = String(dt.getHours()).padStart(2, '0');
  const mi = String(dt.getMinutes()).padStart(2, '0');
  return `${mm}-${dd} ${hh}:${mi}`;
}

function Calendar() {
  const [tags, setTags] = useState(defaultTags);
  const [newTagName, setNewTagName] = useState('');
  const [events, setEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    start: '',
    end: '',
    tag: '',
    completed: false
  });
  const [selectedId, setSelectedId] = useState(null);

  // 날짜/시간 선택시 모달 오픈
  const handleDateSelect = ({ startStr, endStr }) => {
    setFormData({
      title: '',
      start: startStr,
      end: endStr,
      tag: '',
      completed: false
    });
    setSelectedId(null);
    setModalOpen(true);
  };

  // 일정 클릭시 정보/수정 모달
  const handleEventClick = ({ event }) => {
    setFormData({
      title: event.title,
      start: event.startStr,
      end: event.endStr,
      tag: event.extendedProps.tag || '',
      completed: event.extendedProps.completed || false
    });
    setSelectedId(event.id);
    setModalOpen(true);
  };

  // 일정 저장 (신규/수정)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedId) {
      setEvents(events.map(ev =>
        ev.id === selectedId
          ? { ...ev, ...formData, color: TAG_COLORS[formData.tag] || ev.color }
          : ev
      ));
    } else {
      const id = Date.now().toString();
      setEvents([
        ...events,
        {
          id,
          ...formData,
          color: TAG_COLORS[formData.tag] || ''
        }
      ]);
    }
    setModalOpen(false);
  };

  // 이벤트 렌더링 커스텀
  function renderEventContent(eventInfo) {
    const start = new Date(eventInfo.event.startStr);
    const end = new Date(eventInfo.event.endStr);

    // 1일 일정(동일날짜 시작~종료)인 경우 한글 시간+제목
    const isSameDay = (
      start.getFullYear() === end.getFullYear() &&
      start.getMonth() === end.getMonth() &&
      start.getDate() === end.getDate()
    );

    return (
      <div className="fc-event-content">
        {isSameDay && (
          <span
            className="fc-event-dot"
            style={{
              backgroundColor: eventInfo.event.backgroundColor || eventInfo.event.color || '#999'
          }}
        ></span>
        )}
        <span className="fc-event-time-ko">{
          getKoreanTime(eventInfo.event.startStr)}
        </span>
        <span className="fc-event-title">
          {eventInfo.event.title}
          {eventInfo.event.extendedProps.completed && (
            <span className="fc-event-done">✅</span>
          )}
        </span>
      </div>
    );
  }

  return (
    <div className="CalendarContainer">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        selectable
        editable
        selectMirror
        slotDuration="00:30:00"
        events={events}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventContent={renderEventContent}
      />
      {/* 일정 추가/수정 모달 */}
      <Modal
        isOpen={modalOpen}
        onRequestClose={() => setModalOpen(false)}
        className="modalContent"
        overlayClassName="modalOverlay"
        shouldCloseOnOverlayClick
      >
        <h2 className="modalTitle">
          {selectedId ? '일정 정보 / 수정' : '새 일정 추가'}
        </h2>
        <form onSubmit={handleSubmit} className="modalForm">
          <label>
            제목
            <input
              type="text"
              value={formData.title}
              onChange={e => setFormData({ ...formData, title: e.target.value })}
              required
              maxLength={50}
              className="modalInput"
              placeholder="일정 제목"
            />
          </label>
          <label>
            시작
            <input
              type="datetime-local"
              value={formData.start.slice(0, 16)}
              onChange={e => setFormData({ ...formData, start: e.target.value })}
              required
              className="modalInput"
              id="startInput"
            />
          </label>
          <label>
            마감
            <input
              type="datetime-local"
              value={formData.end.slice(0, 16)}
              onChange={e => setFormData({ ...formData, end: e.target.value })}
              required
              className="modalInput"
              id="endInput"
            />
          </label>
          <label>
            태그
            <select
              value={formData.tag}
              onChange={e => setFormData({ ...formData, tag: e.target.value })}
              required
              className="modalSelect"
              id="tagSelect"
            >
              <option value="">태그 선택</option>
              {tags.map(tag => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </label>
          <label>
            새 태그 추가
            <input
              type="text"
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              className="modalInput"
              placeholder="새 태그"
              maxLength={10}
              id="newTagInput"
            />
            <button
              type="button"
              className="modalButton"
              id="addTagBtn"
              onClick={() => {
                if (newTagName && !tags.includes(newTagName)) {
                  setTags([...tags, newTagName]);
                  setNewTagName('');
                }
              }}
            >
              추가
            </button>
          </label>
          {/* <label className="checkboxLabel">
            <input
              type="checkbox"
              checked={formData.completed}
              onChange={e => setFormData({ ...formData, completed: e.target.checked })}
              className="modalCheckbox"
              id="completedCheckbox"
            />
            완료됨
          </label> */}
          <div className="modalButtons">
            <button type="submit" className="modalButton">{selectedId ? '저장' : '추가'}</button>
            <button type="button" className="modalButton" onClick={() => setModalOpen(false)}>취소</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default Calendar;
