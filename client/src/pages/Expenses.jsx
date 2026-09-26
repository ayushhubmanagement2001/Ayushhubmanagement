import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Download,
  Plus,
  Search,
  FileText,
  Inbox,
  Trash2,
  ChevronDown,
  Mail,
} from 'lucide-react';
import { ConfirmationModal, Pagination, SendEmailModal } from '../components/common';
import { useCompany } from '../context/CompanyContext';
import { useLock } from '../context/LockContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTabRefresh } from '../context/RefreshContext';
import { formatCurrency } from '../utils/calculations';
import { downloadExcel, downloadCSV } from '../utils/exportUtils';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

export const Expenses = () => {
  const { selectedMonthFilter } = useCompany();
  const { canEdit, notifyLocked } = useLock();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Tab Refresh Hook
  useTabRefresh(() => {
    fetchHubExpenses();
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [rowToDelete, setRowToDelete] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isTemplateMenuOpen, setIsTemplateMenuOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const templateMenuRef = useRef(null);

  // Close template menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (templateMenuRef.current && !templateMenuRef.current.contains(e.target)) {
        setIsTemplateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch hub expenses from backend
  const fetchHubExpenses = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const params = {};
      if (selectedMonthFilter && selectedMonthFilter !== 'all') {
        params.month = selectedMonthFilter;
      }

      const res = await apiClient.get(ENDPOINTS.HUB_EXPENSES.GET_ALL, { params });
      if (res.success && Array.isArray(res.data)) {
        const formatted = res.data.map((item) => ({
          ...item,
          id: item._id || item.id,
        }));
        setRows(formatted);
      }
    } catch (error) {
      console.error('[Fetch Hub Expenses Error]:', error.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedMonthFilter]);

  useEffect(() => {
    fetchHubExpenses();
  }, [fetchHubExpenses]);

  // Filtered rows for search
  const displayedRows = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch = !searchQuery || 
        r.expenseName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.date?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.remark?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.amount?.toString().includes(searchQuery);
      return matchSearch;
    });
  }, [rows, searchQuery]);

  // Pagination calculation
  const totalItems = displayedRows.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return displayedRows.slice(start, start + pageSize);
  }, [displayedRows, safePage, pageSize]);

  // Check if all rows on current page are selected
  const allCurrentPageSelected = useMemo(() => {
    if (paginatedRows.length === 0) return false;
    return paginatedRows.every((r) => selectedRowIds.includes(r.id));
  }, [paginatedRows, selectedRowIds]);

  const handleHeaderSelectAll = () => {
    const pageIds = paginatedRows.map((r) => r.id);
    if (allCurrentPageSelected) {
      setSelectedRowIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedRowIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleRowSelect = (rowId) => {
    setSelectedRowIds((prev) =>
      prev.includes(rowId) ? prev.filter((id) => id !== rowId) : [...prev, rowId]
    );
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    try {
      const res = await apiClient.post(ENDPOINTS.HUB_EXPENSES.BULK_DELETE, { ids: selectedRowIds });
      if (res.success) {
        setRows((prev) => prev.filter((r) => !selectedRowIds.includes(r.id)));
        toast.success(`Deleted ${selectedRowIds.length} expense records.`);
        setSelectedRowIds([]);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete selected expenses');
    } finally {
      setIsBulkDeleteModalOpen(false);
    }
  };

  // Handle cell edit
  const handleCellChange = async (rowId, field, value) => {
    if (!canEdit) {
      notifyLocked('edit expense record');
      return;
    }

    let cleanValue = value;
    if (field === 'amount') {
      let str = String(value ?? '').trim();
      if (/^0+[0-9]+/.test(str)) {
        str = str.replace(/^0+/, '');
      }
      cleanValue = str;
    }

    setRows((prev) =>
      prev.map((r) => (r.id === rowId ? { ...r, [field]: cleanValue } : r))
    );

    try {
      await apiClient.patch(ENDPOINTS.HUB_EXPENSES.UPDATE(rowId), { [field]: cleanValue });
    } catch (error) {
      toast.error(error.message || 'Failed to update expense');
      fetchHubExpenses();
    }
  };

  // Add a new expense
  const handleAddRow = async () => {
    if (!canEdit) {
      notifyLocked('add expense');
      return;
    }

    try {
      const newExpensePayload = {
        month: selectedMonthFilter,
        expenseName: 'New Expense',
        amount: 0,
        date: new Date().toISOString().split('T')[0],
        remark: '',
      };

      const res = await apiClient.post(ENDPOINTS.HUB_EXPENSES.CREATE, newExpensePayload);
      if (res.success && res.data) {
        const created = { ...res.data, id: res.data._id || res.data.id };
        setRows((prev) => [created, ...prev]);
        toast.success('New expense record added.');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add expense');
    }
  };

  // Delete row confirmation
  const handleDeleteRow = (rowId) => {
    if (!canEdit) {
      notifyLocked('delete expense');
      return;
    }
    const target = rows.find((r) => r.id === rowId);
    setRowToDelete(target);
  };

  const handleConfirmDelete = async () => {
    if (!rowToDelete) return;
    try {
      const res = await apiClient.delete(ENDPOINTS.HUB_EXPENSES.DELETE(rowToDelete.id));
      if (res.success) {
        setRows((prev) => prev.filter((r) => r.id !== rowToDelete.id));
        toast.success(`Expense "${rowToDelete.expenseName}" deleted.`);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete expense');
    } finally {
      setRowToDelete(null);
    }
  };

  // Export CSV File
  const handleExportCSV = () => {
    if (displayedRows.length === 0) {
      toast.error('No expense records to export.');
      return;
    }

    const headers = ['Expense Name', 'Amount', 'Date', 'Remark'];
    const csvRows = displayedRows.map((r) => {
      return [
        `"${r.expenseName || ''}"`,
        r.amount || 0,
        `"${r.date || ''}"`,
        `"${r.remark || ''}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Hub_Expenses_${selectedMonthFilter}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Exported ${displayedRows.length} expense records to CSV!`);
  };

  // Download Sample Template
  const handleDownloadTemplate = (format = 'xlsx') => {
    const headers = ['Expense Name', 'Amount', 'Date', 'Remark'];
    const filename = `Hub_Expense_Template_${selectedMonthFilter}`;

    if (format === 'xlsx') {
      downloadExcel(headers, [], filename);
    } else {
      downloadCSV(headers, [], filename);
    }
    toast.success(`Downloaded Hub expense template (${format.toUpperCase()})`);
  };

  // Import Excel/CSV File
  const handleFileUpload = (e) => {
    if (!canEdit) {
      notifyLocked('upload expense data');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result;
        if (!text || typeof text !== 'string') {
          toast.error('Unable to read uploaded file.');
          return;
        }

        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          toast.error('The uploaded file contains no data rows.');
          return;
        }

        const importedRows = [];
        for (let i = 1; i < lines.length; i++) {
          const rawLine = lines[i];
          const cols = rawLine.split(',').map((col) => col.trim().replace(/^["']|["']$/g, ''));
          if (cols.length >= 2 && cols[0]) {
            const expenseName = cols[0] || `Expense ${i}`;
            const amount = Number(cols[1]) || 0;
            const date = cols[2] || new Date().toISOString().split('T')[0];
            const remark = cols[3] || '';

            importedRows.push({
              expenseName,
              amount,
              date,
              remark,
            });
          }
        }

        if (importedRows.length > 0) {
          const res = await apiClient.post(ENDPOINTS.HUB_EXPENSES.BULK_IMPORT, {
            month: selectedMonthFilter,
            rows: importedRows,
          });

          if (res.success) {
            toast.success(`Successfully imported ${importedRows.length} expense records to database!`);
            fetchHubExpenses();
          }
        } else {
          toast.error('No valid expense records parsed. Please check template format.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse file. Please upload a valid CSV file.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsText(file);
  };

  // Footer totals
  const totalExpenses = useMemo(() => {
    return displayedRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  }, [displayedRows]);

  return (
    <div className="h-full w-full flex flex-col min-h-0 gap-2">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-white p-2 rounded-xl border border-gray-200/80 shadow-xs shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search expense name, amount, date..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 font-medium text-gray-900"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center flex-wrap gap-1.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv, .xlsx, .xls, text/csv"
            className="hidden"
          />

          {/* Sample Template Dropdown */}
          <div className="relative inline-flex" ref={templateMenuRef}>
            <div className="inline-flex rounded-lg shadow-2xs border border-gray-200 bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => handleDownloadTemplate('xlsx')}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-gray-50 border-r border-gray-200 transition-colors cursor-pointer select-none"
                title="Download Excel Template"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sample Template</span>
              </button>
              <button
                type="button"
                onClick={() => setIsTemplateMenuOpen((prev) => !prev)}
                className="px-1.5 py-1 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center cursor-pointer select-none"
                title="Choose Format"
              >
                <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isTemplateMenuOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {isTemplateMenuOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto top-full mt-1.5 w-44 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-50">
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadTemplate('xlsx');
                    setIsTemplateMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold">Excel Template</span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">.XLSX</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleDownloadTemplate('csv');
                    setIsTemplateMenuOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                >
                  <span className="font-semibold">CSV Template</span>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">.CSV</span>
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] hover:bg-[#E0E7FF] shadow-2xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span>Upload Excel / CSV</span>
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] hover:bg-[#D1FAE5] shadow-2xs cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-[#059669]" />
            <span>Export CSV</span>
          </button>

          {/* Send Mail Button */}
          <button
            type="button"
            onClick={() => setIsEmailModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 shadow-2xs cursor-pointer shrink-0"
            title="Send Exported Excel directly to Email"
          >
            <Mail className="w-3.5 h-3.5 text-rose-600" />
            <span>Send Mail</span>
          </button>

          <button
            type="button"
            onClick={handleAddRow}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all duration-200 bg-[#FFEBEE] text-[#E53935] border border-[#FFCDD2] hover:bg-red-100 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#E53935]" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-gray-200/80 shadow-xs rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Bulk Action Bar */}
        {selectedRowIds.length > 0 && (
          <div className="bg-[#FFF1F2] border-b border-[#FECDD3] px-3.5 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0 transition-all">
            <div className="flex items-center gap-2 text-[#9F1239] font-bold">
              <span>{selectedRowIds.length} expense record{selectedRowIds.length > 1 ? 's' : ''} selected</span>
              {selectedRowIds.length < totalItems && (
                <button
                  type="button"
                  onClick={() => setSelectedRowIds(displayedRows.map((r) => r.id))}
                  className="text-[11px] underline hover:text-[#881337] cursor-pointer ml-1 font-semibold"
                >
                  Select all {totalItems} rows across all pages
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedRowIds([])}
                className="px-2 py-0.5 rounded text-[11px] font-semibold text-gray-600 hover:bg-rose-100 cursor-pointer"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                disabled={!canEdit}
                className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold bg-[#E11D48] text-white hover:bg-[#BE123C] shadow-2xs cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedRowIds.length})</span>
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0 flex flex-col">
          <table className="w-full min-h-full text-left border-collapse text-xs flex-1">
            {/* Table Header */}
            <thead className="sticky top-0 z-10 bg-[#F8FAFC]">
              <tr className="bg-[#F8FAFC] text-gray-900 font-bold border-b border-gray-200 select-none">
                <th className="py-1.5 px-2 text-center w-8 whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected && paginatedRows.length > 0}
                    onChange={handleHeaderSelectAll}
                    disabled={!canEdit || paginatedRows.length === 0}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer disabled:cursor-not-allowed accent-rose-600"
                    title="Select All on this page"
                  />
                </th>
                <th className="py-1.5 px-2.5 text-center text-gray-500 font-semibold w-10 whitespace-nowrap">#</th>
                <th className="py-1.5 px-3 whitespace-nowrap">Expense Name</th>
                <th className="py-1.5 px-3 text-right whitespace-nowrap">Amount</th>
                <th className="py-1.5 px-3 whitespace-nowrap">Date</th>
                <th className="py-1.5 px-3 whitespace-nowrap">Remark</th>
                <th className="py-1.5 px-2 text-center text-gray-500 font-semibold w-10 whitespace-nowrap">Action</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-500">
                    <div className="w-8 h-8 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-1.5">
                      <Inbox className="w-4 h-4" />
                    </div>
                    <p className="font-semibold text-gray-800 text-xs">No expenses found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Click "+ Add Expense" or upload an Excel / CSV file to record hub expenses.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, index) => {
                  const actualIndex = (safePage - 1) * pageSize + index + 1;
                  const isSelected = selectedRowIds.includes(row.id);

                  return (
                    <tr
                      key={row.id || index}
                      className={`h-9.5 hover:bg-gray-50/80 transition-colors ${isSelected ? 'bg-rose-50/40' : 'bg-white'}`}
                    >
                      {/* Checkbox */}
                      <td className="py-1 px-2 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRowSelect(row.id)}
                          disabled={!canEdit}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer disabled:cursor-not-allowed accent-rose-600"
                        />
                      </td>

                      {/* Row Index */}
                      <td className="py-1.5 px-2.5 text-center text-gray-400 font-mono text-xs whitespace-nowrap">
                        {actualIndex}
                      </td>

                      {/* Col 1: Expense Name (Editable) */}
                      <td className="py-1 px-3 whitespace-nowrap">
                        <input
                          type="text"
                          value={row.expenseName || ''}
                          disabled={!canEdit}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleCellChange(row.id, 'expenseName', e.target.value)}
                          className="w-full px-2 py-0.5 text-xs font-semibold text-gray-900 rounded-md bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-100 outline-none transition-all"
                          placeholder="Expense Name / Description"
                        />
                      </td>

                      {/* Col 2: Amount (Editable) */}
                      <td className="py-1 px-3 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-gray-400 font-medium">₹</span>
                          <input
                            type="number"
                            value={row.amount === 0 || row.amount === '0' ? '' : (row.amount ?? '')}
                            disabled={!canEdit}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleCellChange(row.id, 'amount', e.target.value)}
                            className="w-24 px-2 py-0.5 text-xs text-right font-bold text-gray-900 rounded-md bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-100 outline-none transition-all"
                            placeholder="0"
                          />
                        </div>
                      </td>

                      {/* Col 3: Date (Editable) */}
                      <td className="py-1 px-3 whitespace-nowrap">
                        <input
                          type="date"
                          value={row.date || ''}
                          disabled={!canEdit}
                          onChange={(e) => handleCellChange(row.id, 'date', e.target.value)}
                          className="w-36 px-2 py-0.5 text-xs font-medium text-gray-800 rounded-md bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-100 outline-none transition-all cursor-pointer"
                        />
                      </td>

                      {/* Col 4: Remark (Editable) */}
                      <td className="py-1 px-3 whitespace-nowrap">
                        <input
                          type="text"
                          value={row.remark || ''}
                          disabled={!canEdit}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleCellChange(row.id, 'remark', e.target.value)}
                          className="w-full min-w-[150px] px-2 py-0.5 text-xs font-medium text-gray-800 rounded-md bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-100 outline-none transition-all"
                          placeholder="Enter remark"
                        />
                      </td>

                      {/* Action: Delete */}
                      <td className="py-1 px-1.5 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row.id)}
                          disabled={!canEdit}
                          className="p-1 text-gray-400 hover:text-rose-600 rounded-md transition-colors cursor-pointer disabled:opacity-30"
                          title="Delete expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
              {/* Spacer row only when rows < pageSize to absorb space cleanly */}
              {paginatedRows.length > 0 && paginatedRows.length < pageSize && (
                <tr className="h-full border-none pointer-events-none">
                  <td colSpan={7} className="p-0 border-none bg-transparent"></td>
                </tr>
              )}
            </tbody>

            {/* Footer Summary Row */}
            {displayedRows.length > 0 && (
              <tfoot className="sticky bottom-0 z-10 bg-[#F8FAFC]">
                <tr className="bg-[#F8FAFC] font-bold text-gray-900 border-t border-gray-200 select-none">
                  <td className="py-1.5 px-2"></td>
                  <td className="py-1.5 px-2.5 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                    SUM
                  </td>
                  <td className="py-1.5 px-3 whitespace-nowrap">
                    Total ({displayedRows.length} Expenses)
                  </td>
                  <td className="py-1.5 px-3 text-right whitespace-nowrap text-gray-900 font-extrabold text-xs">
                    {formatCurrency(totalExpenses)}
                  </td>
                  <td className="py-1.5 px-3 text-gray-500 text-xs whitespace-nowrap">
                    {selectedMonthFilter}
                  </td>
                  <td className="py-1.5 px-3"></td>
                  <td className="py-1.5 px-2"></td>
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

      {/* Delete Single Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!rowToDelete}
        onClose={() => setRowToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Expense Record"
        message={`Are you sure you want to delete "${rowToDelete?.expenseName || 'this expense'}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete"
        variant="danger"
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Selected Expenses"
        message={`Are you sure you want to delete ${selectedRowIds.length} selected expense records? This action cannot be undone.`}
        confirmLabel={`Yes, Delete ${selectedRowIds.length} Records`}
        variant="danger"
      />

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        reportTitle="Hub Expenses"
        reportType="Operational Expense Ledger"
        sheetName="Hub Expenses"
        filename={`Hub_Expenses_${selectedMonthFilter || 'All_Months'}.xlsx`}
        metadata={[
          { label: 'Period', value: selectedMonthFilter || 'All Months' },
        ]}
        summaryCards={[
          { label: 'Total Records', value: displayedRows.length },
          { label: 'Total Expenses', value: formatCurrency(totalExpenses), highlight: true, color: 'emerald' },
        ]}
        headers={['Expense Name', 'Amount', 'Date', 'Remark']}
        rows={displayedRows.map((r) => [r.expenseName || '', Number(r.amount) || 0, r.date || '', r.remark || ''])}
      />
    </div>
  );
};
