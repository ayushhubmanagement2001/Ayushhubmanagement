import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

export const Dropdown = ({
  trigger,
  items = [], // [{ label, icon: Icon, onClick, danger, disabled, divider }]
  children,
  align = 'right', // 'left' | 'right'
  className = '',
  menuClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [coords, setCoords] = useState({
    top: 0,
    left: 0,
    width: 200,
  });

  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const menuWidth = 200;

    let left;
    if (align === 'right') {
      left = rect.right - menuWidth;
    } else {
      left = rect.left;
    }

    if (left + menuWidth > viewportWidth - 8) {
      left = viewportWidth - menuWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    let top = rect.bottom + 6;
    if (top + 200 > viewportHeight && rect.top > 200) {
      top = rect.top - 6;
    }

    setCoords({
      top,
      left,
      width: menuWidth,
    });
  }, [align]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        menuRef.current &&
        !menuRef.current.contains(event.target)
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

  const toggleDropdown = () => {
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <div ref={triggerRef} onClick={toggleDropdown}>
        {trigger}
      </div>

      {isOpen &&
        createPortal(
          <div
            ref={menuRef}
            className={`
              fixed z-[9999] w-48 sm:w-52 rounded-xl bg-white shadow-2xl border border-gray-100 py-1.5
              animate-in fade-in zoom-in-95 duration-150 text-xs
              ${menuClassName}
            `}
            style={{
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
          >
            {children ? (
              children({ close: () => setIsOpen(false) })
            ) : (
              items.map((item, index) => {
                if (item.divider) {
                  return <div key={`div-${index}`} className="my-1 border-t border-gray-100" />;
                }
                const Icon = item.icon;
                return (
                  <button
                    key={item.label || index}
                    type="button"
                    disabled={item.disabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!item.disabled && item.onClick) {
                        item.onClick();
                        setIsOpen(false);
                      }
                    }}
                    className={`
                      w-full text-left px-3.5 py-2 flex items-center gap-2.5 transition-colors font-medium
                      ${
                        item.danger
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                      }
                      ${item.disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}
                    `}
                  >
                    {Icon && <Icon className="w-4 h-4 shrink-0" />}
                    <span>{item.label}</span>
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

