import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Calendar as CalendarIcon, ChevronDown, X } from 'lucide-react';
import { Calendar } from './Calendar';
import { Button } from './Button';

export const DatePicker = ({
  value, // string 'YYYY-MM-DD' or range { start: 'YYYY-MM-DD', end: 'YYYY-MM-DD' } or preset key
  onChange,
  isRange = false,
  preset = 'this_month', // 'today' | 'this_week' | 'this_month' | 'custom'
  onPresetChange,
  placeholder = 'Select date...',
  label,
  error,
  disabled = false,
  className = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 290,
  });

  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const popupRef = useRef(null);

  const [tempRange, setTempRange] = useState(() => {
    if (typeof value === 'object' && value !== null) {
      return { start: value.start || '', end: value.end || '' };
    }
    return { start: '', end: '' };
  });

  const [selectedPreset, setSelectedPreset] = useState(preset || 'this_month');

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const popupWidth = Math.min(300, viewportWidth - 16);

    let left = rect.left;
    if (left + popupWidth > viewportWidth - 8) {
      left = viewportWidth - popupWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    let top = rect.bottom + 6;
    if (top + 360 > viewportHeight && rect.top > 360) {
      top = Math.max(8, rect.top - 6);
    }

    setCoords({
      top,
      left,
      width: popupWidth,
    });
  }, []);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target) &&
        popupRef.current &&
        !popupRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      updatePosition();
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition, true);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const presets = [
    { key: 'today', label: 'Today' },
    { key: 'this_week', label: 'This Week' },
    { key: 'this_month', label: 'This Month' },
    { key: 'custom', label: 'Custom Range' },
  ];

  const getPresetDates = (presetKey) => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const toStr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

    if (presetKey === 'today') {
      const todayStr = toStr(now);
      return { start: todayStr, end: todayStr, label: 'Today' };
    }
    if (presetKey === 'this_week') {
      const dayOfWeek = now.getDay();
      const firstDay = new Date(now);
      firstDay.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
      return { start: toStr(firstDay), end: toStr(now), label: 'This Week' };
    }
    if (presetKey === 'this_month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      return { start: toStr(firstDay), end: toStr(now), label: 'This Month' };
    }
    return { start: tempRange.start, end: tempRange.end, label: 'Custom Range' };
  };

  const handleSelectPreset = (pKey) => {
    setSelectedPreset(pKey);
    const range = getPresetDates(pKey);
    if (pKey !== 'custom') {
      if (onChange) onChange(range);
      if (onPresetChange) onPresetChange(pKey);
      setIsOpen(false);
    }
  };

  const handleCalendarClick = (dateStr) => {
    if (!isRange) {
      if (onChange) onChange(dateStr);
      setIsOpen(false);
    } else {
      if (!tempRange.start || (tempRange.start && tempRange.end)) {
        setTempRange({ start: dateStr, end: '' });
      } else if (tempRange.start && !tempRange.end) {
        if (dateStr < tempRange.start) {
          setTempRange({ start: dateStr, end: tempRange.start });
        } else {
          setTempRange({ start: tempRange.start, end: dateStr });
        }
      }
    }
  };

  const handleApplyCustom = () => {
    if (onChange) onChange({ start: tempRange.start, end: tempRange.end });
    if (onPresetChange) onPresetChange('custom');
    setIsOpen(false);
  };

  const handleClear = (e) => {
    e.stopPropagation();
    if (isRange) {
      setTempRange({ start: '', end: '' });
      if (onChange) onChange({ start: '', end: '' });
    } else {
      if (onChange) onChange('');
    }
    setSelectedPreset('custom');
  };

  const toggleOpen = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  // Display label
  let displayText = placeholder;
  if (typeof value === 'string' && value) {
    displayText = value;
  } else if (typeof value === 'object' && value !== null) {
    if (value.start && value.end) {
      displayText = `${value.start} - ${value.end}`;
    } else if (value.start) {
      displayText = `${value.start} - ...`;
    }
  }

  return (
    <div className={`relative flex flex-col gap-1.5 ${className}`} ref={containerRef}>
      {label && <label className="text-xs font-semibold text-gray-700">{label}</label>}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleOpen}
        className={`
          flex items-center justify-between gap-2 px-3 py-2 bg-white rounded-xl border border-gray-200
          text-xs font-semibold shadow-2xs hover:border-gray-300 hover:bg-gray-50/90 transition-all outline-none cursor-pointer
          ${isOpen ? 'ring-2 ring-[#E53935]/20 border-[#E53935]' : ''}
          ${error ? 'border-red-400 focus:ring-red-200' : ''}
          ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'text-gray-800'}
        `}
      >
        <div className="flex items-center gap-2 truncate">
          <CalendarIcon className="w-4 h-4 text-[#E53935] shrink-0" />
          <span className="truncate">{displayText}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0 text-gray-400">
          {((typeof value === 'string' && value) || (typeof value === 'object' && value?.start)) && (
            <span
              onClick={handleClear}
              className="hover:text-gray-600 p-0.5 rounded cursor-pointer"
              title="Clear date"
            >
              <X className="w-3.5 h-3.5" />
            </span>
          )}
          <ChevronDown className="w-4 h-4" />
        </div>
      </button>

      {isOpen &&
        createPortal(
          <div
            ref={popupRef}
            className="fixed z-[9999] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Preset Buttons */}
            <div className="p-2 border-b border-gray-100 flex flex-wrap gap-1 bg-gray-50/50">
              {presets.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handleSelectPreset(p.key)}
                  className={`
                    px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer
                    ${
                      selectedPreset === p.key
                        ? 'bg-[#E53935] text-white shadow-xs'
                        : 'text-gray-600 hover:bg-gray-200/60'
                    }
                  `}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Calendar Picker */}
            <Calendar
              selectedDate={typeof value === 'string' ? value : undefined}
              onSelectDate={handleCalendarClick}
              startDate={tempRange.start}
              endDate={tempRange.end}
              isRange={isRange}
            />

            {/* Footer Actions */}
            <div className="p-2.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2">
              <span className="text-[11px] text-gray-500">
                {isRange
                  ? tempRange.start
                    ? `${tempRange.start} to ${tempRange.end || '...'}`
                    : 'Select range'
                  : 'Select single date'}
              </span>
              <div className="flex items-center gap-1.5">
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    if (onChange) onChange(isRange ? { start: todayStr, end: todayStr } : todayStr);
                    setIsOpen(false);
                  }}
                >
                  Today
                </Button>
                {isRange && (
                  <Button
                    variant="primary"
                    size="xs"
                    disabled={!tempRange.start || !tempRange.end}
                    onClick={handleApplyCustom}
                  >
                    Apply
                  </Button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
