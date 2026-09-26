import React from 'react';

export const PageHeader = ({
  title,
  subtitle,
  badge,
  actions,
  breadcrumbs,
  className = '',
}) => {
  return (
    <div className={`flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between pb-6 ${className}`}>
      <div>
        {breadcrumbs && (
          <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5">
            {breadcrumbs}
          </div>
        )}
        <div className="flex items-center gap-2.5">
          <h1 className="text-xl sm:text-2xl font-bold text-[#1F2937] tracking-tight">{title}</h1>
          {badge && <div>{badge}</div>}
        </div>
        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2.5 sm:self-center">
          {actions}
        </div>
      )}
    </div>
  );
};
