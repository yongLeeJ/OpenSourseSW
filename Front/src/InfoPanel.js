import React from 'react';
import ThisWeekTodos from './ThisWeekTodos';
import NextWeekTodos from './NextWeekTodos';
import MonthlyProgress from './MonthlyProgress';
import './InfoPanel.css';

function InfoPanel() {
  return (
    <div className="info-panel">
      <ThisWeekTodos />
      <NextWeekTodos />
      <MonthlyProgress />
    </div>
  );
}

export default InfoPanel;
