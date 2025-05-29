import React, { useEffect, useState } from 'react';

function MonthlyProgress() {
  const [progress, setProgress] = useState({ completed: 0, total: 0 });

  useEffect(() => {
    // 예시용 데이터. 실제로는 fetch('API/month-progress')
    setProgress({ completed: 15, total: 20 });
  }, []);

  const percent = progress.total === 0 ? 0 : Math.round(progress.completed / progress.total * 100);

  return (
    <div className="info-card">
      <div className="card-title">이번달 투두 달성률</div>
      <div className="progress-bar-bg">
        <div className="progress-bar-fill" style={{ width: `${percent}%` }}></div>
      </div>
      <div className="progress-text">{progress.completed} / {progress.total}개 완료 ({percent}%)</div>
    </div>
  );
}

export default MonthlyProgress;
