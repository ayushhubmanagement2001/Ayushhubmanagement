import React, { useState, useMemo } from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown, Trash2 } from 'lucide-react';
import { Pagination } from './Pagination';
import { EmptyState } from './EmptyState';
import { LoadingSkeleton } from './LoadingSkeleton';

export const DataTable = ({
  columns = [], // [{ key, label, render, sortable, align, width, headerClassName, cellClassName }]
  data = [],
  keyField = 'id',
  loading = false,
  pagination = true,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filters to find what you are looking for.',
  emptyActionLabel,
  onEmptyAction,
  emptyActionIcon,
  emptyActionDisabled = false,
  onRowClick,
  rowClassName,
  stickyHeader = true,
  className = '',
  tableClassName = '',
  enableSelection = false,
  selectedRowIds = [],
  onSelectRow,
  onSelectAll,
  onBulkDelete,
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // Sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;

    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];

      if (aVal === undefined || aVal === null) aVal = '';
      if (bVal === undefined || bVal === null) bVal = '';

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      const strA = String(aVal).toLowerCase();
      const strB = String(bVal).toLowerCase();

      if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);

  // Pagination
  const totalItems = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, pagination, currentPage, pageSize]);

  // Selection calculation
  const allCurrentPageSelected = useMemo(() => {
    if (paginatedData.length === 0) return false;
    return paginatedData.every((r) => selectedRowIds.includes(r[keyField]));
  }, [paginatedData, selectedRowIds, keyField]);

  const handleHeaderSelectAll = () => {
    if (!onSelectAll) return;
    const pageIds = paginatedData.map((r) => r[keyField]);
    if (allCurrentPageSelected) {
      onSelectAll(selectedRowIds.filter((id) => !pageIds.includes(id)));
    } else {
      const combined = Array.from(new Set([...selectedRowIds, ...pageIds]));
      onSelectAll(combined);
    }
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handlePageSizeChange = (newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  if (loading) {
    return <LoadingSkeleton type="table" rows={pageSize} columns={columns.length + (enableSelection ? 1 : 0)} />;
  }

  return (
    <div className={`bg-white rounded-xl border border-[#E5E7EB] shadow-[0_1px_3px_rgba(0,0,0,0.03)] overflow-hidden flex flex-col ${className}`}>
      {/* Bulk action bar */}
      {enableSelection && selectedRowIds.length > 0 && (
        <div className="bg-[#FFF1F2] border-b border-[#FECDD3] px-3.5 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0 transition-all">
          <div className="flex items-center gap-2 text-[#9F1239] font-bold">
            <span>{selectedRowIds.length} item{selectedRowIds.length > 1 ? 's' : ''} selected</span>
            {selectedRowIds.length < totalItems && (
              <button
                type="button"
                onClick={() => onSelectAll && onSelectAll(data.map((r) => r[keyField]))}
                className="text-[11px] underline hover:text-[#881337] cursor-pointer ml-1 font-semibold"
              >
                Select all {totalItems} rows across all pages
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelectAll && onSelectAll([])}
              className="px-2 py-0.5 rounded text-[11px] font-semibold text-gray-600 hover:bg-rose-100 cursor-pointer"
            >
              Clear
            </button>
            {onBulkDelete && (
              <button
                type="button"
                onClick={() => onBulkDelete(selectedRowIds)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-[#E11D48] text-white hover:bg-[#BE123C] shadow-2xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedRowIds.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto w-full">
        <table className={`w-full text-left text-xs border-collapse ${tableClassName}`}>
          <thead className={`bg-[#F9FAFB] border-b border-[#E5E7EB] ${stickyHeader ? 'sticky top-0 z-10' : ''}`}>
            <tr>
              {enableSelection && (
                <th className="py-2 px-2.5 text-center w-8 select-none">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected && paginatedData.length > 0}
                    onChange={handleHeaderSelectAll}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-[#E53935] focus:ring-red-400 cursor-pointer accent-[#E53935]"
                    title="Select All on this page"
                  />
                </th>
              )}
              {columns.map((col, idx) => {
                const isSorted = sortConfig.key === col.key;
                const alignClass =
                  col.align === 'right'
                    ? 'text-right justify-end'
                    : col.align === 'center'
                    ? 'text-center justify-center'
                    : 'text-left justify-start';

                return (
                  <th
                    key={col.key || idx}
                    style={{ width: col.width }}
                    className={`
                      px-3 py-2 text-[11px] font-bold text-gray-600 uppercase tracking-wider select-none whitespace-nowrap
                      ${col.sortable ? 'cursor-pointer hover:bg-gray-100/80 transition-colors' : ''}
                      ${col.headerClassName || ''}
                    `}
                    onClick={() => col.sortable && handleSort(col.key)}
                  >
                    <div className={`inline-flex items-center gap-1.5 ${alignClass} w-full`}>
                      <span>{col.label}</span>
                      {col.sortable && (
                        <span className="text-gray-400">
                          {isSorted ? (
                            sortConfig.direction === 'asc' ? (
                              <ArrowUp className="w-3.5 h-3.5 text-[#E53935]" />
                            ) : (
                              <ArrowDown className="w-3.5 h-3.5 text-[#E53935]" />
                            )
                          ) : (
                            <ArrowUpDown className="w-3.5 h-3.5 opacity-40 hover:opacity-100" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] bg-white">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (enableSelection ? 1 : 0)} className="p-0">
                  <EmptyState
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                    actionIcon={emptyActionIcon}
                    actionDisabled={emptyActionDisabled}
                  />
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIdx) => {
                const isClickable = !!onRowClick;
                const customRowClass =
                  typeof rowClassName === 'function' ? rowClassName(row, rowIdx) : rowClassName || '';

                return (
                  <tr
                    key={row[keyField] || rowIdx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`
                      transition-colors duration-100 hover:bg-gray-50/80
                      ${isClickable ? 'cursor-pointer' : ''}
                      ${enableSelection && selectedRowIds.includes(row[keyField]) ? 'bg-red-50/40' : ''}
                      ${customRowClass}
                    `}
                  >
                    {enableSelection && (
                      <td className="py-1 px-2.5 text-center whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedRowIds.includes(row[keyField])}
                          onChange={() => onSelectRow && onSelectRow(row[keyField])}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-[#E53935] focus:ring-red-400 cursor-pointer accent-[#E53935]"
                        />
                      </td>
                    )}
                    {columns.map((col, colIdx) => {
                      const alignClass =
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left';

                      const cellValue = row[col.key];

                      return (
                        <td
                          key={col.key || colIdx}
                          className={`
                            px-3 py-1.5 text-xs text-[#1F2937] whitespace-nowrap
                            ${alignClass}
                            ${col.cellClassName || ''}
                          `}
                        >
                          {col.render ? col.render(cellValue, row, rowIdx) : cellValue !== undefined && cellValue !== null ? String(cellValue) : '-'}
                        </td>
                      );
                    })}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && totalItems > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={handlePageChange}
          onPageSizeChange={handlePageSizeChange}
          pageSizeOptions={pageSizeOptions}
        />
      )}
    </div>
  );
};
