import React from 'react';

export const LoadingSkeleton = ({
  type = 'table',
  rows = 5,
  columns = 5,
  className = '',
}) => {
  if (type === 'stat') {
    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-5 rounded-xl border border-gray-200 animate-pulse space-y-3">
            <div className="flex justify-between items-center">
              <div className="h-3.5 bg-gray-200 rounded w-24"></div>
              <div className="h-8 w-8 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-7 bg-gray-200 rounded w-32"></div>
            <div className="h-3 bg-gray-100 rounded w-20"></div>
          </div>
        ))}
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className={`grid grid-cols-1 md:grid-cols-3 gap-5 ${className}`}>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-xl border border-gray-200 animate-pulse space-y-4">
            <div className="h-5 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3.5 bg-gray-100 rounded w-1/2"></div>
            <div className="space-y-2 pt-2">
              <div className="h-4 bg-gray-100 rounded"></div>
              <div className="h-4 bg-gray-100 rounded w-5/6"></div>
            </div>
            <div className="h-9 bg-gray-200 rounded-lg mt-4"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex gap-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div key={i} className="h-4 bg-gray-200 rounded flex-1"></div>
        ))}
      </div>
      <div className="divide-y divide-gray-100 p-2">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="p-3 flex gap-4 animate-pulse">
            {Array.from({ length: columns }).map((_, c) => (
              <div
                key={c}
                className="h-3.5 bg-gray-100 rounded flex-1"
                style={{ width: `${60 + ((r + c) % 4) * 10}%` }}
              ></div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
