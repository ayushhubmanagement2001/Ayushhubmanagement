import React, { useState } from 'react';

export const Tooltip = ({
  content,
  children,
  position = 'top', // 'top' | 'bottom' | 'left' | 'right'
  className = '',
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  if (!content) return children;

  return (
    <div
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          role="tooltip"
          className={`
            absolute z-50 px-2.5 py-1 text-[11px] font-medium text-white bg-gray-900 rounded-md shadow-md
            whitespace-nowrap pointer-events-none transition-opacity duration-150 animate-fadeIn
            ${positionClasses[position] || positionClasses.top}
          `}
        >
          {content}
        </div>
      )}
    </div>
  );
};
