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
  Building2,
  DollarSign,
  AlertCircle,
  Check,
  Mail,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { ConfirmationModal, Pagination, SampleTemplateDropdown, CustomDropdown, SendEmailModal } from '../components/common';
import { useCompany } from '../context/CompanyContext';
import { useLock } from '../context/LockContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTabRefresh } from '../context/RefreshContext';
import { formatCurrency } from '../utils/calculations';
import { downloadCSV, downloadExcel, downloadSampleTemplate } from '../utils/exportUtils';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

// Helper function to return Cycle / Week options dynamically based on company
export const getCycleOptions = (companyName) => {
  const isValmo = (companyName || '').toString().toLowerCase().includes('valmo');
  if (isValmo) {
    return [
      { value: 'Week 1', label: 'Week 1' },
      { value: 'Week 2', label: 'Week 2' },
      { value: 'Week 3', label: 'Week 3' },
      { value: 'Week 4', label: 'Week 4' },
    ];
  }
  return [
    { value: 'Cycle 1 (1st - 15th)', label: 'Cycle 1 (1st - 15th)' },
    { value: 'Cycle 2 (16th - End of Month)', label: 'Cycle 2 (16th - End of Month)' },
  ];
};

// Cycle Color Mapping Helper for Status-Wise Harmonious Combinations
export const getCycleColor = (cycleName) => {
  const c = (cycleName || '').toString().toLowerCase();
  if (c.includes('cycle 1') || c.includes('1st')) {
    return {
      badge: 'bg-blue-50 text-blue-700 border-blue-200/90 hover:bg-blue-100/80 hover:border-blue-300',
      dot: 'bg-blue-500 ring-blue-100',
      activeBg: 'bg-blue-50 text-blue-800 font-bold',
      tagBadge: 'bg-blue-100/70 text-blue-700',
    };
  }
  if (c.includes('cycle 2') || c.includes('16th')) {
    return {
      badge: 'bg-purple-50 text-purple-700 border-purple-200/90 hover:bg-purple-100/80 hover:border-purple-300',
      dot: 'bg-purple-500 ring-purple-100',
      activeBg: 'bg-purple-50 text-purple-800 font-bold',
      tagBadge: 'bg-purple-100/70 text-purple-700',
    };
  }
  if (c.includes('week 1')) {
    return {
      badge: 'bg-sky-50 text-sky-700 border-sky-200/90 hover:bg-sky-100/80 hover:border-sky-300',
      dot: 'bg-sky-500 ring-sky-100',
      activeBg: 'bg-sky-50 text-sky-800 font-bold',
      tagBadge: 'bg-sky-100/70 text-sky-700',
    };
  }
  if (c.includes('week 2')) {
    return {
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/90 hover:bg-emerald-100/80 hover:border-emerald-300',
      dot: 'bg-emerald-500 ring-emerald-100',
      activeBg: 'bg-emerald-50 text-emerald-800 font-bold',
      tagBadge: 'bg-emerald-100/70 text-emerald-700',
    };
  }
  if (c.includes('week 3')) {
    return {
      badge: 'bg-amber-50 text-amber-700 border-amber-200/90 hover:bg-amber-100/80 hover:border-amber-300',
      dot: 'bg-amber-500 ring-amber-100',
      activeBg: 'bg-amber-50 text-amber-800 font-bold',
      tagBadge: 'bg-amber-100/70 text-amber-700',
    };
  }
  if (c.includes('week 4')) {
    return {
      badge: 'bg-rose-50 text-rose-700 border-rose-200/90 hover:bg-rose-100/80 hover:border-rose-300',
      dot: 'bg-rose-500 ring-rose-100',
      activeBg: 'bg-rose-50 text-rose-800 font-bold',
      tagBadge: 'bg-rose-100/70 text-rose-700',
    };
  }
  return {
    badge: 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100',
    dot: 'bg-gray-400 ring-gray-100',
    activeBg: 'bg-gray-50 text-gray-800 font-bold',
    tagBadge: 'bg-gray-100 text-gray-600',
  };
};

