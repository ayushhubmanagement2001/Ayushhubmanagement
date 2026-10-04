import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Download,
  Upload,
  FileText,
  Search,
  Receipt,
  FileCheck2,
  Calendar,
  ChevronDown,
  FileSpreadsheet,
  Mail,
  Trash2,
  Building2,
  ArrowRight,
  Clock,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { CustomDropdown, Modal, Pagination, SampleTemplateDropdown, SendEmailModal, ConfirmationModal } from '../components/common';
import { getCycleOptions, getCycleColor } from './PaymentPayout';
import { useCompany } from '../context/CompanyContext';
import { useLock } from '../context/LockContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTabRefresh } from '../context/RefreshContext';
import { formatCurrency } from '../utils/calculations';
import { downloadExcel, downloadCSV } from '../utils/exportUtils';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

// Cycle matching helper
const isCycleMatch = (recordCycle, filterCycle) => {
  if (!filterCycle || filterCycle === 'all') return true;
  if (!recordCycle) return false;
  const rc = recordCycle.toLowerCase().trim();
  const fc = filterCycle.toLowerCase().trim();
  if (rc === fc) return true;
  if ((fc.includes('cycle 1') || fc.includes('1st')) && (rc.includes('cycle 1') || rc.includes('1st'))) return true;
  if ((fc.includes('cycle 2') || fc.includes('16th')) && (rc.includes('cycle 2') || rc.includes('16th'))) return true;
  if (fc.includes('week 1') && rc.includes('week 1')) return true;
  if (fc.includes('week 2') && rc.includes('week 2')) return true;
  if (fc.includes('week 3') && rc.includes('week 3')) return true;
  if (fc.includes('week 4') && rc.includes('week 4')) return true;
  return false;
};

