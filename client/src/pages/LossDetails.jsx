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
import * as XLSX from 'xlsx';
import { CustomDropdown, ConfirmationModal, Pagination, SampleTemplateDropdown, SendEmailModal } from '../components/common';
import { useCompany } from '../context/CompanyContext';
import { useLock } from '../context/LockContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTabRefresh } from '../context/RefreshContext';
import { formatCurrency } from '../utils/calculations';
import { downloadCSV, downloadExcel, downloadSampleTemplate } from '../utils/exportUtils';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

export const LossDetails = () => {
  const { companies, selectedCompanyFilter, selectedMonthFilter, selectedFinancialYear, fetchCompanies } = useCompany();
  const { canEdit, notifyLocked } = useLock();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Tab Refresh Hook
  useTabRefresh(() => {
    fetchLossDetails();
    if (typeof fetchCompanies === 'function') fetchCompanies();
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [rowToDelete, setRowToDelete] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);

  // Close export dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered active companies
  const activeCompanies = useMemo(() => {
    return companies.filter((c) => c.status === 'Active');
  }, [companies]);

  const currentCompany = activeCompanies.find((c) => (c.id || c._id) === selectedCompanyFilter) || activeCompanies[0];

  // Fetch loss items from backend (Filtered by selected company and month)
  const fetchLossDetails = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const params = {};
      if (selectedCompanyFilter && selectedCompanyFilter !== 'all') {
        params.companyId = selectedCompanyFilter;
      }
      if (selectedMonthFilter && selectedMonthFilter !== 'all') {
        params.month = selectedMonthFilter;
      }
      if (selectedFinancialYear && selectedFinancialYear !== 'all') {
        params.financialYear = selectedFinancialYear;
      }

      const res = await apiClient.get(ENDPOINTS.LOSS_DETAILS.GET_ALL, { params });
      if (res.success && Array.isArray(res.data)) {
        const formatted = res.data.map((item) => ({
          ...item,
          id: item._id || item.id,
          riderName: item.riderName || '',
          companyId: item.companyId?._id || item.companyId?.id || item.companyId,
          companyName: item.companyId?.name || '',
          companyCode: item.companyId?.code || '',
        }));
        setRows(formatted);
      }
    } catch (error) {
      console.error('[Fetch Loss Details Error]:', error.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedCompanyFilter, selectedMonthFilter, selectedFinancialYear]);

  useEffect(() => {
    fetchLossDetails();
    setSelectedRowIds([]);
  }, [fetchLossDetails]);

  // Status pill options
  const lossStatusOptions = [
    {
      value: 'Recovered',
      label: 'Recovered',
      pillClass: 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] hover:bg-[#BBF7D0] font-bold',
    },
    {
      value: 'Not Recovered',
      label: 'Not Recovered',
      pillClass: 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] hover:bg-[#FECACA] font-bold',
    },
  ];

  // Filtered rows for search (searches trackingId, company, reason, riderName, remark, status)
  const displayedRows = useMemo(() => {
    return rows.filter((r) => {
      const compId = r.companyId?._id || r.companyId?.id || (typeof r.companyId === 'string' ? r.companyId : '');
      const compName = r.companyName || (companies.find((c) => (c.id || c._id) === compId)?.name) || '';

      const matchSearch = !searchQuery || 
        r.trackingId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        compName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.reason?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.riderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.remark?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.status?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [rows, searchQuery, companies]);

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

  // Handle cell edit
  const handleCellChange = async (rowId, field, value) => {
    if (!canEdit) {
      notifyLocked('edit loss record');
      return;
    }

    let cleanValue = value;
    if (field === 'price') {
      let str = String(value ?? '').trim();
      if (/^0+[0-9]+/.test(str)) {
        str = str.replace(/^0+/, '');
      }
      cleanValue = str;
    }

    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== rowId) return r;
        const updated = { ...r, [field]: cleanValue };
        if (field === 'companyId') {
          const comp = companies.find((c) => (c.id || c._id) === cleanValue);
          if (comp) {
            updated.companyName = comp.name;
            updated.companyCode = comp.code;
          }
        }
        return updated;
      })
    );

    try {
      await apiClient.patch(ENDPOINTS.LOSS_DETAILS.UPDATE(rowId), { [field]: cleanValue });
    } catch (error) {
      toast.error(error.message || 'Failed to update loss record');
      fetchLossDetails();
    }
  };

  // Add a new loss entry
  const handleAddRow = async () => {
    if (!canEdit) {
      notifyLocked('add loss entry');
      return;
    }

    const targetCompanyId = (selectedCompanyFilter && selectedCompanyFilter !== 'all')
      ? selectedCompanyFilter
      : (activeCompanies[0]?.id || activeCompanies[0]?._id);

    try {
      const newLossPayload = {
        companyId: targetCompanyId,
        month: selectedMonthFilter,
        financialYear: selectedFinancialYear,
        trackingId: `TRK-${Math.floor(10000000 + Math.random() * 90000000)}`,
        price: 0,
        reason: 'Parcel damage/loss',
        riderName: '',
        status: 'Not Recovered',
        remark: '',
      };

      const res = await apiClient.post(ENDPOINTS.LOSS_DETAILS.CREATE, newLossPayload);
      if (res.success && res.data) {
        const comp = companies.find((c) => (c.id || c._id) === targetCompanyId);
        const created = {
          ...res.data,
          id: res.data._id || res.data.id,
          riderName: res.data.riderName || '',
          remark: res.data.remark || '',
          companyId: res.data.companyId?._id || res.data.companyId?.id || res.data.companyId || targetCompanyId,
          companyName: res.data.companyId?.name || comp?.name || '',
          companyCode: res.data.companyId?.code || comp?.code || '',
        };
        setRows((prev) => [created, ...prev]);
        toast.success('New loss entry added.');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add loss entry');
    }
  };

  // Delete row confirmation
  const handleDeleteRow = (rowId) => {
    if (!canEdit) {
      notifyLocked('delete loss entry');
      return;
    }
    const target = rows.find((r) => r.id === rowId);
    setRowToDelete(target);
  };

  const handleConfirmDelete = async () => {
    if (!rowToDelete) return;
    try {
      const res = await apiClient.delete(ENDPOINTS.LOSS_DETAILS.DELETE(rowToDelete.id));
      if (res.success) {
        setRows((prev) => prev.filter((r) => r.id !== rowToDelete.id));
        setSelectedRowIds((prev) => prev.filter((id) => id !== rowToDelete.id));
        toast.success(`Loss entry "${rowToDelete.trackingId}" deleted.`);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete record');
    } finally {
      setRowToDelete(null);
    }
  };

  // Bulk Delete
  const handleTriggerBulkDelete = () => {
    if (!canEdit) {
      notifyLocked('delete selected loss records');
      return;
    }
    if (selectedRowIds.length === 0) return;
    setIsBulkDeleteModalOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    try {
      const res = await apiClient.post(ENDPOINTS.LOSS_DETAILS.BULK_DELETE, { ids: selectedRowIds });
      if (res.success) {
        setRows((prev) => prev.filter((r) => !selectedRowIds.includes(r.id)));
        toast.success(`Deleted ${selectedRowIds.length} loss records.`);
        setSelectedRowIds([]);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete selected records');
    } finally {
      setIsBulkDeleteModalOpen(false);
    }
  };

  const lossHeaders = ['Tracking ID', 'Company', 'Price', 'Reason', 'Rider Name', 'Status', 'Remark'];

  const getExportData = () => {
    return displayedRows.map((r) => {
      const compId = r.companyId?._id || r.companyId?.id || (typeof r.companyId === 'string' ? r.companyId : '');
      const comp = companies.find((c) => (c.id || c._id) === compId);
      const compName = r.companyName || comp?.name || (currentCompany?.name || 'Company');

      return [
        r.trackingId || '',
        compName,
        r.price || 0,
        r.reason || '',
        r.riderName || '',
        r.status || 'Not Recovered',
        r.remark || '',
      ];
    });
  };

  // Export CSV File
  const handleExportCSV = () => {
    setIsExportMenuOpen(false);
    if (displayedRows.length === 0) {
      toast.error('No loss records to export.');
      return;
    }
    const compName = selectedCompanyFilter === 'all' ? 'All_Companies' : (currentCompany?.name || 'Company').replace(/\s+/g, '_');
    const filename = `Loss_Details_${selectedMonthFilter}_${selectedFinancialYear || 'FY'}_${compName}`;
    downloadCSV(lossHeaders, getExportData(), filename);
    toast.success(`Exported ${displayedRows.length} loss records to CSV!`);
  };

  // Export Excel File
  const handleExportExcel = () => {
    setIsExportMenuOpen(false);
    if (displayedRows.length === 0) {
      toast.error('No loss records to export.');
      return;
    }
    const compName = selectedCompanyFilter === 'all' ? 'All_Companies' : (currentCompany?.name || 'Company').replace(/\s+/g, '_');
    const filename = `Loss_Details_${selectedMonthFilter}_${selectedFinancialYear || 'FY'}_${compName}`;
    downloadExcel(lossHeaders, getExportData(), filename);
    toast.success(`Exported ${displayedRows.length} loss records to Excel (.xlsx)!`);
  };

  // Download Sample Template (Headers ONLY, 0 data rows, company-specific)
  const handleDownloadTemplate = (format = 'xlsx', targetCompany = null) => {
    const comp = targetCompany || currentCompany;
    const compName = (comp?.name || 'Company').trim().replace(/\s+/g, '_');
    const filename = `Loss_Details_Template_${compName}_${selectedMonthFilter}`;
    if (format === 'xlsx') {
      downloadExcel(lossHeaders, [], filename);
    } else {
      downloadCSV(lossHeaders, [], filename);
    }
    toast.success(`Downloaded ${compName} loss details template (${format.toUpperCase()})`);
  };

  // Import Excel/CSV File
  const handleFileUpload = (e) => {
    if (!canEdit) {
      notifyLocked('upload loss data');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = event.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

        if (!rawJson || rawJson.length < 2) {
          toast.error('The uploaded file contains no data rows.');
          return;
        }

        const targetCompanyId = (selectedCompanyFilter && selectedCompanyFilter !== 'all')
          ? selectedCompanyFilter
          : (activeCompanies[0]?.id || activeCompanies[0]?._id);

        const headerRow = (rawJson[0] || []).map((h) => String(h).toLowerCase().trim());
        const findColIdx = (possibleNames) => {
          return headerRow.findIndex((h) => possibleNames.some((n) => h.includes(n)));
        };

        const compIdx = findColIdx(['company', 'company name', 'client', 'courier']);
        const trkIdx = findColIdx(['tracking', 'tracking id', 'track']);
        const priceIdx = findColIdx(['price', 'amount', 'cost']);
        const reasonIdx = findColIdx(['reason', 'cause', 'description']);
        const riderIdx = findColIdx(['rider name', 'rider', 'driver']);
        const statusIdx = findColIdx(['status']);
        const remarkIdx = findColIdx(['remark', 'remarks', 'note', 'notes']);

        const importedRows = [];
        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || row.every((c) => String(c).trim() === '')) continue;

          let rowCompId = targetCompanyId;
          if (compIdx >= 0 && row[compIdx]) {
            const rawCompName = String(row[compIdx]).trim().toLowerCase();
            const matched = companies.find(
              (c) => c.name?.trim().toLowerCase() === rawCompName || c.code?.trim().toLowerCase() === rawCompName
            );
            if (matched) rowCompId = matched.id || matched._id;
          }

          const trackingId = trkIdx >= 0 && row[trkIdx] ? String(row[trkIdx]).trim() : `TRK-${100000 + i}`;
          const price = priceIdx >= 0 ? Number(row[priceIdx]) || 0 : Number(row[2]) || 0;
          const reason = reasonIdx >= 0 && row[reasonIdx] ? String(row[reasonIdx]).trim() : 'Parcel damage/loss';
          const riderName = riderIdx >= 0 && row[riderIdx] ? String(row[riderIdx]).trim() : '';
          const statusRaw = statusIdx >= 0 ? String(row[statusIdx] || '').trim().toLowerCase() : 'not recovered';
          const status = (statusRaw === 'recovered' || statusRaw === 'recover') ? 'Recovered' : 'Not Recovered';
          const remark = remarkIdx >= 0 && row[remarkIdx] ? String(row[remarkIdx]).trim() : '';

          importedRows.push({
            companyId: rowCompId,
            trackingId,
            price,
            reason,
            riderName,
            status,
            remark,
          });
        }

        if (importedRows.length > 0) {
          const res = await apiClient.post(ENDPOINTS.LOSS_DETAILS.BULK_IMPORT, {
            companyId: targetCompanyId,
            month: selectedMonthFilter,
            rows: importedRows,
          });

          if (res.success) {
            toast.success(`Successfully imported ${importedRows.length} loss records to database!`);
            fetchLossDetails();
          }
        } else {
          toast.error('No valid loss records parsed. Please check template format.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse file. Please upload a valid Excel or CSV file.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  // Footer totals
  const totalLossPrice = useMemo(() => {
    return displayedRows.reduce((sum, r) => sum + (Number(r.price) || 0), 0);
  }, [displayedRows]);

  const recoveredCount = useMemo(() => {
    return displayedRows.filter((r) => r.status === 'Recovered').length;
  }, [displayedRows]);

  const notRecoveredCount = useMemo(() => {
    return displayedRows.filter((r) => r.status === 'Not Recovered').length;
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
            placeholder="Search tracking ID, reason, rider name, status..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 font-medium text-gray-900"
          />
        </div>

        {/* Soft Pastel Action Buttons */}
        <div className="flex items-center flex-wrap gap-1.5">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            className="hidden"
          />

          <SampleTemplateDropdown
            currentCompany={currentCompany}
            companies={companies}
            onDownload={handleDownloadTemplate}
            label="Sample Template"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 bg-[#EEF2FF] text-[#4F46E5] border border-[#C7D2FE] hover:bg-[#E0E7FF] shadow-2xs cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-[#4F46E5]" />
            <span>Upload Excel / CSV</span>
          </button>

          {/* Export Dropdown */}
          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setIsExportMenuOpen((prev) => !prev)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all duration-200 bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] hover:bg-[#D1FAE5] shadow-2xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-[#059669]" />
              <span>Export</span>
              <ChevronDown className="w-3 h-3 text-[#059669]" />
            </button>

            {isExportMenuOpen && (
              <div className="absolute right-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-30 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Export to Excel (.xlsx)</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="w-full text-left px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  <span>Export to CSV (.csv)</span>
                </button>
              </div>
            )}
          </div>

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
            <span>Add Loss Entry</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white border border-gray-200/80 shadow-xs rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Bulk action bar */}
        {selectedRowIds.length > 0 && (
          <div className="bg-[#FFF1F2] border-b border-[#FECDD3] px-3.5 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0 transition-all">
            <div className="flex items-center gap-2 text-[#9F1239] font-bold">
              <span>{selectedRowIds.length} loss record{selectedRowIds.length > 1 ? 's' : ''} selected</span>
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
                onClick={handleTriggerBulkDelete}
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
                    className="w-3.5 h-3.5 rounded border-gray-300 text-[#E53935] focus:ring-red-400 cursor-pointer accent-[#E53935]"
                    title="Select All on this page"
                  />
                </th>
                <th className="py-1.5 px-2 text-center text-gray-500 font-semibold w-10 whitespace-nowrap">#</th>
                <th className="py-1.5 px-3 whitespace-nowrap">Tracking ID</th>
                {/* <th className="py-1.5 px-3 whitespace-nowrap">Company</th> */}
                <th className="py-1.5 px-3 text-right whitespace-nowrap">Price</th>
                <th className="py-1.5 px-3 whitespace-nowrap">Reason</th>
                <th className="py-1.5 px-3 whitespace-nowrap">Rider Name</th>
                <th className="py-1.5 px-2 text-center whitespace-nowrap">Status</th>
                <th className="py-1.5 px-3 whitespace-nowrap">Remark</th>
                <th className="py-1.5 px-2 text-center text-gray-500 font-semibold w-10 whitespace-nowrap">Action</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-gray-100">
              {paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-500">
                    <div className="w-8 h-8 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-1.5">
                      <Inbox className="w-4 h-4" />
                    </div>
                    <p className="font-semibold text-gray-800 text-xs">No loss records found</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      Click "+ Add Loss Entry" or upload a file to record lost shipments.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row, index) => {
                  const isRecovered = row.status === 'Recovered';
                  const isSelected = selectedRowIds.includes(row.id);
                  const actualIndex = (safePage - 1) * pageSize + index + 1;
                  const rowCompId = row.companyId?._id || row.companyId?.id || (typeof row.companyId === 'string' ? row.companyId : '');
                  const currentCompObj = companies.find((c) => (c.id || c._id) === rowCompId);
                  const rowCompName = row.companyName || currentCompObj?.name || 'SHADOWFAX';

                  return (
                    <tr
                      key={row.id || index}
                      className={`h-11 hover:bg-gray-50/80 transition-colors ${
                        isSelected ? 'bg-rose-50/40' : isRecovered ? 'bg-emerald-50/10' : 'bg-white'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2 px-2 text-center whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {
                            setSelectedRowIds((prev) =>
                              prev.includes(row.id) ? prev.filter((id) => id !== row.id) : [...prev, row.id]
                            );
                          }}
                          disabled={!canEdit}
                          className="w-3.5 h-3.5 rounded border-gray-300 text-[#E53935] focus:ring-red-400 cursor-pointer accent-[#E53935]"
                        />
                      </td>

                      {/* Row Index */}
                      <td className="py-2 px-2 text-center text-gray-400 font-mono text-xs whitespace-nowrap">
                        {actualIndex}
                      </td>

                      {/* Col 1: Tracking ID (Editable) */}
                      <td className="py-1 px-2.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={row.trackingId || ''}
                          disabled={!canEdit}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleCellChange(row.id, 'trackingId', e.target.value)}
                          className="w-full px-2 py-1 text-xs font-mono font-bold text-gray-900 rounded-md bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-100 outline-none transition-all"
                          placeholder="TRK-00000000"
                        />
                      </td>

                      {/* Col 2: Company (Select in Edit Mode / Pill in View Mode) */}
                      {/* <td className="py-1 px-2.5 whitespace-nowrap">
                        {canEdit ? (
                          <select
                            value={rowCompId}
                            onChange={(e) => handleCellChange(row.id, 'companyId', e.target.value)}
                            className="px-2 py-1 text-xs font-bold text-gray-800 bg-white border border-gray-200 rounded-md hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 cursor-pointer shadow-2xs"
                          >
                            {(activeCompanies.length > 0 ? activeCompanies : companies).map((c) => (
                              <option key={c.id || c._id} value={c.id || c._id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold border ${
                              rowCompName.toUpperCase().includes('SHADOW')
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : rowCompName.toUpperCase().includes('VALMO')
                                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                : rowCompName.toUpperCase().includes('XPRESS')
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {rowCompName}
                          </span>
                        )}
                      </td> */}

                      {/* Col 3: Price (Editable) */}
                      <td className="py-1 px-2.5 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-gray-400 font-medium">₹</span>
                          <input
                            type="number"
                            value={row.price === 0 || row.price === '0' ? '' : (row.price ?? '')}
                            disabled={!canEdit}
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleCellChange(row.id, 'price', e.target.value)}
                            className="w-20 px-2 py-1 text-xs text-right font-bold text-rose-700 rounded-md bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-rose-500 focus:ring-1 focus:ring-rose-100 outline-none transition-all"
                            placeholder="0"
                          />
                        </div>
                      </td>

                      {/* Col 4: Reason (Editable) */}
                      <td className="py-1 px-2.5">
                        <input
                          type="text"
                          value={row.reason || ''}
                          disabled={!canEdit}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleCellChange(row.id, 'reason', e.target.value)}
                          className="w-full px-2 py-1 text-xs font-medium text-gray-900 rounded-md bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-100 outline-none transition-all"
                          placeholder="Reason for loss / damage..."
                        />
                      </td>

                      {/* Col 5: Rider Name (Editable - added after Reason) */}
                      <td className="py-1 px-2.5 whitespace-nowrap">
                        <input
                          type="text"
                          value={row.riderName || ''}
                          disabled={!canEdit}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleCellChange(row.id, 'riderName', e.target.value)}
                          className="w-full px-2 py-1 text-xs font-semibold text-gray-800 rounded-md bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-100 outline-none transition-all"
                          placeholder="Assigned rider name..."
                        />
                      </td>

                      {/* Col 6: Status (Custom Dropdown) */}
                      <td className="py-1.5 px-2 text-center whitespace-nowrap">
                        <CustomDropdown
                          value={row.status || 'Not Recovered'}
                          onChange={(val) => handleCellChange(row.id, 'status', val)}
                          options={lossStatusOptions}
                          disabled={!canEdit}
                          size="pill"
                          minWidth="120px"
                          align="center"
                        />
                      </td>

                      {/* Col 7: Remark (Editable) */}
                      <td className="py-1 px-2.5">
                        <input
                          type="text"
                          value={row.remark || ''}
                          disabled={!canEdit}
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleCellChange(row.id, 'remark', e.target.value)}
                          className="w-full min-w-[140px] px-2 py-1 text-xs font-medium text-gray-900 rounded-md bg-transparent hover:bg-gray-50 focus:bg-white border border-transparent focus:border-primary-500 focus:ring-1 focus:ring-primary-100 outline-none transition-all"
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
                          title="Delete entry"
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
                  <td colSpan={10} className="p-0 border-none bg-transparent"></td>
                </tr>
              )}
            </tbody>

            {/* Footer Summary Row */}
            {displayedRows.length > 0 && (
              <tfoot className="sticky bottom-0 z-10 bg-[#F8FAFC]">
                <tr className="bg-[#F8FAFC] font-bold text-gray-900 border-t border-gray-200 select-none">
                  <td className="py-1.5 px-2"></td>
                  <td className="py-1.5 px-2 text-center text-xs font-semibold text-gray-500 whitespace-nowrap">
                    SUM
                  </td>
                  <td className="py-1.5 px-3 whitespace-nowrap">
                    Total ({displayedRows.length} Loss Items)
                  </td>
                  <td className="py-1.5 px-3 whitespace-nowrap text-gray-500 text-xs font-semibold">
                    {selectedCompanyFilter === 'all' ? 'All Companies' : (currentCompany?.name || 'Company')}
                  </td>
                  <td className="py-1.5 px-3 text-right whitespace-nowrap text-rose-700 font-extrabold text-xs">
                    {formatCurrency(totalLossPrice)}
                  </td>
                  <td className="py-1.5 px-3 text-gray-500 text-xs whitespace-nowrap">
                    {recoveredCount} Recovered / {notRecoveredCount} Pending
                  </td>
                  <td className="py-1.5 px-3 text-gray-500 text-xs whitespace-nowrap">-</td>
                  <td className="py-1.5 px-2 text-center whitespace-nowrap font-bold text-emerald-800">
                    {recoveredCount} Recovered
                  </td>
                  <td className="py-1.5 px-3"></td>
                  <td className="py-1.5 px-2"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Built-in Common Pagination */}
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!rowToDelete}
        onClose={() => setRowToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Loss Record"
        message={`Are you sure you want to delete shipment "${rowToDelete?.trackingId || 'this entry'}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete"
        variant="danger"
      />

      {/* Bulk Delete Modal */}
      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Bulk Delete Loss Records"
        message={`Are you sure you want to delete ${selectedRowIds.length} selected loss records? This action cannot be undone.`}
        confirmLabel={`Yes, Delete ${selectedRowIds.length} Records`}
        variant="danger"
      />

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        reportTitle="Loss Details"
        reportType="Shipment Loss Ledger"
        sheetName="Loss Details"
        filename={`Loss_Details_${selectedMonthFilter}_${selectedFinancialYear || 'FY'}_${(selectedCompanyFilter === 'all' ? 'All_Companies' : (currentCompany?.name || 'Company')).replace(/\s+/g, '_')}.xlsx`}
        metadata={[
          {
            label: 'Company',
            value: selectedCompanyFilter === 'all' ? 'All Companies' : currentCompany?.name || 'Company',
          },
          { label: 'Period', value: `${selectedMonthFilter} (${selectedFinancialYear || 'FY'})` },
        ]}
        summaryCards={[
          { label: 'Total Shipments', value: displayedRows.length },
          { label: 'Total Loss Amount', value: formatCurrency(totalLossPrice), highlight: true, color: 'emerald' },
        ]}
        headers={lossHeaders}
        rows={getExportData()}
      />
    </div>
  );
};
