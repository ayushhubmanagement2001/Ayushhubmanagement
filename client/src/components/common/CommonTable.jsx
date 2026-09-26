import React, { useState, useMemo } from 'react';
import { Trash2, Inbox } from 'lucide-react';
import { CustomDropdown } from './CustomDropdown';
import { Pagination } from './Pagination';

/**
 * CommonTable Component
 * Modern, clean, professional SaaS data table
 * Includes built-in pagination (10, 25, 50, 100 rows per page),
 * consistent height structure, nowrap headers, and soft pastel status pills.
 */
export const CommonTable = ({
  columns = [],
  data = [],
  onCellChange,
  onDeleteRow,
  canEdit = true,
  showFooterSummary = true,
  footerSummaryData = null,
  emptyMessage = 'No records found',
  className = '',
  initialPageSize = 10,
  enableSelection = true,
  selectedRowIds = [],
  onSelectRow,
  onSelectAll,
  onBulkDelete,
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);

  // Soft pastel status pill styling options with PENDING in Yellow/Amber
  const statusOptions = [
    {
      value: 'PAID',
      label: 'PAID',
      pillClass: 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] hover:bg-[#BBF7D0] font-bold',
    },
    {
      value: 'PENDING',
      label: 'PENDING',
      pillClass: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] hover:bg-[#FDE68A] font-bold',
    },
    {
      value: 'HOLD',
      label: 'HOLD',
      pillClass: 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] hover:bg-[#FECACA] font-bold',
    },
  ];

  // Pagination slicing
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  // Reset to page 1 if data size changes beyond current page
  const safePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return data.slice(start, start + pageSize);
  }, [data, safePage, pageSize]);

  // Check if all rows on current page are selected
  const allCurrentPageSelected = useMemo(() => {
    if (paginatedData.length === 0) return false;
    return paginatedData.every((r) => selectedRowIds.includes(r.id));
  }, [paginatedData, selectedRowIds]);

  const handleHeaderSelectAll = () => {
    if (!onSelectAll) return;
    const pageIds = paginatedData.map((r) => r.id);
    if (allCurrentPageSelected) {
      // Unselect current page items
      onSelectAll(selectedRowIds.filter((id) => !pageIds.includes(id)));
    } else {
      // Select current page items + existing
      const combined = Array.from(new Set([...selectedRowIds, ...pageIds]));
      onSelectAll(combined);
    }
  };

  return (
    <div className={`bg-white border border-gray-200/80 shadow-xs rounded-xl flex flex-col min-h-0 flex-1 overflow-hidden ${className}`}>
      {/* Top Banner when items are selected */}
      {enableSelection && selectedRowIds.length > 0 && (
        <div className="bg-[#FFF1F2] border-b border-[#FECDD3] px-3.5 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0 transition-all">
          <div className="flex items-center gap-2 text-[#9F1239] font-bold">
            <span>{selectedRowIds.length} item{selectedRowIds.length > 1 ? 's' : ''} selected</span>
            {selectedRowIds.length < totalItems && (
              <button
                type="button"
                onClick={() => onSelectAll && onSelectAll(data.map((r) => r.id))}
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
                disabled={!canEdit}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-[#E11D48] text-white hover:bg-[#BE123C] shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedRowIds.length})</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 flex flex-col">
        <table className="w-full min-h-full text-left border-collapse text-xs flex-1">
          {/* Clean Modern Table Header with whitespace-nowrap */}
          <thead className="sticky top-0 z-10 bg-[#F8FAFC]">
            <tr className="bg-[#F8FAFC] text-gray-900 font-bold border-b border-gray-200 select-none">
              {/* Checkbox Header */}
              {enableSelection && (
                <th className="py-1.5 px-2 text-center w-8 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected && paginatedData.length > 0}
                    onChange={handleHeaderSelectAll}
                    disabled={!canEdit || paginatedData.length === 0}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-[#E53935] focus:ring-red-400 cursor-pointer accent-[#E53935]"
                    title="Select All on this page"
                  />
                </th>
              )}
              <th className="py-1.5 px-2 text-center text-gray-500 font-semibold w-10 whitespace-nowrap">#</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-1.5 px-2.5 whitespace-nowrap font-bold ${
                    col.align === 'right'
                      ? 'text-right'
                      : col.align === 'center'
                      ? 'text-center'
                      : 'text-left'
                  } ${col.headerBg || ''} ${col.headerText || 'text-gray-900'}`}
                  style={{ minWidth: col.minWidth || '100px' }}
                >
                  <div
                    className={`flex items-center gap-1 ${
                      col.align === 'right'
                        ? 'justify-end'
                        : col.align === 'center'
                        ? 'justify-center'
                        : 'justify-start'
                    }`}
                  >
                    <span>{col.label}</span>
                    {col.isFormula && (
                      <span className="text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-1 py-0.1 rounded border border-emerald-200">
                        auto
                      </span>
                    )}
                  </div>
                </th>
              ))}
              <th className="py-1.5 px-2 text-center text-gray-500 font-semibold w-10 whitespace-nowrap">Action</th>
            </tr>
          </thead>

          {/* Table Rows */}
          <tbody className="divide-y divide-gray-100">
            {paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (enableSelection ? 3 : 2)} className="py-12 text-center text-gray-500">
                  <div className="w-8 h-8 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-1.5">
                    <Inbox className="w-4 h-4" />
                  </div>
                  <p className="font-semibold text-gray-800 text-xs">{emptyMessage}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Add a record or switch filters to view payout details.
                  </p>
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => {
                const isPaid = (row.paymentStatus || '').toUpperCase() === 'PAID';
                const isSelected = selectedRowIds.includes(row.id);
                const actualIndex = (safePage - 1) * pageSize + index + 1;

                return (
                  <tr
                    key={row.id || index}
                    className={`h-11 hover:bg-gray-50/80 transition-colors ${
                      isSelected ? 'bg-rose-50/40' : isPaid ? 'bg-emerald-50/15' : 'bg-white'
                    }`}
                  >
                    {/* Row Selection Checkbox */}
                    {enableSelection && (
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onSelectRow && onSelectRow(row.id)}
                          disabled={!canEdit}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-[#E53935] focus:ring-red-400 cursor-pointer accent-[#E53935]"
                        />
                      </td>
                    )}

                    {/* Row Index */}
                    <td className="py-2 px-2 text-center text-gray-400 font-mono text-xs whitespace-nowrap">
                      {actualIndex}
                    </td>

                    {/* Columns */}
                    {columns.map((col) => {
                      const val = col.valueGetter ? col.valueGetter(row) : row[col.key];

                      // Custom render
                      if (col.render) {
                        return (
                          <td
                            key={col.key}
                            className={`py-2 px-2.5 whitespace-nowrap ${
                              col.align === 'right'
                                ? 'text-right'
                                : col.align === 'center'
                                ? 'text-center'
                                : 'text-left'
                            } ${col.cellBg || ''}`}
                          >
                            {col.render(row, val, onCellChange, canEdit)}
                          </td>
                        );
                      }

                      // Status Pill Dropdown (PAID: Green, PENDING: Yellow, HOLD: Red)
                      if (col.type === 'status') {
                        return (
                          <td key={col.key} className="py-1.5 px-2 text-center whitespace-nowrap">
                            <CustomDropdown
                              value={(val || 'PENDING').toUpperCase()}
                              onChange={(newVal) => onCellChange && onCellChange(row.id, col.key, newVal)}
                              options={statusOptions}
                              disabled={!canEdit}
                              size="pill"
                              minWidth="90px"
                              align="right"
                            />
                          </td>
                        );
                      }

                      // Auto-Computed Formula Column (Read-Only)
                      if (col.isFormula) {
                        return (
                          <td
                            key={col.key}
                            className={`py-2 px-2.5 text-right font-bold whitespace-nowrap select-all ${
                              col.key === 'finalPayout'
                                ? 'text-blue-900 bg-blue-50/20'
                                : 'text-emerald-900 bg-emerald-50/20'
                            }`}
                          >
                            <span className="text-xs">{val ?? 0}</span>
                          </td>
                        );
                      }

                      // Editable Input Column
                      if (col.isEditable) {
                        return (
                          <td key={col.key} className="py-1 px-1 whitespace-nowrap">
                            <input
                              type={col.type === 'number' ? 'number' : 'text'}
                              value={
                                col.type === 'number' && (val === 0 || val === '0')
                                  ? ''
                                  : (val ?? '')
                              }
                              disabled={!canEdit}
                              onFocus={(e) => e.target.select()}
                              onChange={(e) => {
                                let clean = e.target.value;
                                if (col.type === 'number' && clean) {
                                  if (/^0+[0-9]+/.test(clean)) {
                                    clean = clean.replace(/^0+/, '');
                                  }
                                }
                                onCellChange && onCellChange(row.id, col.key, clean);
                              }}
                              className={`w-full px-2 py-1 text-xs rounded-md bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-100 outline-none font-medium transition-all text-gray-900 ${
                                col.align === 'right' ? 'text-right' : 'text-left'
                              } ${col.textClass || 'text-gray-900'}`}
                              placeholder={col.placeholder || (col.type === 'number' ? '0' : '-')}
                            />
                          </td>
                        );
                      }

                      // Read-only text cell
                      return (
                        <td
                          key={col.key}
                          className={`py-2 px-2.5 text-xs text-gray-900 whitespace-nowrap ${
                            col.align === 'right'
                              ? 'text-right font-bold'
                              : 'text-left font-medium'
                          }`}
                        >
                          {val}
                        </td>
                      );
                    })}

                    {/* Delete Action */}
                    <td className="py-1 px-1.5 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onDeleteRow && onDeleteRow(row.id)}
                        disabled={!canEdit}
                        className="p-1 text-gray-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer disabled:opacity-30"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
            {/* Spacer row only when rows < pageSize to absorb remaining space cleanly */}
            {paginatedData.length > 0 && paginatedData.length < pageSize && (
              <tr className="h-full border-none pointer-events-none">
                <td colSpan={columns.length + (enableSelection ? 3 : 2)} className="p-0 border-none bg-transparent"></td>
              </tr>
            )}
          </tbody>

          {/* Footer Summary Row (Docked permanently at bottom) */}
          {showFooterSummary && data.length > 0 && footerSummaryData && (
            <tfoot className="sticky bottom-0 z-10 bg-[#F8FAFC]">
              <tr className="bg-[#F8FAFC] font-bold text-gray-900 border-t border-gray-200 select-none">
                {enableSelection && <td className="py-1.5 px-2"></td>}
                <td className="py-1.5 px-2.5 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                  SUM
                </td>
                {columns.map((col, idx) => (
                  <td
                    key={col.key || idx}
                    className={`py-1.5 px-2.5 whitespace-nowrap font-bold ${
                      col.align === 'right'
                        ? 'text-right'
                        : col.align === 'center'
                        ? 'text-center'
                        : 'text-left'
                    } ${col.footerBg || ''} ${col.footerText || 'text-gray-900'}`}
                  >
                    {footerSummaryData[col.key] !== undefined ? footerSummaryData[col.key] : ''}
                  </td>
                ))}
                <td className="py-1.5 px-1.5"></td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* Built-in Common Pagination (Permanently pinned at bottom) */}
      <Pagination
        className="shrink-0"
        currentPage={safePage}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(newSize) => {
          setPageSize(newSize);
          setCurrentPage(1);
        }}
        pageSizeOptions={[10, 25, 50, 100]}
      />
    </div>
  );
};
