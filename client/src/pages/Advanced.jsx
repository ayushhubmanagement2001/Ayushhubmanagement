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
  Calendar,
  User,
  Hash,
  DollarSign,
  MessageSquare,
  Mail,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ConfirmationModal, Pagination, SendEmailModal } from '../components/common';
import { useLock } from '../context/LockContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTabRefresh } from '../context/RefreshContext';
import { formatCurrency } from '../utils/calculations';
import { downloadCSV, downloadExcel } from '../utils/exportUtils';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

export const Advanced = () => {
  const { canEdit, notifyLocked } = useLock();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Tab Refresh Hook
  useTabRefresh(() => {
    fetchAdvances();
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [rowToDelete, setRowToDelete] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSampleSheetMenuOpen, setIsSampleSheetMenuOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);
  const sampleSheetMenuRef = useRef(null);

  // New Record Form State for Add Modal
  const [newForm, setNewForm] = useState({
    date: new Date().toISOString().split('T')[0],
    riderName: '',
    riderId: '',
    advance: '',
    advanceCut: '',
    remark: '',
  });

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
      if (sampleSheetMenuRef.current && !sampleSheetMenuRef.current.contains(event.target)) {
        setIsSampleSheetMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch all advance records from backend
  const fetchAdvances = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await apiClient.get(ENDPOINTS.ADVANCES.GET_ALL);
      if (res.success && Array.isArray(res.data)) {
        const formatted = res.data.map((item) => ({
          ...item,
          id: item._id || item.id,
          date: item.date || '',
          riderName: item.riderName || '',
          riderId: item.riderId || '',
          advance: Number(item.advance) || 0,
          advanceCut: Number(item.advanceCut) || 0,
          remainingAmount:
            Number(item.remainingAmount) !== undefined && !isNaN(Number(item.remainingAmount))
              ? Number(item.remainingAmount)
              : (Number(item.advance || 0) - Number(item.advanceCut || 0)),
          remark: item.remark || '',
        }));
        setRows(formatted);
      }
    } catch (error) {
      console.error('[Fetch Advances Error]:', error.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchAdvances();
    setSelectedRowIds([]);
  }, [fetchAdvances]);

  // Filtered rows based on search
  const displayedRows = useMemo(() => {
    return rows.filter((r) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.riderName?.toLowerCase().includes(q) ||
        r.riderId?.toLowerCase().includes(q) ||
        r.date?.toLowerCase().includes(q) ||
        r.remark?.toLowerCase().includes(q) ||
        r.advance?.toString().includes(q) ||
        r.advanceCut?.toString().includes(q) ||
        r.remainingAmount?.toString().includes(q)
      );
    });
  }, [rows, searchQuery]);

  // Totals calculation
  const totals = useMemo(() => {
    return displayedRows.reduce(
      (acc, r) => {
        const adv = Number(r.advance) || 0;
        const cut = Number(r.advanceCut) || 0;
        acc.advance += adv;
        acc.advanceCut += cut;
        acc.remaining += adv - cut;
        return acc;
      },
      { advance: 0, advanceCut: 0, remaining: 0 }
    );
  }, [displayedRows]);

  // Pagination calculation
  const totalItems = displayedRows.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);

  const paginatedRows = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return displayedRows.slice(start, start + pageSize);
  }, [displayedRows, safePage, pageSize]);

  // Select all on current page logic
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

  const handleToggleRow = (id) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((rowId) => rowId !== id) : [...prev, id]
    );
  };

  // Handle cell edit in-place
  const handleCellChange = async (rowId, field, value) => {
    if (!canEdit) {
      notifyLocked('edit advance record');
      return;
    }

    let cleanValue = value;
    if (field === 'advance' || field === 'advanceCut') {
      let str = String(value ?? '').trim();
      if (/^0+[0-9]+/.test(str)) {
        str = str.replace(/^0+/, '');
      }
      cleanValue = str;
    }

    const payload = { [field]: cleanValue };

    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, [field]: cleanValue };

        if (field === 'advance' || field === 'advanceCut') {
          const adv = field === 'advance' ? Number(cleanValue) || 0 : Number(r.advance) || 0;
          const cut = field === 'advanceCut' ? Number(cleanValue) || 0 : Number(r.advanceCut) || 0;
          updated.remainingAmount = adv - cut;
        }
        return updated;
      })
    );

    try {
      await apiClient.patch(ENDPOINTS.ADVANCES.UPDATE(rowId), payload);
    } catch (error) {
      toast.error(error.message || 'Failed to update advance record');
      fetchAdvances();
    }
  };

  // Handle Create Advance from Modal
  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      notifyLocked('add advance record');
      return;
    }

    if (!newForm.riderName.trim()) {
      toast.error('Rider Name is required.');
      return;
    }

    try {
      const payload = {
        date: newForm.date || new Date().toISOString().split('T')[0],
        riderName: newForm.riderName.trim(),
        riderId: newForm.riderId.trim(),
        advance: Number(newForm.advance) || 0,
        advanceCut: Number(newForm.advanceCut) || 0,
        remark: newForm.remark.trim(),
      };

      const res = await apiClient.post(ENDPOINTS.ADVANCES.CREATE, payload);
      if (res.success && res.data) {
        const created = {
          ...res.data,
          id: res.data._id || res.data.id,
        };
        setRows((prev) => [created, ...prev]);
        toast.success(`Advance record for '${created.riderName}' created successfully!`);
        setIsAddModalOpen(false);
        setNewForm({
          date: new Date().toISOString().split('T')[0],
          riderName: '',
          riderId: '',
          advance: '',
          advanceCut: '',
          remark: '',
        });
      }
    } catch (error) {
      toast.error(error.message || 'Failed to create advance record');
    }
  };

  // Delete single row
  const handleConfirmDelete = async () => {
    if (!rowToDelete) return;
    try {
      await apiClient.delete(ENDPOINTS.ADVANCES.DELETE(rowToDelete.id));
      setRows((prev) => prev.filter((r) => r.id !== rowToDelete.id));
      setSelectedRowIds((prev) => prev.filter((id) => id !== rowToDelete.id));
      toast.success('Advance record deleted successfully.');
    } catch (error) {
      toast.error(error.message || 'Failed to delete advance record');
    } finally {
      setRowToDelete(null);
    }
  };

  // Bulk delete selected rows
  const handleConfirmBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    try {
      await apiClient.post(ENDPOINTS.ADVANCES.BULK_DELETE, { ids: selectedRowIds });
      setRows((prev) => prev.filter((r) => !selectedRowIds.includes(r.id)));
      toast.success(`Deleted ${selectedRowIds.length} advance records.`);
      setSelectedRowIds([]);
    } catch (error) {
      toast.error(error.message || 'Failed to bulk delete records');
    } finally {
      setIsBulkDeleteModalOpen(false);
    }
  };

  // Sample template headers & download
  const templateHeaders = [
    'Date',
    'Rider Name',
    'Rider ID',
    'Advance',
    'Advance Cut',
    'Remaining Amount',
    'Remark',
  ];

  const handleDownloadSample = (format = 'xlsx') => {
    setIsSampleSheetMenuOpen(false);
    const filename = `Advance_Sample_Template`;
    const sampleRows = [
      [new Date().toISOString().split('T')[0], 'Shubham Wasnik', '123456', 5000, 2000, 3000, 'payout cycle 1 cut'],
    ];

    if (format === 'xlsx') {
      downloadExcel(templateHeaders, sampleRows, filename);
    } else {
      downloadCSV(templateHeaders, sampleRows, filename);
    }
    toast.success(`Downloaded sample advance template (${format.toUpperCase()})`);
  };

  // Export Data
  const handleExport = (format) => {
    setIsExportMenuOpen(false);
    const filename = `Advance_Details`;

    const headers = [
      'Date',
      'Rider Name',
      'Rider ID',
      'Advance',
      'Advance Cut',
      'Remaining Amount',
      'Remark',
    ];

    const dataRows = displayedRows.map((r) => [
      r.date || '',
      r.riderName || '',
      r.riderId || '',
      r.advance || 0,
      r.advanceCut || 0,
      (Number(r.advance) || 0) - (Number(r.advanceCut) || 0),
      r.remark || '',
    ]);

    if (format === 'xlsx') {
      downloadExcel(headers, dataRows, filename);
      toast.success(`Exported ${displayedRows.length} records to Excel.`);
    } else {
      downloadCSV(headers, dataRows, filename);
      toast.success(`Exported ${displayedRows.length} records to CSV.`);
    }
  };

  // Handle File Upload (Excel / CSV)
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!canEdit) {
      notifyLocked('upload advance file');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (json.length === 0) {
          toast.error('The selected file has no data rows to import.');
          return;
        }

        const mappedRows = json.map((row) => {
          const keys = Object.keys(row);
          const findVal = (possibleKeys) => {
            for (const key of possibleKeys) {
              const matched = keys.find((k) => k.trim().toLowerCase() === key.toLowerCase());
              if (matched && row[matched] !== undefined && row[matched] !== '') {
                return row[matched];
              }
            }
            return '';
          };

          const rawDate = findVal(['Date', 'date', 'Entry Date', 'Date of Advance']);
          const rawRiderName = findVal(['Rider Name', 'Rider', 'Name', 'riderName', 'RiderName']);
          const rawRiderId = findVal(['Rider ID', 'RiderId', 'ID', 'rider_id', 'riderId', 'Emp ID']);
          const rawAdvance = findVal(['Advance', 'Advance Amount', 'advance', 'Total Advance']);
          const rawAdvanceCut = findVal(['Advance Cut', 'Advacnce Cut', 'AdvanceCut', 'advanceCut', 'Cut', 'Deduction']);
          const rawRemark = findVal(['Remark', 'Remarks', 'remark', 'Note', 'Comments', 'Description']);

          return {
            date: rawDate ? String(rawDate).trim() : new Date().toISOString().split('T')[0],
            riderName: String(rawRiderName || '').trim() || 'Rider',
            riderId: String(rawRiderId || '').trim(),
            advance: Number(rawAdvance) || 0,
            advanceCut: Number(rawAdvanceCut) || 0,
            remark: String(rawRemark || '').trim(),
          };
        });

        const res = await apiClient.post(ENDPOINTS.ADVANCES.BULK_IMPORT, {
          rows: mappedRows,
        });

        if (res.success) {
          toast.success(`Successfully imported ${res.count || mappedRows.length} advance records!`);
          fetchAdvances();
        }
      } catch (err) {
        console.error('File parsing error:', err);
        toast.error('Failed to parse file. Please check format and try again.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  return (
    <div className="h-full w-full flex flex-col min-h-0 gap-2 animate-fade-in">
      {/* Main Container Card */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search rider name, ID, date, remark..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-10 pr-4 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all bg-gray-50/50 hover:bg-white"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
            {/* Bulk Delete Button */}
            {selectedRowIds.length > 0 && (
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedRowIds.length})</span>
              </button>
            )}

            {/* Download Sample Template Dropdown */}
            <div className="relative" ref={sampleSheetMenuRef}>
              <div className="inline-flex rounded-xl shadow-xs border border-gray-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => handleDownloadSample('xlsx')}
                  className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50 border-r border-gray-200 transition-colors cursor-pointer select-none"
                  title="Download Excel Template"
                >
                  <FileText className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Sample Sheet</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsSampleSheetMenuOpen((prev) => !prev)}
                  className="px-2 py-2 text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors flex items-center cursor-pointer select-none"
                  title="Choose Template Format"
                >
                  <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${isSampleSheetMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {isSampleSheetMenuOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-44 bg-white border border-gray-100 rounded-xl shadow-xl py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => handleDownloadSample('xlsx')}
                    className="w-full text-left px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-semibold">Excel Template</span>
                    <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">.XLSX</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDownloadSample('csv')}
                    className="w-full text-left px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-semibold">CSV Template</span>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">.CSV</span>
                  </button>
                </div>
              )}
            </div>

            {/* Hidden File Input for Upload */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".csv, .xlsx, .xls"
              className="hidden"
            />

            {/* Upload Excel / CSV */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-600" />
              <span>Import File</span>
            </button>

            {/* Export Dropdown */}
            <div className="relative" ref={exportMenuRef}>
              <button
                type="button"
                onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-gray-500" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 text-gray-400" />
              </button>

              {isExportMenuOpen && (
                <div className="absolute right-0 mt-1.5 w-40 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                  <button
                    type="button"
                    onClick={() => handleExport('xlsx')}
                    className="w-full text-left px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Excel (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport('csv')}
                    className="w-full text-left px-3.5 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>CSV (.csv)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Send Mail Button */}
            <button
              type="button"
              onClick={() => setIsEmailModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 shadow-2xs cursor-pointer"
              title="Send Exported Excel directly to Email"
            >
              <Mail className="w-3.5 h-3.5 text-rose-600" />
              <span>Send Mail</span>
            </button>

            {/* Add Record Button */}
            <button
              type="button"
              onClick={() => {
                if (!canEdit) {
                  notifyLocked('add advance record');
                  return;
                }
                setNewForm({
                  date: new Date().toISOString().split('T')[0],
                  riderName: '',
                  riderId: '',
                  advance: '',
                  advanceCut: '',
                  remark: '',
                });
                setIsAddModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-black hover:bg-gray-800 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Record</span>
            </button>
          </div>
        </div>

        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 p-3 sm:p-4 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="p-2.5 sm:p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-0.5">Total Advance Given</span>
            <span className="text-sm sm:text-base font-black text-gray-900">
              ₹{displayedRows.reduce((sum, r) => sum + (Number(r.advance) || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block mb-0.5">Total Advance Cut</span>
            <span className="text-sm sm:text-base font-black text-emerald-700">
              ₹{displayedRows.reduce((sum, r) => sum + (Number(r.advanceCut) || 0), 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-0.5">Remaining Balance</span>
            <span className="text-sm sm:text-base font-black text-amber-700">
              ₹{displayedRows.reduce((sum, r) => sum + ((Number(r.advance) || 0) - (Number(r.advanceCut) || 0)), 0).toLocaleString('en-IN')}
            </span>
          </div>

          <div className="p-2.5 sm:p-3 bg-white border border-gray-200 rounded-xl shadow-2xs">
            <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider block mb-0.5">Total Records</span>
            <span className="text-sm sm:text-base font-black text-blue-700">
              {displayedRows.length} Records
            </span>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedRowIds.length > 0 && (
          <div className="bg-[#FFF1F2] border-b border-[#FECDD3] px-3.5 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0 transition-all">
            <div className="flex items-center gap-2 text-[#9F1239] font-bold">
              <span>{selectedRowIds.length} advance record{selectedRowIds.length > 1 ? 's' : ''} selected</span>
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

        {/* Advance Table */}
        <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-[#F8FAFC]">
              <tr className="bg-[#F8FAFC] border-b border-gray-200/80 text-[11px] font-semibold text-gray-500 uppercase tracking-wider select-none">
                <th className="py-2 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={allCurrentPageSelected}
                    onChange={handleHeaderSelectAll}
                    className="w-3.5 h-3.5 text-black rounded border-gray-300 focus:ring-black cursor-pointer"
                  />
                </th>
                <th className="py-2 px-3 min-w-[130px]">Date</th>
                <th className="py-2 px-3 min-w-[170px]">Rider Name</th>
                <th className="py-2 px-3 min-w-[120px]">Rider ID</th>
                <th className="py-2 px-3 min-w-[130px]">Advance (₹)</th>
                <th className="py-2 px-3 min-w-[130px]">Advance Cut (₹)</th>
                <th className="py-2 px-3 min-w-[150px]">Remaining Amount (₹)</th>
                <th className="py-2 px-3 min-w-[200px]">Remark</th>
                <th className="py-2 px-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="9" className="py-12 text-center text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-black border-t-transparent mb-2" />
                    <p>Loading advance records...</p>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan="9" className="py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">No advance records found</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Use "Import File" with Excel/CSV or click "Add Record" to record advances for riders.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const isSelected = selectedRowIds.includes(row.id);
                  const remAmt = (Number(row.advance) || 0) - (Number(row.advanceCut) || 0);

                  return (
                    <tr
                      key={row.id}
                      className={`hover:bg-gray-50/70 transition-colors ${isSelected ? 'bg-blue-50/40' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-1.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleRow(row.id)}
                          className="w-3.5 h-3.5 text-black rounded border-gray-300 focus:ring-black cursor-pointer"
                        />
                      </td>

                      {/* Date */}
                      <td className="py-1.5 px-3">
                        <input
                          type="date"
                          value={row.date?.slice(0, 10) || ''}
                          disabled={!canEdit}
                          onChange={(e) => handleCellChange(row.id, 'date', e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg px-2 py-0.5 text-xs text-gray-900 focus:outline-none transition-all cursor-pointer"
                        />
                      </td>

                      {/* Rider Name */}
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={row.riderName || ''}
                          disabled={!canEdit}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleCellChange(row.id, 'riderName', e.target.value)}
                          placeholder="Rider Name"
                          className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg px-2 py-0.5 text-xs font-semibold text-gray-900 focus:outline-none transition-all"
                        />
                      </td>

                      {/* Rider ID */}
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={row.riderId || ''}
                          disabled={!canEdit}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleCellChange(row.id, 'riderId', e.target.value)}
                          placeholder="e.g. 123456"
                          className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg px-2 py-0.5 text-xs font-mono font-medium text-gray-700 focus:outline-none transition-all"
                        />
                      </td>

                      {/* Advance Amount */}
                      <td className="py-1.5 px-3">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.advance === 0 || row.advance === '0' ? '' : (row.advance ?? '')}
                            disabled={!canEdit}
                            placeholder="0"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleCellChange(row.id, 'advance', e.target.value)}
                            className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg pl-6 pr-2 py-0.5 text-xs font-bold text-gray-900 focus:outline-none transition-all"
                          />
                        </div>
                      </td>

                      {/* Advance Cut */}
                      <td className="py-1.5 px-3">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-emerald-500 text-xs">₹</span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={row.advanceCut === 0 || row.advanceCut === '0' ? '' : (row.advanceCut ?? '')}
                            disabled={!canEdit}
                            placeholder="0"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleCellChange(row.id, 'advanceCut', e.target.value)}
                            className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg pl-6 pr-2 py-0.5 text-xs font-bold text-emerald-700 focus:outline-none transition-all"
                          />
                        </div>
                      </td>

                      {/* Remaining Amount */}
                      <td className="py-1.5 px-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-black ${
                          remAmt > 0 ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}>
                          ₹{remAmt.toLocaleString('en-IN')}
                        </span>
                      </td>

                      {/* Remarks */}
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={row.remark || ''}
                          disabled={!canEdit}
                          onFocus={(e) => e.target.select()}
                          placeholder="e.g. payout cycle cut note..."
                          onChange={(e) => handleCellChange(row.id, 'remark', e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg px-2 py-0.5 text-xs text-gray-700 focus:outline-none transition-all"
                        />
                      </td>

                      {/* Action */}
                      <td className="py-1.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (!canEdit) {
                              notifyLocked('delete advance record');
                              return;
                            }
                            setRowToDelete(row);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
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

      {/* Add New Advance Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Add Advance Record</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Record advance payment / deduction for rider
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Date
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    required
                    value={newForm.date}
                    onChange={(e) => setNewForm({ ...newForm, date: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Rider Name */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Rider Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      required
                      placeholder="e.g. Shubham Wasnik"
                      value={newForm.riderName}
                      onChange={(e) => setNewForm({ ...newForm, riderName: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all bg-white font-medium"
                    />
                  </div>
                </div>

                {/* Rider ID */}
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Rider ID
                  </label>
                  <div className="relative">
                    <Hash className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      type="text"
                      placeholder="e.g. 123456"
                      value={newForm.riderId}
                      onChange={(e) => setNewForm({ ...newForm, riderId: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all font-mono bg-white font-medium"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Advance Amount (₹)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={newForm.advance === 0 || newForm.advance === '0' ? '' : (newForm.advance ?? '')}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        let clean = e.target.value;
                        if (/^0+[0-9]+/.test(clean)) clean = clean.replace(/^0+/, '');
                        setNewForm({ ...newForm, advance: clean });
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Advance Cut (₹)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={newForm.advanceCut === 0 || newForm.advanceCut === '0' ? '' : (newForm.advanceCut ?? '')}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        let clean = e.target.value;
                        if (/^0+[0-9]+/.test(clean)) clean = clean.replace(/^0+/, '');
                        setNewForm({ ...newForm, advanceCut: clean });
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all font-bold text-emerald-600"
                    />
                  </div>
                </div>
              </div>

              {/* Remaining calculation preview */}
              <div className="p-3 bg-gray-50 rounded-xl flex items-center justify-between border border-gray-100">
                <span className="text-xs text-gray-500 font-medium">Remaining Balance Preview:</span>
                <span className="text-xs font-bold text-amber-600">
                  {formatCurrency((Number(newForm.advance) || 0) - (Number(newForm.advanceCut) || 0))}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Remark / Note
                </label>
                <div className="relative">
                  <MessageSquare className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                  <textarea
                    rows="2"
                    placeholder="e.g. payout cycle cut note..."
                    value={newForm.remark}
                    onChange={(e) => setNewForm({ ...newForm, remark: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-medium text-white bg-black hover:bg-gray-800 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Save Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(rowToDelete)}
        onClose={() => setRowToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Advance Record"
        message={`Are you sure you want to delete the advance entry for "${rowToDelete?.riderName || 'this rider'}"? This action cannot be undone.`}
        confirmLabel="Delete Record"
        variant="danger"
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Bulk Delete Advance Records"
        message={`Are you sure you want to delete ${selectedRowIds.length} selected advance records? This cannot be undone.`}
        confirmLabel={`Delete ${selectedRowIds.length} Records`}
        variant="danger"
      />

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        reportTitle="Advance Details"
        reportType="Rider Advance Ledger"
        sheetName="Advance Details"
        filename="Advance_Details.xlsx"
        metadata={[]}
        summaryCards={[
          { label: 'Total Advances', value: displayedRows.length },
          { label: 'Total Advance Amount', value: formatCurrency(totals.advance), highlight: true, color: 'emerald' },
        ]}
        headers={['Date', 'Rider Name', 'Rider ID', 'Advance', 'Advance Cut', 'Remaining Amount', 'Remark']}
        rows={displayedRows.map((r) => [
          r.date || '',
          r.riderName || '',
          r.riderId || '',
          r.advance || 0,
          r.advanceCut || 0,
          (Number(r.advance) || 0) - (Number(r.advanceCut) || 0),
          r.remark || '',
        ])}
      />
    </div>
  );
};
