import React from 'react';

export const Card = ({
  children,
  title,
  subtitle,
  action,
  headerBorder = true,
  padding = 'normal',
  className = '',
  onClick,
  hoverable = false,
}) => {
  const paddingMap = {
    none: 'p-0',
    tight: 'p-4',
    normal: 'p-5 sm:p-6',
    spacious: 'p-6 sm:p-8',
  };

  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.04)]
        ${hoverable ? 'hover:border-gray-300 hover:shadow-md transition-all duration-200 cursor-pointer' : ''}
        ${className}
      `}
    >
      {(title || subtitle || action) && (
        <div
          className={`flex items-center justify-between gap-4 px-5 py-4 ${
            headerBorder ? 'border-b border-[#E5E7EB]' : ''
          }`}
        >
          <div>
            {title && <h3 className="text-base font-semibold text-[#1F2937]">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      )}
      <div className={title || subtitle || action ? (padding === 'none' ? 'p-0' : paddingMap[padding] || 'p-5') : paddingMap[padding] || 'p-5'}>
        {children}
      </div>
    </div>
  );
};
