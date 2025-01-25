// Availability.js
import { useState } from 'react';

export default function Availability() {
  const [availability, setAvailability] = useState({
    mon: { start: '09:00', end: '18:00', enabled: true },
    tue: { start: '09:00', end: '18:00', enabled: true },
    wed: { start: '09:00', end: '18:00', enabled: true },
    thu: { start: '09:00', end: '18:00', enabled: true },
    fri: { start: '09:00', end: '18:00', enabled: true },
  });

  const handleTimeChange = (day, field, value) => {
    setAvailability(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value }
    }));
  };

  return (
    <div>
      <h2>Working Hours</h2>
      {Object.entries(availability).map(([day, config]) => (
        <div key={day} style={{ margin: '10px 0' }}>
          <label>
            <input
              type="checkbox"
              checked={config.enabled}
              onChange={(e) => handleTimeChange(day, 'enabled', e.target.checked)}
            />
            {day.toUpperCase()}
          </label>
          <input
            type="time"
            value={config.start}
            onChange={(e) => handleTimeChange(day, 'start', e.target.value)}
            disabled={!config.enabled}
          />
          <input
            type="time"
            value={config.end}
            onChange={(e) => handleTimeChange(day, 'end', e.target.value)}
            disabled={!config.enabled}
          />
        </div>
      ))}
    </div>
  );
}