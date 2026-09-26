import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Calendar = ({
  selectedDate, // string "YYYY-MM-DD" or Date
  onSelectDate,
  startDate, // for range mode
  endDate,
  isRange = false,
  className = '',
}) => {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const d = selectedDate ? new Date(selectedDate) : new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const toDateString = (y, m, d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${y}-${pad(m + 1)}-${pad(d)}`;
  };

  const todayStr = toDateString(new Date().getFullYear(), new Date().getMonth(), new Date().getDate());

  const handleDateClick = (day) => {
    const dateStr = toDateString(year, month, day);
    if (onSelectDate) {
      onSelectDate(dateStr);
    }
  };

  return (
    <div className={`p-3 bg-white select-none ${className}`}>
      {/* Month & Year Navigation */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          title="Previous Month"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-xs font-semibold text-gray-800">
          {monthNames[month]} {year}
        </span>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1 rounded-md text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
          title="Next Month"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 text-center mb-1">
        {daysOfWeek.map((day) => (
          <div key={day} className="text-[11px] font-medium text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Days Grid */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {/* Empty cells before month starts */}
        {Array.from({ length: firstDayIndex }).map((_, i) => (
          <div key={`empty-${i}`} className="h-7" />
        ))}

        {/* Days */}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dayStr = toDateString(year, month, day);
          const isToday = dayStr === todayStr;
          const isSelected = selectedDate === dayStr;
          
          let isInRange = false;
          let isRangeStart = false;
          let isRangeEnd = false;

          if (isRange && startDate) {
            isRangeStart = dayStr === startDate;
            isRangeEnd = dayStr === endDate;
            if (startDate && endDate) {
              isInRange = dayStr >= startDate && dayStr <= endDate;
            }
          }

          let btnClass = 'text-gray-700 hover:bg-gray-100';
          if (isSelected || isRangeStart || isRangeEnd) {
            btnClass = 'bg-[#E53935] text-white font-semibold hover:bg-[#D32F2F]';
          } else if (isInRange) {
            btnClass = 'bg-red-50 text-[#E53935] font-medium';
          } else if (isToday) {
            btnClass = 'text-[#E53935] font-bold border border-[#E53935]/30 hover:bg-red-50';
          }

          return (
            <button
              key={`day-${day}`}
              type="button"
              onClick={() => handleDateClick(day)}
              className={`
                h-7 w-7 mx-auto rounded-md text-xs flex items-center justify-center transition-colors cursor-pointer
                ${btnClass}
              `}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};