export const Payments = () => {
  const {
    companies,
    selectedCompanyFilter,
    selectedMonthFilter,
    selectedFinancialYear,
    selectedCycleFilter,
    setSelectedCycleFilter,
    fetchCompanies,
  } = useCompany();
  const { canEdit, notifyLocked } = useLock();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Tab Refresh Hook
  useTabRefresh(() => {
    fetchPayments();
    if (typeof fetchCompanies === 'function') fetchCompanies();
  });

  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('ALL');
  const [receiptModalPayment, setReceiptModalPayment] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);

  const navigate = useNavigate();

  // Active companies & current company definition
  const activeCompanies = useMemo(() => {
    return (companies || []).filter((c) => c.status === 'Active');
  }, [companies]);

  const currentCompany = useMemo(() => {
    return activeCompanies.find((c) => (c.id || c._id) === selectedCompanyFilter) || activeCompanies[0] || (companies || [])[0];
  }, [activeCompanies, selectedCompanyFilter, companies]);

  const isCQA = useMemo(() => {
    if (!currentCompany) return false;
    return (
      (currentCompany.name || '').toLowerCase().includes('cqa') ||
      currentCompany.sheetType === 'cqa' ||
      currentCompany.hasTransactionLedger === false
    );
  }, [currentCompany]);

  const isValmo = useMemo(() => {
    if (!currentCompany) return false;
    return (
      (currentCompany.name || '').toLowerCase().includes('valmo') ||
      currentCompany.sheetType === 'valmo'
    );
  }, [currentCompany]);

  // Close export menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setIsExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch payments from backend
  const fetchPayments = useCallback(async () => {
    if (!isAuthenticated) return;
    if (isCQA) {
      setPayments([]);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const params = {};
      if (selectedCompanyFilter !== 'all') params.companyId = selectedCompanyFilter;
      if (selectedMonthFilter !== 'all') params.month = selectedMonthFilter;
      if (selectedFinancialYear && selectedFinancialYear !== 'all') params.financialYear = selectedFinancialYear;
      if (selectedCycleFilter && selectedCycleFilter !== 'all') params.cycle = selectedCycleFilter;
      if (selectedStatus !== 'ALL') params.status = selectedStatus;

      const res = await apiClient.get(ENDPOINTS.PAYMENTS.GET_ALL, { params });
      if (res.success && Array.isArray(res.data)) {
        const formatted = res.data.map((p) => ({
          ...p,
          id: p._id || p.id,
          cycle: p.cycle || 'Cycle 1 (1st - 15th)',
        }));
        setPayments(formatted);
      }
    } catch (error) {
      console.error('[Fetch Payments Error]:', error.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedCompanyFilter, selectedMonthFilter, selectedFinancialYear, selectedCycleFilter, selectedStatus, isCQA]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  // Filtered payments for search and cycle
  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      const matchSearch = !searchQuery ||
        p.riderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.riderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.transactionId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.cycle?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.remark?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchCycle = !selectedCycleFilter || selectedCycleFilter === 'all' || isCycleMatch(p.cycle, selectedCycleFilter);

      return matchSearch && matchCycle;
    });
  }, [payments, searchQuery, selectedCycleFilter]);

  // Summary metrics calculation
  const summaryMetrics = useMemo(() => {
    return filteredPayments.reduce(
      (acc, p) => {
        const payout = Number(p.payout) || 0;
        const finalPayout = Number(p.finalPayout) || 0;
        acc.totalGross += payout;
        acc.totalPaidOut += finalPayout;
        return acc;
      },
      { totalGross: 0, totalPaidOut: 0 }
    );
  }, [filteredPayments]);

  // Pagination calculation
  const totalItems = filteredPayments.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(currentPage, totalPages);

  const paginatedPayments = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredPayments.slice(start, start + pageSize);
  }, [filteredPayments, safePage, pageSize]);

  // Check if all rows on current page are selected
  const allCurrentPageSelected = useMemo(() => {
    if (paginatedPayments.length === 0) return false;
    return paginatedPayments.every((p) => selectedRowIds.includes(p.id));
  }, [paginatedPayments, selectedRowIds]);

  const handleHeaderSelectAll = () => {
    const pageIds = paginatedPayments.map((p) => p.id);
    if (allCurrentPageSelected) {
      setSelectedRowIds((prev) => prev.filter((id) => !pageIds.includes(id)));
    } else {
      setSelectedRowIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const handleToggleRowSelect = (id) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleDeleteSingle = async () => {
    if (!paymentToDelete) return;
    try {
      await apiClient.delete(ENDPOINTS.PAYMENTS.DELETE(paymentToDelete.id));
      setPayments((prev) => prev.filter((p) => p.id !== paymentToDelete.id));
      setSelectedRowIds((prev) => prev.filter((id) => id !== paymentToDelete.id));
      toast.success('Payment record deleted successfully.');
    } catch (error) {
      toast.error(error.message || 'Failed to delete payment');
    } finally {
      setPaymentToDelete(null);
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    try {
      const res = await apiClient.post(ENDPOINTS.PAYMENTS.BULK_DELETE, { ids: selectedRowIds });
      if (res.success) {
        setPayments((prev) => prev.filter((p) => !selectedRowIds.includes(p.id)));
        toast.success(`Deleted ${selectedRowIds.length} payment records.`);
        setSelectedRowIds([]);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete payment records');
    } finally {
      setIsBulkDeleteModalOpen(false);
    }
  };

  // Download Clean Sample Template (0 dummy data rows, company-specific)
  const handleDownloadTemplate = (format = 'xlsx', targetCompany = null) => {
    const comp = targetCompany || currentCompany;
    const compName = (comp?.name || 'Company').trim().replace(/\s+/g, '_');
    const headers = [
      'Transaction ID',
      'Rider Name',
      'Rider ID',
      'Company',
      'Month',
      'Gross Payout',
      'Loss Deduction',
      'Advance Deduction',
      'Final Payout',
      'Payment Status',
      'Payment Date',
      'Ayush Remark',
    ];
    const filename = `Payment_Ledger_Template_${compName}_${selectedMonthFilter}_${selectedFinancialYear || 'FY'}`;
    if (format === 'xlsx') {
      downloadExcel(headers, [], filename);
    } else {
      downloadCSV(headers, [], filename);
    }
    toast.success(`Downloaded ${compName} payment ledger template (${format.toUpperCase()})`);
  };

  // Export Payments Excel (.xlsx)
  const handleExportExcel = () => {
    setIsExportMenuOpen(false);
    if (filteredPayments.length === 0) {
      toast.error('No payment records to export.');
      return;
    }

    const headers = [
      'Transaction ID',
      'Rider Name',
      'Rider ID',
      'Company',
      'Cycle',
      'Month',
      'Gross Payout',
      'Loss Deduction',
      'Advance Deduction',
      'Final Payout',
      'Payment Status',
      'Payment Date',
      'Ayush Remark',
    ];

    const rows = filteredPayments.map((p) => {
      const compName = companies.find((c) => c.id === p.companyId || c._id === p.companyId)?.name || p.companyName || 'Company';
      return [
        p.transactionId || '-',
        p.riderName || '',
        p.riderId || '',
        compName,
        p.cycle || 'Cycle 1 (1st - 15th)',
        p.month || selectedMonthFilter,
        Number(p.payout) || 0,
        Number(p.loss) || 0,
        Number(p.advance) || 0,
        Number(p.finalPayout) || 0,
        p.paymentStatus || 'Pending',
        p.paymentDate || '-',
        p.remark || '',
      ];
    });

    const filename = `Payment_Disbursements_${selectedMonthFilter}_${selectedFinancialYear || 'FY'}`;
    downloadExcel(headers, rows, filename);
    toast.success(`Exported ${filteredPayments.length} payment records to Excel (.xlsx)!`);
  };

  // Export Payments CSV
  const handleExportCSV = () => {
    setIsExportMenuOpen(false);
    if (filteredPayments.length === 0) {
      toast.error('No payment records to export.');
      return;
    }

    const headers = [
      'Transaction ID',
      'Rider Name',
      'Rider ID',
      'Company',
      'Cycle',
      'Month',
      'Gross Payout',
      'Loss Deduction',
      'Advance Deduction',
      'Final Payout',
      'Payment Status',
      'Payment Date',
      'Ayush Remark',
    ];

    const rows = filteredPayments.map((p) => {
      const compName = companies.find((c) => c.id === p.companyId || c._id === p.companyId)?.name || p.companyName || 'Company';
      return [
        p.transactionId || '-',
        p.riderName || '',
        p.riderId || '',
        compName,
        p.cycle || 'Cycle 1 (1st - 15th)',
        p.month || selectedMonthFilter,
        Number(p.payout) || 0,
        Number(p.loss) || 0,
        Number(p.advance) || 0,
        Number(p.finalPayout) || 0,
        p.paymentStatus || 'Pending',
        p.paymentDate || '-',
        p.remark || '',
      ];
    });

    const filename = `Payment_Disbursements_${selectedMonthFilter}_${selectedFinancialYear || 'FY'}`;
    downloadCSV(headers, rows, filename);
    toast.success(`Exported ${filteredPayments.length} payment records to CSV (.csv)!`);
  };

  // Upload Excel / CSV Payment Ledger
  const handleFileUpload = (e) => {
    if (!canEdit) {
      notifyLocked('upload payment ledger data');
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

        const headerRow = (rawJson[0] || []).map((h) => String(h || '').toLowerCase().trim());
        const findColIdx = (aliases) => {
          for (const alias of aliases) {
            const idx = headerRow.findIndex((h) => h === alias);
            if (idx !== -1) return idx;
          }
          for (const alias of aliases) {
            const pattern = new RegExp(`(^|[^a-z0-9])${alias.replace(/[/\\^$*+?.()|[\]{}]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
            const idx = headerRow.findIndex((h) => pattern.test(h));
            if (idx !== -1) return idx;
          }
          for (const alias of aliases) {
            if (alias.length >= 4) {
              const idx = headerRow.findIndex((h) => h.includes(alias));
              if (idx !== -1) return idx;
            }
          }
          return -1;
        };

        const txnIdx = findColIdx(['transaction', 'txn', 'transaction id']);
        const riderNameIdx = findColIdx(['rider name', 'rider_name', 'name', 'rider']);
        const riderIdIdx = findColIdx(['rider id', 'rider_id', 'id', 'emp id', 'employee id', 'code']);
        const cycleIdx = findColIdx(['cycle', 'payout cycle', 'week', 'payment cycle', 'cycle / week']);
        const payoutIdx = findColIdx(['gross', 'payout', 'gross payout']);
        const lossIdx = findColIdx(['loss', 'loss deduction']);
        const advanceIdx = findColIdx(['advance', 'advance deduction']);
        const statusIdx = findColIdx(['status', 'payment status']);
        const remarkIdx = findColIdx(['remark', 'ayush remark']);

        const targetCompanyId = selectedCompanyFilter === 'all'
          ? (companies[0]?.id || companies[0]?._id)
          : selectedCompanyFilter;

        const availCycles = getCycleOptions(currentCompany?.name);
        const defaultCycle = selectedCycleFilter && selectedCycleFilter !== 'all'
          ? selectedCycleFilter
          : (availCycles[0]?.value || 'Cycle 1 (1st - 15th)');

        let successCount = 0;

        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || row.every((c) => String(c).trim() === '')) continue;

          const rName = riderNameIdx >= 0 ? String(row[riderNameIdx] || '').trim() : '';
          const rId = riderIdIdx >= 0 ? String(row[riderIdIdx] || '').trim() : '';
          const cVal = cycleIdx >= 0 && row[cycleIdx] ? String(row[cycleIdx]).trim() : defaultCycle;
          const p = payoutIdx >= 0 ? Number(row[payoutIdx]) || 0 : 0;
          const l = lossIdx >= 0 ? Number(row[lossIdx]) || 0 : 0;
          const a = advanceIdx >= 0 ? Number(row[advanceIdx]) || 0 : 0;
          const rawStatus = statusIdx >= 0 ? String(row[statusIdx] || '').trim().toUpperCase() : 'PENDING';
          const validStat = ['PAID', 'HOLD', 'PENDING'].includes(rawStatus) ? rawStatus : 'PENDING';
          const remark = remarkIdx >= 0 ? String(row[remarkIdx] || '').trim() : 'Uploaded via Excel';

          if (rName || rId || p > 0) {
            successCount++;
          }
        }

        if (successCount > 0) {
          toast.success(`Processed ${successCount} payment ledger rows successfully!`);
          fetchPayments();
        } else {
          toast.error('No valid payment rows found in the uploaded file.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse Excel/CSV file. Please ensure correct format.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleStatusChange = async (id, newStatus) => {
    if (!canEdit) {
      notifyLocked('change payment status');
      return;
    }

    setPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, paymentStatus: newStatus } : p))
    );

    try {
      await apiClient.patch(ENDPOINTS.PAYMENTS.UPDATE_STATUS(id), { status: newStatus });
      toast.success(`Payment status updated to ${newStatus}`);
    } catch (error) {
      toast.error(error.message || 'Failed to update payment status');
      fetchPayments();
    }
  };

  const statusFilterOptions = [
    { value: 'ALL', label: 'All Statuses', color: '#9CA3AF' },
    { value: 'PAID', label: 'Paid Only', color: '#166534' },
    { value: 'PENDING', label: 'Pending Only', color: '#92400E' },
    { value: 'HOLD', label: 'Hold Only', color: '#991B1B' },
  ];

  const rowStatusOptions = [
    { value: 'Paid', label: 'PAID', pillClass: 'bg-[#DCFCE7] text-[#166534] border border-[#86EFAC] hover:bg-[#BBF7D0] font-bold' },
    { value: 'Pending', label: 'PENDING', pillClass: 'bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] hover:bg-[#FDE68A] font-bold' },
    { value: 'Hold', label: 'HOLD', pillClass: 'bg-[#FEE2E2] text-[#991B1B] border border-[#FCA5A5] hover:bg-[#FECACA] font-bold' },
  ];

  // Footer summary totals
  const totalGrossPayout = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (Number(p.payout) || 0), 0);
  }, [filteredPayments]);

  const totalDeductions = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (Number(p.loss) || 0) + (Number(p.advance) || 0), 0);
  }, [filteredPayments]);

  const totalFinalDisbursed = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (Number(p.finalPayout) || 0), 0);
  }, [filteredPayments]);

  const paidCount = useMemo(() => {
    return filteredPayments.filter((p) => (p.paymentStatus || '').toUpperCase() === 'PAID').length;
  }, [filteredPayments]);

  const pendingCount = useMemo(() => {
    return filteredPayments.filter((p) => (p.paymentStatus || '').toUpperCase() !== 'PAID').length;
  }, [filteredPayments]);

  return (
    <div className="h-full w-full flex flex-col min-h-0 gap-2">
      {/* Hidden File Input for Excel/CSV Import */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
        className="hidden"
      />

      {/* Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-white p-2 rounded-xl border border-gray-200/80 shadow-xs shrink-0">
        {/* Search, Cycle & Status Filter */}
        <div className="flex items-center gap-2 flex-1 max-w-xl">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search rider name, ID, TXN..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-8 pr-3 py-1 text-xs bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-100 focus:border-primary-500 font-medium text-gray-900"
            />
          </div>

          {/* Quick In-Page Cycle Filter Dropdown (Shadowfax & XpressBees only) */}
          {!isValmo && (
            <div className="shrink-0 flex items-center gap-1">
              <CustomDropdown
                value={selectedCycleFilter || 'all'}
                onChange={(val) => {
                  setSelectedCycleFilter(val);
                  setCurrentPage(1);
                }}
                options={[
                  {
                    value: 'all',
                    label: 'All Cycles',
                    icon: Clock,
                  },
                  ...getCycleOptions(currentCompany?.name).map((opt) => ({ ...opt, icon: Clock })),
                ]}
                icon={Clock}
                size="sm"
                minWidth="140px"
              />
            </div>
          )}

          <CustomDropdown
            value={selectedStatus}
            onChange={(val) => {
              setSelectedStatus(val);
              setCurrentPage(1);
            }}
            options={statusFilterOptions}
            size="sm"
            minWidth="120px"
          />
        </div>

        {/* Action Buttons: Sample Template Dropdown, Upload File, Export Dropdown */}
        <div className="flex items-center flex-wrap gap-1.5">
          {/* Sample Template Dropdown */}
          <SampleTemplateDropdown
            currentCompany={currentCompany}
            companies={companies}
            onDownload={handleDownloadTemplate}
            label="Sample Template"
          />

          {/* Upload Excel / CSV Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Upload Excel or CSV file"
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
        </div>
      </div>

      {/* Payments Ledger Table Container */}
      <div className="bg-white border border-gray-200/80 shadow-xs rounded-xl flex flex-col flex-1 min-h-0 overflow-hidden">
        {/* Bulk Action Bar */}
        {selectedRowIds.length > 0 && (
          <div className="bg-[#FFF1F2] border-b border-[#FECDD3] px-3.5 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0 transition-all">
            <div className="flex items-center gap-2 text-[#9F1239] font-bold">
              <span>{selectedRowIds.length} payment record{selectedRowIds.length > 1 ? 's' : ''} selected</span>
              {selectedRowIds.length < totalItems && (
                <button
                  type="button"
                  onClick={() => setSelectedRowIds(filteredPayments.map((p) => p.id))}
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

        {isCQA ? (
          <div className="flex-1 bg-white p-8 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3 ring-8 ring-purple-50/50">
              <Receipt className="w-8 h-8" />
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 mb-2">
              Franchise Payment Model Only
            </span>
            <h3 className="text-base font-bold text-gray-900 mb-1.5">Transaction Ledger Not Applicable for CQA</h3>
            <p className="text-xs text-gray-500 max-w-md leading-relaxed mb-5">
              CQA does not disburse rider payouts. All transactions for CQA are logged as incoming settlements under Franchise Payments.
            </p>
            <button
              type="button"
              onClick={() => navigate('/franchise-payments')}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#E53935] text-white hover:bg-red-700 transition-all shadow-xs cursor-pointer"
            >
              <span>Go to Franchise Payments</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-[#F8FAFC]">
                  <tr className="bg-[#F8FAFC] text-gray-900 font-bold border-b border-gray-200 select-none">
                    <th className="py-2 px-2 text-center w-8 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={allCurrentPageSelected && paginatedPayments.length > 0}
                        onChange={handleHeaderSelectAll}
                        disabled={!canEdit || paginatedPayments.length === 0}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer disabled:cursor-not-allowed accent-rose-600"
                        title="Select All on this page"
                      />
                    </th>
                    <th className="py-2 px-3 whitespace-nowrap">Transaction & Date</th>
                    <th className="py-2 px-3 whitespace-nowrap">Rider Details</th>
                    <th className="py-2 px-3 whitespace-nowrap">Company</th>
                    <th className="py-2 px-3 whitespace-nowrap">Cycle</th>
                    <th className="py-2 px-3 text-right whitespace-nowrap">Gross Payout</th>
                    <th className="py-2 px-3 text-right text-rose-700 whitespace-nowrap">Deductions</th>
                    <th className="py-2 px-3 text-right text-emerald-900 bg-emerald-50/20 whitespace-nowrap">Final Disbursed</th>
                    <th className="py-2 px-3 text-center whitespace-nowrap">Status</th>
                    <th className="py-2 px-3 whitespace-nowrap">Remark</th>
                    <th className="py-2 px-2 text-center whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {loading ? (
                    <tr>
                      <td colSpan={11} className="text-center py-12 text-gray-400">
                        <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-primary-500 border-t-transparent mr-2" />
                        Loading payment records...
                      </td>
                    </tr>
                  ) : paginatedPayments.length === 0 ? (
                    <tr>
                      <td colSpan={11} className="text-center py-16 text-gray-400">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <Receipt className="w-8 h-8 text-gray-300 stroke-[1.25]" />
                          <p className="font-semibold text-gray-700 text-xs">No payment records found</p>
                          <p className="text-[11px] text-gray-400">Mark riders as "PAID" in Categories to record payments here.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedPayments.map((p) => {
                      const companyObj = companies.find((c) => c.id === p.companyId || c._id === p.companyId);
                      const compName = companyObj?.name || p.companyName || 'Company';
                      const isSelected = selectedRowIds.includes(p.id);

                      const payoutVal = Number(p.payout) || 0;
                      const lossVal = Number(p.loss) || 0;
                      const advanceVal = Number(p.advance) || 0;
                      const totalDed = lossVal + advanceVal;
                      const finalVal = Number(p.finalPayout) || (payoutVal - totalDed);

                      return (
                        <tr key={p.id} className={`hover:bg-[#F8FAFC]/80 transition-colors ${isSelected ? 'bg-rose-50/40' : ''}`}>
                          {/* Checkbox */}
                          <td className="py-1 px-2 text-center whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleRowSelect(p.id)}
                              disabled={!canEdit}
                              className="w-3.5 h-3.5 rounded border-gray-300 text-rose-600 focus:ring-rose-500 cursor-pointer disabled:cursor-not-allowed accent-rose-600"
                            />
                          </td>

                          {/* Transaction ID & Date */}
                          <td className="py-1.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-gray-900 text-[11px]">
                                {p.transactionId || `TXN-${p.id.slice(-6).toUpperCase()}`}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-[10px] text-gray-400 mt-0.5 font-medium">
                              <Calendar className="w-2.5 h-2.5 text-gray-400" />
                              <span>{p.paymentDate || p.createdAt?.slice(0, 10) || '2026-09-18'}</span>
                              <span>•</span>
                              <span>{p.month || selectedMonthFilter}</span>
                            </div>
                          </td>

                          {/* Rider Details */}
                          <td className="py-1.5 px-3">
                            <div className="font-bold text-gray-900 text-xs">
                              {p.riderName || 'Sachin Sahu'}
                            </div>
                            <div className="text-[10px] font-mono text-gray-400 mt-0.5">
                              ID: {p.riderId || '1018329'}
                            </div>
                          </td>

                          {/* Company Name */}
                          <td className="py-1.5 px-3">
                            <span className="font-semibold text-gray-800 text-xs">{compName}</span>
                          </td>

                          {/* Cycle Badge */}
                          <td className="py-1.5 px-3 whitespace-nowrap">
                            {(() => {
                              const cycleInfo = getCycleColor(p.cycle || 'Cycle 1 (1st - 15th)');
                              return (
                                <span
                                  className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border shadow-2xs"
                                  style={{
                                    backgroundColor: cycleInfo.bg,
                                    color: cycleInfo.color,
                                    borderColor: cycleInfo.border,
                                  }}
                                >
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: cycleInfo.dot }} />
                                  <span>{p.cycle || 'Cycle 1 (1st - 15th)'}</span>
                                </span>
                              );
                            })()}
                          </td>

                          {/* Gross Payout */}
                          <td className="py-1.5 px-3 text-right font-bold text-gray-900 text-xs">
                            ₹{payoutVal.toLocaleString('en-IN')}
                          </td>

                          {/* Deductions (Loss + Advance) */}
                          <td className="py-1.5 px-3 text-right text-xs">
                            <span className="font-bold text-rose-700">
                              {totalDed > 0 ? `- ₹${totalDed.toLocaleString('en-IN')}` : '- ₹0'}
                            </span>
                            {(lossVal > 0 || advanceVal > 0) && (
                              <div className="text-[9px] text-gray-400 mt-0.5">
                                (L: {lossVal} | A: {advanceVal})
                              </div>
                            )}
                          </td>

                          {/* Final Disbursed */}
                          <td className="py-1.5 px-3 text-right font-black text-emerald-700 bg-emerald-50/20 text-xs">
                            ₹{finalVal.toLocaleString('en-IN')}
                          </td>

                          {/* Status Selector Dropdown */}
                          <td className="py-1.5 px-3 text-center">
                            <select
                              value={p.paymentStatus || 'Pending'}
                              onChange={(e) => handleStatusChange(p.id, e.target.value)}
                              className={`
                            px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors outline-none cursor-pointer
                            ${(p.paymentStatus || '').toUpperCase() === 'PAID'
                                  ? 'bg-[#DCFCE7] text-[#166534] border-[#86EFAC]'
                                  : (p.paymentStatus || '').toUpperCase() === 'HOLD'
                                    ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FCA5A5]'
                                    : 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]'
                                }
                          `}
                            >
                              <option value="Paid">PAID</option>
                              <option value="Pending">PENDING</option>
                              <option value="Hold">HOLD</option>
                            </select>
                          </td>

                          {/* Ayush Remark */}
                          <td className="py-1.5 px-3 text-gray-600 text-xs">
                            {p.remark || 'Direct Bank Disbursement'}
                          </td>

                          {/* Actions: Receipt + Delete */}
                          <td className="py-1.5 px-2 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                onClick={() => setReceiptModalPayment(p)}
                                className="p-1 rounded text-emerald-600 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer inline-flex items-center justify-center"
                                title="View Payment Receipt"
                              >
                                <FileCheck2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (!canEdit) {
                                    notifyLocked('delete payment');
                                    return;
                                  }
                                  setPaymentToDelete(p);
                                }}
                                className="p-1 rounded text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer inline-flex items-center justify-center"
                                title="Delete Payment Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer Summary / Totals */}
            <div className="bg-[#F8FAFC] border-t border-gray-200 px-4 py-2 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
              <div className="flex items-center gap-4 text-[11px] font-medium text-gray-600">
                <span>Total Gross: <strong className="text-gray-900">₹{totalGrossPayout.toLocaleString('en-IN')}</strong></span>
                <span>Total Deductions: <strong className="text-rose-700">- ₹{totalDeductions.toLocaleString('en-IN')}</strong></span>
                <span>Total Disbursed: <strong className="text-emerald-700">₹{totalFinalDisbursed.toLocaleString('en-IN')}</strong></span>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                  {paidCount} Paid
                </span>
                <span className="px-2 py-0.5 rounded-full font-bold bg-amber-100 text-amber-800">
                  {pendingCount} Pending
                </span>
              </div>
            </div>

            {/* Pagination Controls */}
            <Pagination
              currentPage={safePage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              pageSize={pageSize}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              totalItems={totalItems}
            />
          </>
        )}
      </div>

      {/* Payment Receipt Modal */}
      {receiptModalPayment && (
        <Modal
          isOpen={Boolean(receiptModalPayment)}
          onClose={() => setReceiptModalPayment(null)}
          title="Payment Disbursement Receipt"
          subtitle={`Transaction #${receiptModalPayment.transactionId || receiptModalPayment.id?.slice(-6).toUpperCase()}`}
          showConfirm={false}
          cancelLabel="Close Receipt"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between">
              <div>
                <div className="text-[10px] text-emerald-800 font-semibold uppercase tracking-wider">Total Disbursed Amount</div>
                <div className="text-xl font-bold text-emerald-900 mt-0.5">
                  ₹{(receiptModalPayment.finalPayout || 0).toLocaleString('en-IN')}
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-200 text-emerald-900">
                {receiptModalPayment.paymentStatus?.toUpperCase() || 'PAID'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div>
                <span className="text-gray-400 block text-[10px]">Rider Name</span>
                <span className="font-bold text-gray-900">{receiptModalPayment.riderName || 'Sachin Sahu'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Rider ID</span>
                <span className="font-bold font-mono text-gray-900">{receiptModalPayment.riderId || '1018329'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Month & Cycle</span>
                <span className="font-semibold text-gray-800">{receiptModalPayment.month || selectedMonthFilter} • {receiptModalPayment.cycle || 'Cycle 1'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Gross Payout</span>
                <span className="font-semibold text-gray-800">₹{(receiptModalPayment.payout || 0).toLocaleString('en-IN')}</span>
              </div>
            </div>

            <div className="p-3 bg-rose-50/50 rounded-lg border border-rose-100 flex items-center justify-between">
              <span className="text-rose-800 font-medium">Total Deductions (Loss + Advance)</span>
              <span className="font-bold text-rose-700">
                - ₹{((Number(receiptModalPayment.loss) || 0) + (Number(receiptModalPayment.advance) || 0)).toLocaleString('en-IN')}
              </span>
            </div>

            <div className="text-[10px] text-gray-400 text-center pt-2">
              Generated automatically by Rider Management Portal System
            </div>
          </div>
        </Modal>
      )}

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        reportTitle="Transaction Ledger"
        reportType="Disbursement Transaction Ledger"
        sheetName="Transactions"
        filename={`Transactions_${selectedMonthFilter}_${selectedFinancialYear || 'FY'}.xlsx`}
        metadata={[
          {
            label: 'Company',
            value:
              selectedCompanyFilter === 'all'
                ? 'All Companies'
                : companies.find((c) => (c.id || c._id) === selectedCompanyFilter)?.name || 'Company',
          },
          { label: 'Period', value: `${selectedMonthFilter} (${selectedFinancialYear || 'FY'})` },
          { label: 'Cycle Filter', value: selectedCycleFilter && selectedCycleFilter !== 'all' ? selectedCycleFilter : 'All Cycles' },
          { label: 'Status Filter', value: selectedStatus },
        ]}
        summaryCards={[
          { label: 'Total Transactions', value: filteredPayments.length },
          { label: 'Total Paid Out', value: formatCurrency(summaryMetrics.totalPaidOut), highlight: true, color: 'emerald' },
        ]}
        headers={[
          'Transaction ID',
          'Rider Name',
          'Rider ID',
          'Company',
          'Cycle',
          'Month',
          'Gross Payout',
          'Loss Deduction',
          'Advance Deduction',
          'Final Payout',
          'Payment Status',
          'Payment Date',
          'Ayush Remark',
        ]}
        rows={filteredPayments.map((p) => {
          const compName =
            companies.find((c) => c.id === p.companyId || c._id === p.companyId)?.name ||
            p.companyName ||
            'Company';
          return [
            p.transactionId || '-',
            p.riderName || '',
            p.riderId || '',
            compName,
            p.cycle || 'Cycle 1 (1st - 15th)',
            p.month || selectedMonthFilter,
            Number(p.payout) || 0,
            Number(p.loss) || 0,
            Number(p.advance) || 0,
            Number(p.finalPayout) || 0,
            p.paymentStatus || 'Pending',
            p.paymentDate || '-',
            p.remark || '',
          ];
        })}
      />

      {/* Single Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={!!paymentToDelete}
        onClose={() => setPaymentToDelete(null)}
        onConfirm={handleDeleteSingle}
        title="Delete Payment Record"
        message={`Are you sure you want to delete payment record for "${paymentToDelete?.riderName || 'this rider'}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete"
        variant="danger"
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Delete Selected Payment Records"
        message={`Are you sure you want to delete ${selectedRowIds.length} selected payment records? This action cannot be undone.`}
        confirmLabel={`Yes, Delete ${selectedRowIds.length} Records`}
        variant="danger"
      />
    </div>
  );
};
