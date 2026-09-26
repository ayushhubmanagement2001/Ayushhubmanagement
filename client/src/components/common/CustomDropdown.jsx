import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search, X } from 'lucide-react';

/**
 * Premium Unified Custom Dropdown Component
 * Uses React Portal to prevent clipping in mobile headers, overflow containers, and data tables.
 */
export const CustomDropdown = ({
  value,
  onChange,
  options = [], // ['September', ...] or [{ value, label, icon: Icon, badge, color }]
  placeholder = 'Select option',
  icon: LeadingIcon,
  label = '',
  size = 'md', // 'sm' | 'md' | 'pill'
  searchable = false,
  disabled = false,
  fullWidth = false,
  className = '',
  buttonClassName = '',
  menuClassName = '',
  align = 'left', // 'left' | 'right'
  minWidth = '160px',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 180,
    maxHeight: 260,
    openUpward: false,
  });

  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);
  const searchInputRef = useRef(null);

  // Calculate dynamic position on screen
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 200 && spaceAbove > spaceBelow;

    let targetWidth;
    if (fullWidth || className.includes('w-full')) {
      targetWidth = Math.min(rect.width, viewportWidth - 16);
    } else {
      const parsedMin = parseInt(minWidth, 10) || 160;
      targetWidth = Math.min(Math.max(rect.width, parsedMin, 180), viewportWidth - 16);
    }

    let left;
    if (align === 'right') {
      left = rect.right - targetWidth;
    } else {
      left = rect.left;
    }

    // Keep within screen edges with padding
    if (left + targetWidth > viewportWidth - 8) {
      left = viewportWidth - targetWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    let top;
    let maxMenuHeight = 260;
    if (openUpward) {
      top = Math.max(8, rect.top - 6);
      maxMenuHeight = Math.min(260, Math.max(120, spaceAbove - 16));
    } else {
      top = rect.bottom + 6;
      maxMenuHeight = Math.min(260, Math.max(120, spaceBelow - 16));
    }

    setCoords({
      top,
      left,
      width: targetWidth,
      maxHeight: maxMenuHeight,
      openUpward,
    });
  }, [align, fullWidth, className, minWidth]);

  // Close on outside click or Escape key & update coords on resize/scroll
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
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

      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, searchable, updatePosition]);

  // Normalized options
  const normalizedOptions = options.map((opt) => {
    if (typeof opt === 'object' && opt !== null) {
      return {
        value: opt.value,
        label: opt.label !== undefined ? opt.label : opt.value,
        icon: opt.icon,
        badge: opt.badge,
        color: opt.color,
        pillClass: opt.pillClass,
      };
    }
    return {
      value: opt,
      label: opt,
    };
  });

  // Selected Option Object
  const selectedOption = normalizedOptions.find((opt) => opt.value === value) || {
    value: value || '',
    label: value || placeholder,
  };

  // Filtered by search
  const filteredOptions = searchable
    ? normalizedOptions.filter((opt) =>
        String(opt.label).toLowerCase().includes(searchTerm.toLowerCase())
      )
    : normalizedOptions;

  const handleSelect = (val) => {
    if (disabled) return;
    onChange(val);
    setIsOpen(false);
    setSearchTerm('');
  };

  const toggleDropdown = () => {
    if (disabled) return;
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  // Size specific styles
  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return 'px-2.5 py-1.5 text-xs rounded-lg gap-1.5';
      case 'pill':
        return 'px-2.5 py-0.5 text-[11px] font-bold rounded-md gap-1 shadow-2xs';
      case 'md':
      default:
        return 'px-3.5 py-2 text-xs font-semibold rounded-xl gap-2 shadow-2xs';
    }
  };

  const isFullWidth = fullWidth || className.includes('w-full');

  return (
    <div
      className={`relative ${isFullWidth ? 'w-full block' : 'inline-block'} text-left ${className}`}
      ref={dropdownRef}
    >
      {label && (
        <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
          {label}
        </label>
      )}

      {/* Dropdown Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={toggleDropdown}
        className={`
          flex items-center justify-between transition-all duration-150 border cursor-pointer select-none outline-none
          ${isFullWidth ? 'w-full' : ''}
          ${getSizeStyles()}
          ${
            selectedOption.pillClass
              ? selectedOption.pillClass
              : isOpen
              ? 'bg-white border-primary-500 ring-2 ring-primary-100 text-gray-900 shadow-sm'
              : 'bg-white hover:bg-gray-50/90 border-gray-200 text-gray-800 hover:border-gray-300'
          }
          ${disabled ? 'opacity-60 cursor-not-allowed bg-gray-100' : ''}
          ${buttonClassName}
        `}
        style={!isFullWidth && minWidth ? { minWidth } : {}}
      >
        <div className="flex items-center gap-1.5 truncate min-w-0">
          {LeadingIcon && <LeadingIcon className="w-3.5 h-3.5 text-gray-500 shrink-0" />}
          {selectedOption.icon && !LeadingIcon && (
            <selectedOption.icon className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          )}
          <span className="truncate font-semibold">{selectedOption.label}</span>
          {selectedOption.badge && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold shrink-0">
              {selectedOption.badge}
            </span>
          )}
        </div>
        <ChevronDown
          className={`w-3.5 h-3.5 text-gray-400 shrink-0 ml-1 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-primary-600' : ''
          }`}
        />
      </button>

      {/* Floating Menu via React Portal */}
      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={`
              fixed z-[9999] rounded-xl bg-white border border-gray-200 shadow-2xl py-1.5
              overflow-y-auto scrollbar-thin
              animate-in fade-in zoom-in-95 duration-150
              ${menuClassName}
            `}
            style={{
              top: coords.openUpward ? undefined : `${coords.top}px`,
              bottom: coords.openUpward ? `${window.innerHeight - coords.top}px` : undefined,
              left: `${coords.left}px`,
              width: `${coords.width}px`,
              maxHeight: `${coords.maxHeight}px`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search box if enabled */}
            {searchable && (
              <div className="p-2 border-b border-gray-100 sticky top-0 bg-white z-10">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 absolute left-2 text-gray-400 pointer-events-none" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-7 pr-7 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                  {searchTerm && (
                    <button
                      type="button"
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2 text-gray-400 hover:text-gray-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {filteredOptions.length === 0 ? (
              <div className="px-3 py-2 text-xs text-gray-400 text-center">No options found</div>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                const OptIcon = opt.icon;

                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`
                      w-full text-left px-3 py-2 flex items-center justify-between text-xs font-semibold transition-colors cursor-pointer
                      ${
                        isSelected
                          ? 'bg-primary-50 text-primary-800 font-bold'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      {OptIcon && (
                        <OptIcon
                          className={`w-3.5 h-3.5 shrink-0 ${
                            isSelected ? 'text-primary-600' : 'text-gray-400'
                          }`}
                        />
                      )}
                      {opt.color && (
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: opt.color }}
                        />
                      )}
                      <span className="truncate">{opt.label}</span>
                      {opt.badge && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-bold shrink-0">
                          {opt.badge}
                        </span>
                      )}
                    </div>

                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary-600 shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>,
          document.body
        )}
    </div>
  );
};


