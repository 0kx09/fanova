import React, { useState } from 'react';
import './AnnouncementBanner.css';

function AnnouncementBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="announcement-banner">
      <div className="announcement-content">
        <span className="announcement-icon">⚠️</span>
        <span className="announcement-text">
          <strong>Scheduled Maintenance:</strong> Fanova will be undergoing important development work from <strong>9:30 PM - 11:00 PM UK time</strong> today. The service will be in maintenance mode during this period.
        </span>
        <button
          className="announcement-close"
          onClick={() => setIsVisible(false)}
          aria-label="Close announcement"
        >
          ×
        </button>
      </div>
    </div>
  );
}

export default AnnouncementBanner;
