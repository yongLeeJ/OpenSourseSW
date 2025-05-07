// src/components/Calendar.js
import React, { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction'; // 드래그 앤 드롭, 클릭 등

const Calendar = () => {
  const [events, setEvents] = useState([
    { title: '예제 일정', start: '2025-05-10' }
  ]);

  const handleDateSelect = (selectInfo) => {
    const title = prompt('일정 제목을 입력하세요');
    if (title) {
      const newEvent = {
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay
      };
      setEvents([...events, newEvent]);
    }
  };

  const handleEventClick = (clickInfo) => {
    if (window.confirm(`'${clickInfo.event.title}' 일정을 삭제할까요?`)) {
      clickInfo.event.remove();
    }
  };

  return (
    <div>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        selectable={true}
        editable={true}
        events={events}
        select={handleDateSelect}
        eventClick={handleEventClick}
      />
    </div>
  );
};

export default Calendar;
