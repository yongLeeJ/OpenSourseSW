/* eslint-disable */
import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import Modal from 'react-modal';
import './App.css';

Modal.setAppElement('#root');

function Calendar() {
  const [events, setEvents] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    start: '',
    end: '',
    completed: false
  });
  const [selectedId, setSelectedId] = useState(null);

  // 캘린더에서 영역 선택(날짜+시간)
  const handleDateSelect = ({ startStr, endStr, allDay }) => {
    setFormData({ title: '', start: startStr, end: endStr, completed: false });
    setSelectedId(null);
    setModalOpen(true);
  };

  // 이벤트 클릭(정보보기·수정)
  const handleEventClick = ({ event }) => {
    setFormData({
      title: event.title,
      start: event.startStr,
      end: event.endStr,
      completed: event.extendedProps.completed || false
    });
    setSelectedId(event.id);
    setModalOpen(true);
  };

  const handleSubmit = e => {
    e.preventDefault();
    if (selectedId) {
      setEvents(events.map(ev =>
        ev.id === selectedId ? { ...ev, ...formData } : ev
      ));
    } else {
      const id = Date.now().toString();
      setEvents([...events, { id, ...formData }]);
    }
    setModalOpen(false);
  };

  return (
    <div className="CalendarContainer">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        selectable={true}
        editable={true}
        selectMirror={true}
        slotDuration="00:30:00"
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
        shouldCloseOnOverlayClick={true}
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
            />
          </label>
          <label>
            시작
            <input
              type="datetime-local"
              value={formData.start.slice(0,16)}
              onChange={e => setFormData({ ...formData, start: e.target.value })}
              required
            />
          </label>
          <label>
            종료
            <input
              type="datetime-local"
              value={formData.end.slice(0,16)}
              onChange={e => setFormData({ ...formData, end: e.target.value })}
              required
            />
          </label>
          <label className="checkboxLabel">
            <input
              type="checkbox"
              checked={formData.completed}
              onChange={e => setFormData({ ...formData, completed: e.target.checked })}
            />
            완료됨
          </label>
          <div className="modalButtons">
            <button type="submit">{selectedId ? '저장' : '추가'}</button>
            <button type="button" onClick={() => setModalOpen(false)}>취소</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function renderEventContent(eventInfo) {
  return (
    <div className="fc-event-content">
      <span className="fc-event-time">
        {eventInfo.timeText}
      </span>
      <span className="fc-event-title">
        {eventInfo.event.title}
      </span>
      {eventInfo.event.extendedProps.completed && <span className="fc-event-done">✅</span>}
    </div>
  );
}

export default Calendar;
