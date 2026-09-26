import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

/**
 * Common Reusable Pagination Component
 * Supports row page size options [10, 25, 50, 100] (default 10)
 * Soft pastel active button theme & crisp dark text
 */
export const Pagination = ({
  currentPage = 1,
  totalPages = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50, 100],
  className = '',
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getVisiblePages = () => {
    const delta = 1;
    const range = [];
    for (
      let i = Math.max(2, currentPage - delta);
      i <= Math.min(safeTotalPages - 1, currentPage + delta);
      i++
    ) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      range.unshift('...');
    }
    if (currentPage + delta < safeTotalPages - 1) {
      range.push('...');
    }

    range.unshift(1);
    if (safeTotalPages > 1) {
      range.push(safeTotalPages);
    }

    return range;
  };

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-2 px-3.5 py-1.5 bg-[#F8FAFC] border-t border-gray-200 text-xs text-gray-600 select-none ${className}`}
    >
      {/* Left: Showing count & Rows per page */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <span className="text-gray-600 font-medium text-[11px] sm:text-xs">
          Showing <strong className="text-gray-900 font-bold">{startItem}</strong> to{' '}
          <strong className="text-gray-900 font-bold">{endItem}</strong> of{' '}
          <strong className="text-gray-900 font-bold">{totalItems}</strong> entries
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-gray-500 font-medium text-[11px]">Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-white border border-gray-200 rounded-md px-2 py-0.5 text-xs font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-primary-500 cursor-pointer shadow-2xs"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Page Navigation */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs cursor-pointer"
          title="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs cursor-pointer"
          title="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1 mx-1">
          {getVisiblePages().map((page, index) => {
            if (page === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-1 text-gray-400 font-mono">
                  ...
                </span>
              );
            }
            const isCurrent = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`min-w-[28px] h-7 px-2 text-xs font-bold rounded-lg border transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-[#FFEBEE] text-[#E53935] border-[#FFCDD2] shadow-2xs'
                    : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
                }`}
              >
                {page}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= safeTotalPages}
          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs cursor-pointer"
          title="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={currentPage >= safeTotalPages}
          className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors shadow-2xs cursor-pointer"
          title="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