// Advanced Status-Styled Custom Dropdown Component
const CycleDropdown = ({ value, onChange, options, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const color = getCycleColor(value);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition-all duration-150 ${color.badge} ${
          disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-black/10'
        }`}
      >
        <span className={`w-2 h-2 rounded-full ${color.dot} ring-2 shrink-0`} />
        <span className="truncate">{value || 'Select Cycle'}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 opacity-70 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-1.5 w-64 bg-white border border-gray-200/90 rounded-2xl shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="px-3 py-1.5 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            Select Payout Cycle
          </div>
          <div className="p-1 space-y-1 max-h-60 overflow-y-auto">
            {options.map((opt) => {
              const isSelected = opt.value === value;
              const optColor = getCycleColor(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors ${
                    isSelected ? optColor.activeBg : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className={`w-2.5 h-2.5 rounded-full ${optColor.dot} ring-2 shrink-0`} />
                    <span className="font-semibold truncate">{opt.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-current shrink-0 ml-2" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const PaymentPayout = () => {
  const { companies, selectedCompanyFilter, selectedMonthFilter, selectedFinancialYear, selectedCycleFilter, fetchCompanies } = useCompany();
  const { canEdit, notifyLocked } = useLock();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Tab Refresh Hook
  useTabRefresh(() => {
    fetchPayments();
    if (typeof fetchCompanies === 'function') fetchCompanies();
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [rowToDelete, setRowToDelete] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSampleMenuOpen, setIsSampleMenuOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);
  const sampleMenuRef = useRef(null);

  // Active companies
  const activeCompanies = useMemo(() => {
    return companies.filter((c) => c.status === 'Active');
  }, [companies]);

  const currentCompany = activeCompanies.find((c) => (c.id || c._id) === selectedCompanyFilter) || activeCompanies[0];

  // Helper to get existing cycles for a company in current loaded records
  const getExistingCyclesForCompany = useCallback((companyId, companyName) => {
    return rows
      .filter((r) => {
        const matchId = companyId && (r.companyId === companyId || r.companyId?._id === companyId || r.companyId?.id === companyId);
        const matchName = companyName && r.companyName?.toLowerCase() === companyName?.toLowerCase();
        return matchId || matchName;
      })
      .map((r) => r.cycle);
  }, [rows]);

  // New Record Form State for Modal
  const [newForm, setNewForm] = useState({
    companyId: '',
    cycle: '',
    amount: '',
    loss: '',
    remarks: '',
  });

  // Modal target company
  const modalCompany = useMemo(() => {
    const targetId = newForm.companyId || (currentCompany?.id || currentCompany?._id) || (activeCompanies[0]?.id || activeCompanies[0]?._id);
    return companies.find((c) => (c.id || c._id) === targetId) || currentCompany || activeCompanies[0];
  }, [newForm.companyId, currentCompany, activeCompanies, companies]);

  // All allowed cycles for target modal company
  const allCyclesForModalComp = useMemo(() => {
    return getCycleOptions(modalCompany?.name);
  }, [modalCompany]);

  // Available (uncreated) cycles for modal company
  const availableCyclesForModal = useMemo(() => {
    const existing = getExistingCyclesForCompany(modalCompany?.id || modalCompany?._id, modalCompany?.name);
    return allCyclesForModalComp.filter((opt) => !existing.includes(opt.value));
  }, [allCyclesForModalComp, getExistingCyclesForCompany, modalCompany]);

  // Check if current page company has added all allowed cycles
  const currentCompanyCycles = useMemo(() => {
    if (!currentCompany) return { all: [], existing: [], isFull: false };
    const all = getCycleOptions(currentCompany.name);
    const existing = getExistingCyclesForCompany(currentCompany.id || currentCompany._id, currentCompany.name);
    return {
      all,
      existing,
      isFull: all.length > 0 && all.every((opt) => existing.includes(opt.value)),
    };
  }, [currentCompany, getExistingCyclesForCompany]);

  // Sync default modal company whenever currentCompany changes
  useEffect(() => {
    if (currentCompany) {
      const existing = getExistingCyclesForCompany(currentCompany.id || currentCompany._id, currentCompany.name);
      const allOpts = getCycleOptions(currentCompany.name);
      const avail = allOpts.filter((opt) => !existing.includes(opt.value));
      setNewForm((prev) => ({
        ...prev,
        companyId: prev.companyId || (currentCompany.id || currentCompany._id),
        cycle: prev.cycle || avail[0]?.value || allOpts[0]?.value,
      }));
    }
  }, [currentCompany, getExistingCyclesForCompany]);

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target)) {
        setIsExportMenuOpen(false);
      }
      if (sampleMenuRef.current && !sampleMenuRef.current.contains(event.target)) {
        setIsSampleMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch payments from backend
  const fetchPayments = useCallback(async () => {
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

      const res = await apiClient.get(ENDPOINTS.MY_PAYMENTS.GET_ALL, { params });
      if (res.success && Array.isArray(res.data)) {
        const formatted = res.data.map((item) => ({
          ...item,
          id: item._id || item.id,
          companyId: item.companyId?._id || item.companyId?.id || item.companyId,
          companyName: item.companyId?.name || currentCompany?.name || 'Company',
          amount: Number(item.amount) || 0,
          loss: Number(item.loss) || 0,
          finalPayable: Number(item.finalPayable) || (Number(item.amount || 0) - Number(item.loss || 0)),
          cycle: item.cycle || 'Cycle 1',
        }));
        setRows(formatted);
      }
    } catch (error) {
      console.error('[Fetch My Payments Error]:', error.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedCompanyFilter, selectedMonthFilter, selectedFinancialYear, currentCompany]);

  useEffect(() => {
    fetchPayments();
    setSelectedRowIds([]);
  }, [fetchPayments]);

  // Filtered rows for cycle and search
  const displayedRows = useMemo(() => {
    return rows.filter((r) => {
      const matchCycle = !selectedCycleFilter || selectedCycleFilter === 'all' || r.cycle === selectedCycleFilter;
      if (!matchCycle) return false;
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        r.companyName?.toLowerCase().includes(q) ||
        r.cycle?.toLowerCase().includes(q) ||
        r.amount?.toString().includes(q) ||
        r.loss?.toString().includes(q) ||
        r.finalPayable?.toString().includes(q) ||
        r.remarks?.toLowerCase().includes(q)
      );
    });
  }, [rows, searchQuery, selectedCycleFilter]);

  // Totals calculation
  const totals = useMemo(() => {
    return displayedRows.reduce(
      (acc, r) => {
        const amt = Number(r.amount) || 0;
        const lss = Number(r.loss) || 0;
        acc.amount += amt;
        acc.loss += lss;
        acc.finalPayout += amt - lss;
        return acc;
      },
      { amount: 0, loss: 0, finalPayout: 0 }
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
      notifyLocked('edit payment record');
      return;
    }

    let cleanValue = value;
    if (field === 'amount' || field === 'loss') {
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
        if (field === 'amount' || field === 'loss') {
          const amt = field === 'amount' ? Number(cleanValue) || 0 : Number(r.amount) || 0;
          const ls = field === 'loss' ? Number(cleanValue) || 0 : Number(r.loss) || 0;
          updated.finalPayable = amt - ls;
        }
        if (field === 'companyId') {
          const comp = companies.find((c) => (c.id || c._id) === cleanValue);
          if (comp) {
            updated.companyName = comp.name;
            const cycleOpts = getCycleOptions(comp.name);
            updated.cycle = cycleOpts[0].value;
          }
        }
        return updated;
      })
    );

    try {
      await apiClient.patch(ENDPOINTS.MY_PAYMENTS.UPDATE(rowId), { [field]: cleanValue });
    } catch (error) {
      toast.error(error.message || 'Failed to update payment record');
      fetchPayments();
    }
  };

  // Handle Open Add Modal
  const handleOpenAddModal = () => {
    if (!canEdit) {
      notifyLocked('add payment record');
      return;
    }
    const targetComp = currentCompany || activeCompanies[0];
    const targetCompId = targetComp?.id || targetComp?._id || '';
    const existing = getExistingCyclesForCompany(targetCompId, targetComp?.name);
    const allOpts = getCycleOptions(targetComp?.name);
    const avail = allOpts.filter((opt) => !existing.includes(opt.value));

    setNewForm({
      companyId: targetCompId,
      cycle: avail[0]?.value || '',
      amount: '',
      loss: '',
      remarks: '',
    });
    setIsAddModalOpen(true);
  };

  // Handle Create Payment from Modal
  const handleCreateRecord = async (e) => {
    e.preventDefault();
    if (!canEdit) {
      notifyLocked('add payment record');
      return;
    }

    const targetCompanyId = newForm.companyId || selectedCompanyFilter || (activeCompanies[0]?.id || activeCompanies[0]?._id);
    if (!targetCompanyId) {
      toast.error('Please select an active company first.');
      return;
    }

    const selectedComp = companies.find((c) => (c.id || c._id) === targetCompanyId) || currentCompany;
    const existing = getExistingCyclesForCompany(targetCompanyId, selectedComp?.name);
    const cycleToAdd = newForm.cycle;

    if (!cycleToAdd) {
      toast.error('Please select a valid cycle.');
      return;
    }

    if (existing.includes(cycleToAdd)) {
      toast.error(`'${cycleToAdd}' is already added for '${selectedComp?.name}' in ${selectedMonthFilter}.`);
      return;
    }

    try {
      const payload = {
        companyId: targetCompanyId,
        month: selectedMonthFilter,
        financialYear: selectedFinancialYear,
        cycle: cycleToAdd,
        amount: Number(newForm.amount) || 0,
        loss: Number(newForm.loss) || 0,
        remarks: newForm.remarks.trim(),
      };

      const res = await apiClient.post(ENDPOINTS.MY_PAYMENTS.CREATE, payload);
      if (res.success && res.data) {
        const created = {
          ...res.data,
          id: res.data._id || res.data.id,
          companyName: res.data.companyId?.name || selectedComp?.name || 'Company',
        };
        setRows((prev) => [created, ...prev]);
        toast.success(`Payment cycle '${cycleToAdd}' for '${created.companyName}' added successfully!`);
        setIsAddModalOpen(false);
        setNewForm({
          companyId: targetCompanyId,
          cycle: '',
          amount: '',
          loss: '',
          remarks: '',
        });
      }
    } catch (error) {
      toast.error(error.message || 'Failed to create payment record');
    }
  };

  // Delete single row
  const handleConfirmDelete = async () => {
    if (!rowToDelete) return;
    try {
      await apiClient.delete(ENDPOINTS.MY_PAYMENTS.DELETE(rowToDelete.id));
      setRows((prev) => prev.filter((r) => r.id !== rowToDelete.id));
      setSelectedRowIds((prev) => prev.filter((id) => id !== rowToDelete.id));
      toast.success('Payment record deleted successfully.');
    } catch (error) {
      toast.error(error.message || 'Failed to delete payment record');
    } finally {
      setRowToDelete(null);
    }
  };

  // Bulk delete selected rows
  const handleConfirmBulkDelete = async () => {
    if (selectedRowIds.length === 0) return;
    try {
      await apiClient.post(ENDPOINTS.MY_PAYMENTS.BULK_DELETE, { ids: selectedRowIds });
      setRows((prev) => prev.filter((r) => !selectedRowIds.includes(r.id)));
      toast.success(`Deleted ${selectedRowIds.length} payment records.`);
      setSelectedRowIds([]);
    } catch (error) {
      toast.error(error.message || 'Failed to bulk delete records');
    } finally {
      setIsBulkDeleteModalOpen(false);
    }
  };

  // Sample template headers & dynamic row generation by company
  const templateHeaders = ['Company', 'Cycle', 'Amount', 'Loss', 'Final Payable', 'Remark'];

  const generateSampleRowsForCompany = (comp) => {
    const compName = (comp?.name || currentCompany?.name || 'Company').trim();
    const isValmo = compName.toLowerCase().includes('valmo');

    if (isValmo) {
      return [
        [compName, 'Week 1', 50000, 10000, 40000, 'Cycle 1 payout'],
        [compName, 'Week 2', 45000, 5000, 40000, 'Cycle 2 payout'],
        [compName, 'Week 3', 60000, 8000, 52000, 'Cycle 3 payout'],
        [compName, 'Week 4', 55000, 7000, 48000, 'Cycle 4 payout'],
      ];
    }

    return [
      [compName, 'Cycle 1 (1st - 15th)', 50000, 10000, 40000, 'Cycle 1 payout'],
      [compName, 'Cycle 2 (16th - End of Month)', 60000, 8000, 52000, 'Cycle 2 payout'],
    ];
  };

  const handleDownloadSample = (format = 'xlsx', targetCompany = null) => {
    setIsSampleMenuOpen(false);
    const comp = targetCompany || currentCompany;
    const compName = (comp?.name || 'Company').trim();
    const safeCompName = compName.replace(/\s+/g, '_');
    const filename = `${safeCompName}_Payment_Sample_Template_${selectedMonthFilter}`;
    const sampleRows = generateSampleRowsForCompany(comp);

    if (format === 'xlsx') {
      downloadExcel(templateHeaders, sampleRows, filename);
    } else {
      downloadCSV(templateHeaders, sampleRows, filename);
    }
    toast.success(`Downloaded ${compName} sample ${format.toUpperCase()} template.`);
  };

  // Export Data
  const handleExport = (format) => {
    setIsExportMenuOpen(false);
    const compName = (currentCompany?.name || 'Company').replace(/\s+/g, '_');
    const filename = `${compName}_Payment_Details_${selectedMonthFilter}_${selectedFinancialYear}`;

    const headers = ['Company', 'Cycle', 'Amount', 'Loss', 'Final Payable', 'Remark'];
    const dataRows = displayedRows.map((r) => [
      r.companyName || '',
      r.cycle || '',
      r.amount || 0,
      r.loss || 0,
      (Number(r.amount) || 0) - (Number(r.loss) || 0),
      r.remarks || r.remark || '',
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
      notifyLocked('upload payment file');
      e.target.value = '';
      return;
    }

    const targetCompanyId = selectedCompanyFilter || (activeCompanies[0]?.id || activeCompanies[0]?._id);
    if (!targetCompanyId) {
      toast.error('Please select an active company first.');
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

          const rawComp = findVal(['Company', 'company', 'Logistics Company', 'Vendor']);
          const rawCycle = findVal(['Cycle', 'Cycel', 'cycle', 'Week', 'week', 'Cycle / Week']);
          const rawAmount = findVal(['Amount', 'amount', 'Total Amount', 'Payout Amount']);
          const rawLoss = findVal(['Loss', 'loss', 'Loss Amount', 'Deduction']);

          return {
            company: String(rawComp || '').trim(),
            cycle: String(rawCycle || 'Cycle 1').trim(),
            amount: Number(rawAmount) || 0,
            loss: Number(rawLoss) || 0,
          };
        });

        const res = await apiClient.post(ENDPOINTS.MY_PAYMENTS.BULK_IMPORT, {
          companyId: targetCompanyId,
          month: selectedMonthFilter,
          financialYear: selectedFinancialYear,
          rows: mappedRows,
        });

        if (res.success) {
          toast.success(`Successfully imported ${res.count || mappedRows.length} payment records!`);
          fetchPayments();
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
      {/* Main Table Card */}
      <div className="bg-white border border-gray-200/80 rounded-2xl shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
        {/* Toolbar */}
        <div className="p-3 sm:p-4 border-b border-gray-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2.5 sm:gap-3 shrink-0">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by company, cycle, or amount..."
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
            {/* Bulk Delete */}
            {selectedRowIds.length > 0 && (
              <button
                type="button"
                onClick={() => setIsBulkDeleteModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-colors shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedRowIds.length})</span>
              </button>
            )}

            {/* Download Sample Template Dropdown */}
            <SampleTemplateDropdown
              currentCompany={currentCompany}
              companies={companies}
              onDownload={handleDownloadSample}
              label="Sample Sheet"
            />

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
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl shadow-xs transition-colors"
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
              onClick={handleOpenAddModal}
              disabled={currentCompanyCycles.isFull}
              title={currentCompanyCycles.isFull ? `All cycles (${currentCompanyCycles.all.length}/${currentCompanyCycles.all.length}) already added for ${selectedMonthFilter}` : 'Add Cycle'}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-xl shadow-xs transition-colors ${
                currentCompanyCycles.isFull
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                  : 'text-white bg-black hover:bg-gray-800'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{currentCompanyCycles.isFull ? `All Cycles Added (${currentCompanyCycles.all.length}/${currentCompanyCycles.all.length})` : 'Add Cycle'}</span>
            </button>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedRowIds.length > 0 && (
          <div className="bg-[#FFF1F2] border-b border-[#FECDD3] px-3.5 py-1.5 flex items-center justify-between gap-3 text-xs shrink-0 transition-all">
            <div className="flex items-center gap-2 text-[#9F1239] font-bold">
              <span>{selectedRowIds.length} payment record{selectedRowIds.length > 1 ? 's' : ''} selected</span>
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

        {/* Table View */}
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
                <th className="py-2 px-3 min-w-[150px]">Company</th>
                <th className="py-2 px-3 min-w-[170px]">Cycle</th>
                <th className="py-2 px-3 min-w-[130px]">Amount</th>
                <th className="py-2 px-3 min-w-[130px]">Loss</th>
                <th className="py-2 px-3 min-w-[140px]">Final Payable</th>
                <th className="py-2 px-3 min-w-[160px]">Remark</th>
                <th className="py-2 px-3 w-16 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-black border-t-transparent mb-2" />
                    <p>Loading payment cycles...</p>
                  </td>
                </tr>
              ) : paginatedRows.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-16 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
                      <Inbox className="w-6 h-6" />
                    </div>
                    <p className="text-sm font-semibold text-gray-700">No payment records found</p>
                    <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                      Use "Import File" with Excel/CSV or click "Add Cycle" to record payment disbursement cycles.
                    </p>
                  </td>
                </tr>
              ) : (
                paginatedRows.map((row) => {
                  const finalPay = (Number(row.amount) || 0) - (Number(row.loss) || 0);
                  const isSelected = selectedRowIds.includes(row.id);

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

                      {/* Company Dropdown / Badge */}
                      <td className="py-1.5 px-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs tracking-wide uppercase">
                            <Building2 className="w-3 h-3 text-blue-600" />
                            {row.companyName}
                          </span>
                        </div>
                      </td>

                      {/* Dynamic Cycle Dropdown (allows row's current cycle + unused cycles) */}
                      <td className="py-1.5 px-3">
                        {(() => {
                          const allOpts = getCycleOptions(row.companyName);
                          const existingOtherCycles = rows
                            .filter((r) => r.id !== row.id && (r.companyId === row.companyId || r.companyName?.toLowerCase() === row.companyName?.toLowerCase()))
                            .map((r) => r.cycle);
                          const selectableOptions = allOpts.filter((opt) => opt.value === row.cycle || !existingOtherCycles.includes(opt.value));

                          return (
                            <CycleDropdown
                              value={row.cycle}
                              disabled={!canEdit}
                              onChange={(val) => handleCellChange(row.id, 'cycle', val)}
                              options={selectableOptions}
                            />
                          );
                        })()}
                      </td>

                      {/* Amount */}
                      <td className="py-1.5 px-3">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                          <input
                            type="number"
                            value={row.amount === 0 || row.amount === '0' ? '' : (row.amount ?? '')}
                            disabled={!canEdit}
                            placeholder="0"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleCellChange(row.id, 'amount', e.target.value)}
                            className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg pl-6 pr-2 py-0.5 text-xs font-bold text-gray-900 focus:outline-none transition-all"
                          />
                        </div>
                      </td>

                      {/* Loss */}
                      <td className="py-1.5 px-3">
                        <div className="relative">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs">₹</span>
                          <input
                            type="number"
                            value={row.loss === 0 || row.loss === '0' ? '' : (row.loss ?? '')}
                            disabled={!canEdit}
                            placeholder="0"
                            onFocus={(e) => e.target.select()}
                            onChange={(e) => handleCellChange(row.id, 'loss', e.target.value)}
                            className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg pl-6 pr-2 py-0.5 text-xs font-bold text-red-600 focus:outline-none transition-all"
                          />
                        </div>
                      </td>

                      {/* Final Payable */}
                      <td className="py-1.5 px-3">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          {formatCurrency(finalPay)}
                        </span>
                      </td>

                      {/* Remark */}
                      <td className="py-1.5 px-3">
                        <input
                          type="text"
                          value={row.remarks || row.remark || ''}
                          disabled={!canEdit}
                          placeholder="Enter remark"
                          onFocus={(e) => e.target.select()}
                          onChange={(e) => handleCellChange(row.id, 'remarks', e.target.value)}
                          className="w-full bg-transparent border border-transparent hover:border-gray-200 focus:border-black focus:bg-white rounded-lg px-2 py-0.5 text-xs font-medium text-gray-800 focus:outline-none transition-all"
                        />
                      </td>

                      {/* Action */}
                      <td className="py-1.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => {
                            if (!canEdit) {
                              notifyLocked('delete payment record');
                              return;
                            }
                            setRowToDelete(row);
                          }}
                          className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
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

      {/* Add New Payment Cycle Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Add Payment Cycle</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Month: <span className="font-semibold text-gray-700">{selectedMonthFilter}</span> ({selectedFinancialYear})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRecord} className="p-5 space-y-4">
              {/* Company Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Company *
                </label>
                <CustomDropdown
                  value={newForm.companyId}
                  onChange={(compId) => {
                    const comp = companies.find((c) => (c.id || c._id) === compId);
                    const existing = getExistingCyclesForCompany(compId, comp?.name);
                    const cycleOpts = getCycleOptions(comp?.name);
                    const avail = cycleOpts.filter((opt) => !existing.includes(opt.value));
                    setNewForm({
                      ...newForm,
                      companyId: compId,
                      cycle: avail[0]?.value || '',
                    });
                  }}
                  options={activeCompanies.map((c) => ({
                    value: c.id || c._id,
                    label: c.name,
                    icon: Building2,
                  }))}
                  searchable={true}
                  fullWidth={true}
                  icon={Building2}
                  placeholder="Select Company"
                />
              </div>

              {/* Dynamic Cycle Selection */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Select Cycle / Week *
                </label>
                {availableCyclesForModal.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>All allowed cycles for {modalCompany?.name} in {selectedMonthFilter} are already added.</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {availableCyclesForModal.map((opt) => {
                        const isSelected = newForm.cycle === opt.value;
                        const optColor = getCycleColor(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => setNewForm({ ...newForm, cycle: opt.value })}
                            className={`px-3 py-2.5 rounded-xl border text-xs font-semibold flex items-center justify-between transition-all duration-150 text-left ${
                              isSelected
                                ? `${optColor.badge} ring-2 ring-black/10 border-current shadow-xs`
                                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={`w-2.5 h-2.5 rounded-full ${optColor.dot} ring-2 shrink-0`} />
                              <span className="truncate">{opt.label}</span>
                            </div>
                            {isSelected && <Check className="w-3.5 h-3.5 text-current shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">
                      {(modalCompany?.name || '').toLowerCase().includes('valmo')
                        ? `✨ Valmo: ${availableCyclesForModal.length} of ${allCyclesForModalComp.length} weekly cycles available`
                        : `✨ Standard company: ${availableCyclesForModal.length} of ${allCyclesForModalComp.length} cycles available`}
                    </p>
                  </div>
                )}
              </div>

              {/* Amount and Loss */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Amount (₹) *
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      required
                      placeholder="0"
                      value={newForm.amount === 0 || newForm.amount === '0' ? '' : (newForm.amount ?? '')}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        let clean = e.target.value;
                        if (/^0+[0-9]+/.test(clean)) clean = clean.replace(/^0+/, '');
                        setNewForm({ ...newForm, amount: clean });
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all font-bold"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Loss Deduction (₹)
                  </label>
                  <div className="relative">
                    <DollarSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="0"
                      value={newForm.loss === 0 || newForm.loss === '0' ? '' : (newForm.loss ?? '')}
                      onFocus={(e) => e.target.select()}
                      onChange={(e) => {
                        let clean = e.target.value;
                        if (/^0+[0-9]+/.test(clean)) clean = clean.replace(/^0+/, '');
                        setNewForm({ ...newForm, loss: clean });
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 focus:border-black transition-all font-bold text-red-600"
                    />
                  </div>
                </div>
              </div>

              {/* Live Final Payable Preview */}
              <div className="p-3.5 bg-emerald-50/60 rounded-xl flex items-center justify-between border border-emerald-200">
                <span className="text-xs font-semibold text-emerald-800">Final Payable Preview:</span>
                <span className="text-sm font-extrabold text-emerald-700">
                  {formatCurrency((Number(newForm.amount) || 0) - (Number(newForm.loss) || 0))}
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={availableCyclesForModal.length === 0}
                  className={`px-4 py-2 text-xs font-medium rounded-xl shadow-xs transition-colors ${
                    availableCyclesForModal.length === 0
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'text-white bg-black hover:bg-gray-800'
                  }`}
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
        title="Delete Payment Cycle Record"
        message={`Are you sure you want to delete the payment cycle record for "${rowToDelete?.companyName || 'Company'}" (${rowToDelete?.cycle || ''})? This action cannot be undone.`}
        confirmText="Delete Record"
        confirmVariant="danger"
      />

      {/* Bulk Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Bulk Delete Payment Records"
        message={`Are you sure you want to delete ${selectedRowIds.length} selected payment records? This cannot be undone.`}
        confirmText={`Delete ${selectedRowIds.length} Records`}
        confirmVariant="danger"
      />

      {/* Send Email Modal */}
      <SendEmailModal
        isOpen={isEmailModalOpen}
        onClose={() => setIsEmailModalOpen(false)}
        reportTitle="My Payment"
        reportType="Payment Cycle Ledger"
        sheetName="My Payments"
        filename={`${(currentCompany?.name || 'Company').replace(/\s+/g, '_')}_Payment_Details_${selectedMonthFilter}_${selectedFinancialYear || 'FY'}.xlsx`}
        metadata={[
          { label: 'Company', value: currentCompany?.name || 'All Companies' },
          { label: 'Period', value: `${selectedMonthFilter} (${selectedFinancialYear || 'FY'})` },
        ]}
        summaryCards={[
          { label: 'Total Cycles', value: displayedRows.length },
          { label: 'Net Payable', value: formatCurrency(totals.finalPayout), highlight: true, color: 'emerald' },
        ]}
        headers={['Company', 'Cycle', 'Amount', 'Loss', 'Final Payable']}
        rows={displayedRows.map((r) => [
          r.companyName || '',
          r.cycle || '',
          r.amount || 0,
          r.loss || 0,
          (Number(r.amount) || 0) - (Number(r.loss) || 0),
        ])}
      />
    </div>
  );
};
