import { useState } from 'react';

type CalendarProps = {
  month: number; // 0-11 (January-December)
  year?: number; // Optional year, defaults to current year
  events?: Record<string, any[]>; // Events by date (YYYY-MM-DD format)
  onDayClick?: (date: Date) => void; // Callback when a day is clicked
};

export default function CalendarComp({
  month,
  year = new Date().getFullYear(),
  events = {},
  onDayClick,
}: CalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // Get the first day of the month
  const firstDay = new Date(year, month, 1);
  const firstDayOfWeek = firstDay.getDay(); // 0 (Sunday) - 6 (Saturday)

  // Get the number of days in the month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Get the number of days in the previous month
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;
  const daysInPrevMonth = new Date(prevYear, prevMonth + 1, 0).getDate();

  // Create an array of all days to display (including previous/next month days)
  const days: (Date | null)[] = [];

  // Add days from previous month
  for (let i = 0; i < firstDayOfWeek; i++) {
    const day = daysInPrevMonth - firstDayOfWeek + i + 1;
    days.push(new Date(prevYear, prevMonth, day));
  }

  // Add days from current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(new Date(year, month, i));
  }

  // Add days from next month to complete the grid
  const remainingDays = 42 - days.length; // 6 weeks * 7 days
  for (let i = 1; i <= remainingDays; i++) {
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    days.push(new Date(nextYear, nextMonth, i));
  }

  // Format date as YYYY-MM-DD for event lookup
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Handle day click
  const handleDayClick = (date: Date) => {
    setSelectedDate(date);
    if (onDayClick) {
      onDayClick(date);
    }
  };

  // Check if a date is from the current month
  const isCurrentMonth = (date: Date) => {
    return date.getMonth() === month && date.getFullYear() === year;
  };

  // Get month name
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Weekday names
  const weekdayNames = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h2>{monthNames[month]} {year}</h2>
      </div>

      <div className="calendar-weekdays">
        {weekdayNames.map((day, index) => (
          <div key={index} className="weekday-header">
            {day}
          </div>
        ))}
      </div>

      <div className="calendar-grid">
        {days.map((date, index) => {
          if (!date) return null;

          const dateKey = formatDate(date);
          const dayEvents = events[dateKey] || [];
          const isCurrent = isCurrentMonth(date);
          const isSelected = selectedDate && formatDate(selectedDate) === dateKey;
          const isToday = 
            date.toDateString() === new Date().toDateString();

          return (
            <button
              key={index}
              className={`calendar-day ${!isCurrent ? 'other-month' : ''} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
              onClick={() => handleDayClick(date)}
              disabled={!isCurrent}
            >
              <div className="day-number">{date.getDate()}</div>
              {dayEvents.length > 0 && (
                <div className="day-events">
                  {dayEvents.slice(0, 2).map((event, eventIndex) => (
                    <div key={eventIndex} className="event-dot" title={event.title || 'Event'}></div>
                  ))}
                  {dayEvents.length > 2 && (
                    <div className="more-events">+{dayEvents.length - 2}</div>
                  )}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
