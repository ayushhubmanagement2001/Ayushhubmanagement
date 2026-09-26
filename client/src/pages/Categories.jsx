import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import {
  Upload,
  Download,
  Plus,
  Search,
  FileText,
  ChevronDown,
  Trash2,
  Mail,
  Send,
  AtSign,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { CommonTable, ConfirmationModal, SampleTemplateDropdown } from '../components/common';
import { useCompany } from '../context/CompanyContext';
import { useLock } from '../context/LockContext';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import { useTabRefresh } from '../context/RefreshContext';
import { formatCurrency } from '../utils/calculations';
import { downloadCSV, downloadExcel, downloadSampleTemplate } from '../utils/exportUtils';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

export const Categories = () => {
  const {
    companies,
    selectedCompanyFilter,
    setSelectedCompanyFilter,
    selectedMonthFilter,
    selectedFinancialYear,
    fetchCompanies,
  } = useCompany();
  const { canEdit, notifyLocked } = useLock();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Tab Refresh Hook
  useTabRefresh(() => {
    fetchPayouts();
    if (typeof fetchCompanies === 'function') fetchCompanies();
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [rowToDelete, setRowToDelete] = useState(null);
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailForm, setEmailForm] = useState({
    toEmail: 'vineetpancheshwar1611@gmail.com',
    subject: '',
    customMessage: '',
  });
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);
  const exportMenuRef = useRef(null);
  const debounceTimers = useRef({});

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

  // Current company & format detection
  const currentCompany = useMemo(() => {
    return companies.find((c) => (c.id || c._id) === selectedCompanyFilter) || null;
  }, [companies, selectedCompanyFilter]);

  const companyFormat = useMemo(() => {
    if (!currentCompany) return 'shadowfax';
    const sType = (currentCompany.sheetType || '').toLowerCase();
    const cName = (currentCompany.name || '').toLowerCase();
    if (sType === 'valmo' || cName.includes('valmo')) return 'valmo';
    if (sType === 'xpressbees' || cName.includes('xpress')) return 'xpressbees';
    return 'shadowfax';
  }, [currentCompany]);

  const isDeliveredPickupFormat = companyFormat !== 'shadowfax';

  // Fetch rows from backend
  const fetchPayouts = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const params = {};
      if (selectedCompanyFilter !== 'all') params.companyId = selectedCompanyFilter;
      if (selectedMonthFilter !== 'all') params.month = selectedMonthFilter;

      const res = await apiClient.get(ENDPOINTS.RIDER_PAYOUTS.GET_ALL, { params });
      if (res.success && Array.isArray(res.data)) {
        const formatted = res.data.map((r) => {
          const advVal = Number(r.advance) || 0;
          const remarkVal = r.ayushRemark || 'Enter remark';
          const pVal = Number(r.payout) || 0;
          const lVal = Number(r.loss) || 0;

          return {
            ...r,
            id: r._id || r.id,
            riderCombined: r.riderId && r.riderName ? `${r.riderId}-${r.riderName}` : (r.riderId || r.riderName || ''),
            advance: advVal,
            ayushRemark: remarkVal,
            finalPayout: pVal - lVal - advVal,
          };
        });
        setRows(formatted);
      }
    } catch (error) {
      console.error('[Fetch Payouts Error]:', error.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, selectedCompanyFilter, selectedMonthFilter]);

  useEffect(() => {
    fetchPayouts();
    setSelectedRowIds([]);
  }, [fetchPayouts]);

  // Filtered rows for search
  const displayedRows = useMemo(() => {
    return rows.filter((r) => {
      const matchSearch = !searchQuery || 
        r.riderName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.riderId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.riderCombined?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.ayushRemark?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchSearch;
    });
  }, [rows, searchQuery]);

  // Universal Parser for Rider ID & Name (supports "ID - Name", "Name - ID", "ID / Name", "-ID", "Name-", "ID only", "Name only")
  const parseRiderIdentifier = (str) => {
    if (!str) return { riderId: '', riderName: '' };
    let raw = String(str).trim();
    raw = raw.replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim();
    if (!raw) return { riderId: '', riderName: '' };

    // 1. Digits first, then separator, then name: "123456 - Vineet", "123456/Vineet", "123456 Vineet"
    let match = raw.match(/^(\d+)[\s\-_/:|]+(.+)$/);
    if (match) {
      return { riderId: match[1].trim(), riderName: match[2].replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim() };
    }

    // 2. Name first, then separator, then digits: "Vineet Pancheshwar - 123456", "Shubham - 789"
    match = raw.match(/^(.+?)[\s\-_/:|]+(\d+)$/);
    if (match) {
      return { riderId: match[2].trim(), riderName: match[1].replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '').trim() };
    }

    // 3. Only digits (e.g. "123456" or "-123456")
    if (/^\d+$/.test(raw)) {
      return { riderId: raw, riderName: '' };
    }

    // 4. Only name (e.g. "Shubham" or "Shubham -")
    return { riderId: '', riderName: raw };
  };

  // Helper to find pre-configured rider from Company Settings
  const findConfiguredRider = useCallback((query) => {
    if (!currentCompany?.riders || !Array.isArray(currentCompany.riders) || !query) return null;
    const rawQ = String(query).trim().replace(/^[\s\-_/:|]+|[\s\-_/:|]+$/g, '');
    if (!rawQ) return null;

    const { riderId: parsedId, riderName: parsedName } = parseRiderIdentifier(rawQ);
    const lowerRaw = rawQ.toLowerCase();

    // Extract digits and words from input query
    const digitsOnly = rawQ.replace(/\D/g, '') || (parsedId ? parsedId.replace(/\D/g, '') : '');
    const wordsOnly = (parsedName || rawQ).replace(/[\d\-_/:|]/g, '').trim().toLowerCase();

    for (const r of currentCompany.riders) {
      const parsedR = parseRiderIdentifier(r.riderId || '', r.riderName || '', r.riderCombined || '');
      const rId = (parsedR.riderId || r.riderId || '').toString().trim();
      const rIdDigits = rId.replace(/\D/g, '');
      const rName = (parsedR.riderName || r.riderName || '').toString().trim();
      const rNameLower = rName.toLowerCase();
      const rComb = (parsedR.riderCombined || r.riderCombined || '').toString().trim().toLowerCase();

      // 1. Match by digits (e.g. "123456" or "789")
      if (digitsOnly && digitsOnly.length >= 2) {
        if (rIdDigits === digitsOnly || rComb.includes(digitsOnly) || rNameLower.includes(digitsOnly)) {
          return {
            ...r,
            riderId: rId,
            riderName: rName,
            rate: Number(r.rate !== undefined ? r.rate : (r.rateCard !== undefined ? r.rateCard : 0)) || 0,
            rateCard: Number(r.rateCard !== undefined ? r.rateCard : (r.rate !== undefined ? r.rate : 0)) || 0,
          };
        }
      }

      // 2. Match by Name (e.g. "Shubham" or "Vineet")
      if (wordsOnly && wordsOnly.length >= 2) {
        if (
          rNameLower === wordsOnly ||
          rComb === wordsOnly ||
          rNameLower.includes(wordsOnly) ||
          wordsOnly.includes(rNameLower) ||
          rComb.includes(wordsOnly)
        ) {
          return {
            ...r,
            riderId: rId,
            riderName: rName,
            rate: Number(r.rate !== undefined ? r.rate : (r.rateCard !== undefined ? r.rateCard : 0)) || 0,
            rateCard: Number(r.rateCard !== undefined ? r.rateCard : (r.rate !== undefined ? r.rate : 0)) || 0,
          };
        }
      }

      // 3. Fallback raw query match
      if (lowerRaw && (rNameLower === lowerRaw || rComb === lowerRaw || rId === lowerRaw)) {
        return {
          ...r,
          riderId: rId,
          riderName: rName,
          rate: Number(r.rate !== undefined ? r.rate : (r.rateCard !== undefined ? r.rateCard : 0)) || 0,
          rateCard: Number(r.rateCard !== undefined ? r.rateCard : (r.rate !== undefined ? r.rate : 0)) || 0,
        };
      }
    }

    return null;
  }, [currentCompany]);

  // Handle cell edit with Auto-Calculations and Smart Settings Lookup
  const handleCellChange = (rowId, field, value) => {
    if (!canEdit) {
      notifyLocked('edit table data');
      return;
    }

    if (field === 'riderCombined') {
      const rawStr = String(value ?? '');
      const { riderId: parsedId, riderName: parsedName } = parseRiderIdentifier(rawStr);
      let rId = parsedId;
      let rName = parsedName;

      const matchedConfig = findConfiguredRider(rawStr || rName || rId);
      if (matchedConfig) {
        if (!rId && matchedConfig.riderId) rId = matchedConfig.riderId;
        if (!rName && matchedConfig.riderName) rName = matchedConfig.riderName;
      }

      setRows((prev) =>
        prev.map((row) => {
          if (row.id === rowId) {
            const nextRate = matchedConfig && (matchedConfig.rate || matchedConfig.rateCard) ? (matchedConfig.rate || matchedConfig.rateCard) : row.rateCard;
            const p = Number(row.primary) || 0;
            const c = Number(row.clubbed) || 0;
            const deliv = Number(row.delivered) || 0;
            const pick = Number(row.pickup) || 0;

            let payout = 0;
            let total = 0;
            if (isDeliveredPickupFormat) {
              total = deliv + pick;
              payout = total * nextRate;
            } else {
              total = p + c;
              payout = (p * nextRate) + (c * (nextRate / 2));
            }

            const currentAdv = Number(row.advance) || 0;

            return {
              ...row,
              riderCombined: rawStr,
              riderId: rId,
              riderName: rName,
              rateCard: nextRate,
              primary: p,
              clubbed: c,
              deliveredPickupTotal: total,
              payout,
              finalPayout: payout - (Number(row.loss) || 0) - currentAdv,
            };
          }
          return row;
        })
      );

      const timerKey = `${rowId}_riderCombined`;
      if (debounceTimers.current[timerKey]) {
        clearTimeout(debounceTimers.current[timerKey]);
      }
      debounceTimers.current[timerKey] = setTimeout(async () => {
        try {
          const patchPayload = { riderId: rId, riderName: rName };
          if (matchedConfig) {
            if (matchedConfig.rate || matchedConfig.rateCard) patchPayload.rateCard = matchedConfig.rate || matchedConfig.rateCard;
          }
          await apiClient.patch(ENDPOINTS.RIDER_PAYOUTS.UPDATE(rowId), patchPayload);
        } catch (error) {
          toast.error(error.message || 'Failed to update record');
          fetchPayouts();
        }
      }, 400);
      return;
    }

    // If user changes riderName or riderId, auto-fill configured fields (Rider ID, Name, Rate) from Settings
    if (field === 'riderName' || field === 'riderId') {
      const strVal = String(value ?? '').trim();
      const matchedConfig = findConfiguredRider(strVal);

      setRows((prev) =>
        prev.map((row) => {
          if (row.id === rowId) {
            const nextRow = { ...row, [field]: value };
            if (matchedConfig) {
              if (field === 'riderName' && matchedConfig.riderId) {
                nextRow.riderId = matchedConfig.riderId;
              } else if (field === 'riderId' && matchedConfig.riderName) {
                nextRow.riderName = matchedConfig.riderName;
              }
              if (matchedConfig.rate || matchedConfig.rateCard) {
                nextRow.rateCard = matchedConfig.rate || matchedConfig.rateCard;
              }
            }

            const p = Number(nextRow.primary) || 0;
            const c = Number(nextRow.clubbed) || 0;
            const deliv = Number(nextRow.delivered) || 0;
            const pick = Number(nextRow.pickup) || 0;
            const r = Number(nextRow.rateCard) || 12;
            const l = Number(nextRow.loss) || 0;
            const a = Number(nextRow.advance) || 0;

            if (isDeliveredPickupFormat) {
              nextRow.deliveredPickupTotal = deliv + pick;
              nextRow.payout = nextRow.deliveredPickupTotal * r;
            } else {
              nextRow.deliveredPickupTotal = p + c;
              nextRow.payout = (p * 12) + (c * 6);
            }
            nextRow.finalPayout = nextRow.payout - l - a;
            return nextRow;
          }
          return row;
        })
      );

      if (matchedConfig) {
        toast.success(`Auto-matched rider details from settings!`);
      }

      const timerKey = `${rowId}_riderLookup`;
      if (debounceTimers.current[timerKey]) {
        clearTimeout(debounceTimers.current[timerKey]);
      }
      debounceTimers.current[timerKey] = setTimeout(async () => {
        try {
          const patchData = { [field]: value };
          if (matchedConfig) {
            if (field === 'riderName' && matchedConfig.riderId) patchData.riderId = matchedConfig.riderId;
            if (field === 'riderId' && matchedConfig.riderName) patchData.riderName = matchedConfig.riderName;
            if (matchedConfig.rate || matchedConfig.rateCard) patchData.rateCard = matchedConfig.rate || matchedConfig.rateCard;
          }
          await apiClient.patch(ENDPOINTS.RIDER_PAYOUTS.UPDATE(rowId), patchData);
        } catch (error) {
          toast.error(error.message || 'Failed to update record');
          fetchPayouts();
        }
      }, 400);
      return;
    }

    // Rate change notice
    if (field === 'rateCard' || field === 'rate') {
      toast.info(
        'Rate updated for this entry. Note: To permanently change the default rate for this rider, update it in Settings > Company & Rider Settings.',
        { duration: 4500 }
      );
    }

    // Optimistic state update for numeric and other fields
    setRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          const nextRow = { ...row, [field]: value };
          const p = Number(nextRow.primary) || 0;
          const c = Number(nextRow.clubbed) || 0;
          const deliv = Number(nextRow.delivered) || 0;
          const pick = Number(nextRow.pickup) || 0;
          const r = Number(nextRow.rateCard) || 12;
          const l = Number(nextRow.loss) || 0;
          const a = Number(nextRow.advance) || 0;

          let total = 0;
          let payout = 0;

          if (isDeliveredPickupFormat) {
            if (field === 'deliveredPickupTotal') {
              total = Number(value) || 0;
              nextRow.deliveredPickupTotal = value === '' ? '' : total;
            } else {
              total = deliv + pick;
              nextRow.deliveredPickupTotal = total;
            }
            payout = (Number(nextRow.deliveredPickupTotal) || 0) * r;
          } else {
            if (field === 'deliveredPickupTotal') {
              total = Number(value) || 0;
              nextRow.deliveredPickupTotal = value === '' ? '' : total;
              payout = total * r;
            } else if (field === 'primary' || field === 'clubbed') {
              total = p + c;
              nextRow.deliveredPickupTotal = total;
              payout = (p * r) + (c * (r / 2));
            } else {
              if (p > 0 || c > 0) {
                total = p + c;
                payout = (p * r) + (c * (r / 2));
                nextRow.deliveredPickupTotal = total;
              } else {
                total = Number(nextRow.deliveredPickupTotal) || 0;
                payout = total * r;
              }
            }
          }

          nextRow.payout = payout;
          nextRow.finalPayout = payout - l - a;
          return nextRow;
        }
        return row;
      })
    );

    if (field === 'paymentStatus') {
      apiClient.patch(ENDPOINTS.RIDER_PAYOUTS.UPDATE(rowId), { [field]: value }).catch((error) => {
        toast.error(error.message || 'Failed to update status');
        fetchPayouts();
      });
      return;
    }

    const timerKey = `${rowId}_${field}`;
    if (debounceTimers.current[timerKey]) {
      clearTimeout(debounceTimers.current[timerKey]);
    }
    debounceTimers.current[timerKey] = setTimeout(async () => {
      try {
        await apiClient.patch(ENDPOINTS.RIDER_PAYOUTS.UPDATE(rowId), { [field]: value });
      } catch (error) {
        toast.error(error.message || 'Failed to update record');
        fetchPayouts();
      }
    }, 400);
  };

  // Add a new blank row with default values from Company Settings
  // Add a new blank row with all zeroes ready for user to fill
  const handleAddRow = async () => {
    if (!canEdit) {
      notifyLocked('add a rider row');
      return;
    }

    const targetCompanyId = selectedCompanyFilter === 'all'
      ? (activeCompanies[0]?.id || activeCompanies[0]?._id)
      : selectedCompanyFilter;

    if (!targetCompanyId) {
      toast.error('Please create or select an active company first.');
      return;
    }

    try {
      const newRowPayload = {
        companyId: targetCompanyId,
        month: selectedMonthFilter,
        riderName: '',
        riderId: '',
        delivered: 0,
        pickup: 0,
        primary: 0,
        clubbed: 0,
        rateCard: 0,
        loss: 0,
        advance: 0,
        paymentStatus: 'PENDING',
        ayushRemark: 'Enter remark',
      };

      const res = await apiClient.post(ENDPOINTS.RIDER_PAYOUTS.CREATE, newRowPayload);
      if (res.success && res.data) {
        const created = {
          ...res.data,
          id: res.data._id,
          riderName: '',
          riderId: '',
          delivered: 0,
          pickup: 0,
          primary: 0,
          clubbed: 0,
          rateCard: 0,
          payout: 0,
          loss: 0,
          advance: 0,
          finalPayout: 0,
          paymentStatus: 'PENDING',
          ayushRemark: res.data.ayushRemark || 'Enter remark',
        };
        setRows((prev) => [created, ...prev]);
        toast.success('New blank rider row added! You can now fill in rider details.');
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add rider row');
    }
  };

  // Single Delete row confirmation
  const handleDeleteRow = (rowId) => {
    if (!canEdit) {
      notifyLocked('delete row');
      return;
    }
    const target = rows.find((r) => r.id === rowId);
    setRowToDelete(target);
  };

  const handleConfirmDelete = async () => {
    if (!rowToDelete) return;
    try {
      const res = await apiClient.delete(ENDPOINTS.RIDER_PAYOUTS.DELETE(rowToDelete.id));
      if (res.success) {
        setRows((prev) => prev.filter((r) => r.id !== rowToDelete.id));
        setSelectedRowIds((prev) => prev.filter((id) => id !== rowToDelete.id));
        toast.success(`Rider record "${rowToDelete.riderName}" deleted.`);
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
      notifyLocked('delete selected rows');
      return;
    }
    if (selectedRowIds.length === 0) return;
    setIsBulkDeleteModalOpen(true);
  };

  const handleConfirmBulkDelete = async () => {
    try {
      const res = await apiClient.post(ENDPOINTS.RIDER_PAYOUTS.BULK_DELETE, { ids: selectedRowIds });
      if (res.success) {
        setRows((prev) => prev.filter((r) => !selectedRowIds.includes(r.id)));
        toast.success(`Deleted ${selectedRowIds.length} rider records.`);
        setSelectedRowIds([]);
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete selected records');
    } finally {
      setIsBulkDeleteModalOpen(false);
    }
  };

  // Headers for current company format (Exact match to Google Sheet images)
  const currentHeaders = useMemo(() => {
    if (companyFormat === 'valmo' || companyFormat === 'xpressbees') {
      return [
        'Rider Name/Rider ID',
        'Delievred',
        'Pickup',
        'Total',
        'Rate Card',
        'Payout',
        'Loss',
        'Advance',
        'Final Payout',
        'Payment Stauts',
        'Ayush Remark',
      ];
    }
    return [
      'Rider Name',
      'Rider Id',
      'Delievred/Pickup Total',
      'Primary',
      'Clubbed',
      'Rate Card',
      'Payout',
      'Loss',
      'Advance',
      'Final Payout',
      'Payment Stauts',
      'Ayush Remark',
    ];
  }, [companyFormat]);

  // Export Data Builder (Matching exact format of Shadowfax, XpressBees & Valmo sheets)
  const getExportData = () => {
    return displayedRows.map((r) => {
      const p = Number(r.primary) || 0;
      const c = Number(r.clubbed) || 0;
      const deliv = Number(r.delivered) || 0;
      const pick = Number(r.pickup) || 0;
      const total = isDeliveredPickupFormat ? deliv + pick : (p + c || r.deliveredPickupTotal || 0);
      const rate = Number(r.rateCard) || 12;
      const payout = isDeliveredPickupFormat ? total * rate : (p * rate) + (c * (rate / 2));
      const loss = Number(r.loss) || 0;
      const advance = Number(r.advance) || 0;
      const finalPayout = payout - loss - advance;

      if (companyFormat === 'valmo' || companyFormat === 'xpressbees') {
        const combinedRider = r.riderId && r.riderName
          ? `${r.riderId}-${r.riderName}`
          : (r.riderCombined || (r.riderId ? `${r.riderId} ${r.riderName || ''}`.trim() : (r.riderName || '')));
        return [
          combinedRider,
          deliv,
          pick,
          total,
          rate,
          payout,
          loss,
          advance,
          finalPayout,
          r.paymentStatus || 'PENDING',
          r.ayushRemark || 'Enter remark',
        ];
      }

      return [
        r.riderName || '',
        r.riderId || '',
        total,
        p,
        c,
        rate,
        payout,
        loss,
        advance,
        finalPayout,
        r.paymentStatus || 'PENDING',
        r.ayushRemark || 'Enter remark',
      ];
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    setIsExportMenuOpen(false);
    if (displayedRows.length === 0) {
      toast.error('No rider records to export.');
      return;
    }
    const compName = selectedCompanyFilter === 'all' ? 'All_Companies' : (currentCompany?.name || 'Company').replace(/\s+/g, '_');
    const filename = `Rider_Payouts_${selectedMonthFilter}_${selectedFinancialYear || 'FY'}_${compName}`;
    downloadCSV(currentHeaders, getExportData(), filename);
    toast.success(`Exported ${displayedRows.length} rider records to CSV!`);
  };

  // Export to Excel (.xlsx)
  const handleExportExcel = () => {
    setIsExportMenuOpen(false);
    if (displayedRows.length === 0) {
      toast.error('No rider records to export.');
      return;
    }
    const compName = selectedCompanyFilter === 'all' ? 'All_Companies' : (currentCompany?.name || 'Company').replace(/\s+/g, '_');
    const filename = `Rider_Payouts_${selectedMonthFilter}_${selectedFinancialYear || 'FY'}_${compName}`;
    downloadExcel(currentHeaders, getExportData(), filename);
    toast.success(`Exported ${displayedRows.length} rider records to Excel (.xlsx)!`);
  };

  // Download Sample Template (Clean Header ONLY, ZERO data rows, company-specific)
  const handleDownloadTemplate = (format = 'xlsx', targetCompany = null) => {
    const comp = targetCompany || currentCompany;
    const compName = (comp?.name || 'Company').trim().replace(/\s+/g, '_');
    const isValOrXp = (comp?.name || '').toLowerCase().includes('xpress') || (comp?.name || '').toLowerCase().includes('valmo');
    
    const headers = isValOrXp
      ? [
          'Rider Name/Rider ID',
          'Delievred',
          'Pickup',
          'Rate',
          'Loss',
          'Advance',
          'Payment Status',
          'Ayush Remark',
        ]
      : [
          'Rider Name',
          'Rider ID',
          'Primary',
          'Clubbed',
          'Rate',
          'Loss',
          'Advance',
          'Payment Status',
          'Ayush Remark',
        ];

    const filename = `Rider_Payout_Template_${compName}_${selectedMonthFilter}`;
    if (format === 'xlsx') {
      downloadExcel(headers, [], filename);
    } else {
      downloadCSV(headers, [], filename);
    }
    toast.success(`Downloaded ${compName} rider payout template (${format.toUpperCase()})`);
  };

  // Open Email Modal and auto-populate default subject and recipient
  const openEmailModal = () => {
    const compName = currentCompany?.name || 'Company';
    setEmailForm({
      toEmail: 'vineetpancheshwar1611@gmail.com',
      subject: `Please find the below data of ${selectedMonthFilter} ${compName}`,
      customMessage: `Please find attached the exported rider payout ledger for ${compName} for ${selectedMonthFilter} (${selectedFinancialYear || ''}).`,
    });
    setIsEmailModalOpen(true);
  };

  // Send Email with Excel Attachment
  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!emailForm.toEmail.trim()) {
      toast.error('Recipient email address is required.');
      return;
    }

    if (displayedRows.length === 0) {
      toast.error('No rider payout records found to export and send.');
      return;
    }

    try {
      setIsSendingEmail(true);
      const compName = currentCompany?.name || 'Company';
      const exportData = getExportData();

      const totalRunsCount =
        footerSummaryData?.deliveredPickupTotal ??
        footerSummaryData?.run ??
        footerSummaryData?.totalRuns ??
        footerSummaryData?.totalOrders ??
        0;

      const payload = {
        toEmail: emailForm.toEmail.trim(),
        subject: emailForm.subject.trim() || `Please find the below data of ${selectedMonthFilter} ${compName}`,
        customMessage: emailForm.customMessage.trim(),
        month: selectedMonthFilter,
        companyName: compName,
        headers: currentHeaders,
        rows: exportData,
        summary: {
          totalRiders: displayedRows.length,
          totalRuns: totalRunsCount,
          deliveredPickupTotal: totalRunsCount,
          totalOrders: totalRunsCount,
          grossPayout: footerSummaryData?.payout || 0,
          finalPayout: footerSummaryData?.finalPayout || 0,
        },
      };

      const res = await apiClient.post(ENDPOINTS.RIDER_PAYOUTS.SEND_EMAIL, payload);
      if (res?.success) {
        toast.success(res.message || `Payout export successfully sent to ${emailForm.toEmail}!`);
        setIsEmailModalOpen(false);
      } else {
        toast.error(res?.message || 'Failed to deliver email. Please try again.');
      }
    } catch (err) {
      toast.error(err?.message || 'Failed to send email. Please check server settings.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Import Excel/CSV File (supports .xlsx, .xls, .csv with XLSX library)
  const handleFileUpload = (e) => {
    if (!canEdit) {
      notifyLocked('upload excel data');
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

        const targetCompanyId = selectedCompanyFilter === 'all'
          ? (activeCompanies[0]?.id || activeCompanies[0]?._id)
          : selectedCompanyFilter;

        if (!targetCompanyId) {
          toast.error('Please create or select an active company first.');
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

        const riderNameIdx = findColIdx(['rider name', 'rider_name', 'name', 'rider']);
        const riderIdIdx = findColIdx(['rider id', 'rider_id', 'id', 'emp id', 'employee id', 'code']);
        const primaryIdx = findColIdx(['primary', 'primary order']);
        const clubbedIdx = findColIdx(['clubbed', 'clubbed order']);
        const deliveredIdx = findColIdx(['delivered', 'delievred']);
        const pickupIdx = findColIdx(['pickup', 'pick up']);
        const totalIdx = findColIdx(['total', 'delivered / pickup', 'delivered/pickup']);
        const rateCardIdx = findColIdx(['rate card', 'ratecard', 'rate']);
        const lossIdx = findColIdx(['loss', 'loss deduction']);
        const advanceIdx = findColIdx(['advance', 'advance deduction']);
        const statusIdx = findColIdx(['status', 'payment status', 'payment stauts']);
        const remarkIdx = findColIdx(['remark', 'ayush remark', 'ayush_remark']);

        const importedRows = [];
        for (let i = 1; i < rawJson.length; i++) {
          const row = rawJson[i];
          if (!row || row.every((c) => String(c).trim() === '')) continue;

          let rawIdentifier = '';
          if (riderNameIdx >= 0 && row[riderNameIdx]) {
            rawIdentifier = String(row[riderNameIdx]).trim();
          } else if (riderIdIdx >= 0 && row[riderIdIdx]) {
            rawIdentifier = String(row[riderIdIdx]).trim();
          } else if (row[0]) {
            rawIdentifier = String(row[0]).trim();
          }

          let rId = riderIdIdx >= 0 && riderIdIdx !== riderNameIdx ? String(row[riderIdIdx] || '').trim() : '';
          let rName = riderNameIdx >= 0 && riderNameIdx !== riderIdIdx ? String(row[riderNameIdx] || '').trim() : '';

          const parsed = parseRiderIdentifier(rawIdentifier || (rName && rId ? `${rName} - ${rId}` : rName || rId));
          if (!rId && parsed.riderId) rId = parsed.riderId;
          if (!rName && parsed.riderName) rName = parsed.riderName;

          let primary = primaryIdx >= 0 && row[primaryIdx] !== '' && row[primaryIdx] !== undefined ? Number(row[primaryIdx]) || 0 : (isDeliveredPickupFormat ? 0 : (row[3] !== '' && row[3] !== undefined ? Number(row[3]) || 0 : 0));
          let clubbed = clubbedIdx >= 0 && row[clubbedIdx] !== '' && row[clubbedIdx] !== undefined ? Number(row[clubbedIdx]) || 0 : (isDeliveredPickupFormat ? 0 : (row[4] !== '' && row[4] !== undefined ? Number(row[4]) || 0 : 0));
          const delivered = deliveredIdx >= 0 && row[deliveredIdx] !== '' && row[deliveredIdx] !== undefined ? Number(row[deliveredIdx]) || 0 : 0;
          const pickup = pickupIdx >= 0 && row[pickupIdx] !== '' && row[pickupIdx] !== undefined ? Number(row[pickupIdx]) || 0 : 0;
          let rawRate = rateCardIdx >= 0 && row[rateCardIdx] !== '' && row[rateCardIdx] !== undefined ? Number(row[rateCardIdx]) || 0 : 0;
          const loss = lossIdx >= 0 && row[lossIdx] !== '' && row[lossIdx] !== undefined ? Number(row[lossIdx]) || 0 : 0;
          const advance = advanceIdx >= 0 && row[advanceIdx] !== '' && row[advanceIdx] !== undefined ? Number(row[advanceIdx]) || 0 : 0;
          const rawStatus = statusIdx >= 0 ? String(row[statusIdx] || '').trim().toUpperCase() : 'PENDING';
          const validStatus = ['PAID', 'HOLD', 'PENDING'].includes(rawStatus) ? rawStatus : 'PENDING';
          const ayushRemark = remarkIdx >= 0 && row[remarkIdx] ? String(row[remarkIdx]).trim() : 'Enter remark';

          // Match against Company Settings riders & auto-fetch missing Master Details (Rider ID, Name, Rate) ONLY
          const matchedConfig = findConfiguredRider(rawIdentifier || rName || rId);
          if (matchedConfig) {
            if (!rId && matchedConfig.riderId) rId = matchedConfig.riderId;
            if (!rName && matchedConfig.riderName) rName = matchedConfig.riderName;
            if (!rawRate && (matchedConfig.rate || matchedConfig.rateCard)) {
              rawRate = matchedConfig.rate || matchedConfig.rateCard;
            }
          }

          importedRows.push({
            riderName: rName,
            riderId: rId,
            primary,
            clubbed,
            delivered,
            pickup,
            rateCard: rawRate || 12,
            loss,
            advance,
            paymentStatus: validStatus,
            ayushRemark,
          });
        }

        if (importedRows.length > 0) {
          const res = await apiClient.post(ENDPOINTS.RIDER_PAYOUTS.BULK_IMPORT, {
            companyId: targetCompanyId,
            month: selectedMonthFilter,
            rows: importedRows,
          });

          if (res.success) {
            toast.success(`Successfully imported ${importedRows.length} riders with smart DB lookup & formulas applied!`);
            fetchPayouts();
          }
        } else {
          toast.error('No valid rows parsed from the uploaded file.');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to parse file. Please upload a valid Excel (.xlsx) or CSV file.');
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  // Table Columns (Dynamic according to company sheetType)
  const columns = useMemo(() => {
    if (companyFormat === 'valmo' || companyFormat === 'xpressbees') {
      return [
        {
          key: 'riderCombined',
          label: 'Rider Name/Rider ID',
          isEditable: true,
          type: 'text',
          minWidth: '175px',
          valueGetter: (row) =>
            row.riderCombined !== undefined
              ? row.riderCombined
              : (row.riderId && row.riderName ? `${row.riderId}-${row.riderName}` : (row.riderId || row.riderName || '')),
        },
        { key: 'delivered', label: 'Delievred', align: 'right', isEditable: true, type: 'number', minWidth: '85px' },
        { key: 'pickup', label: 'Pickup', align: 'right', isEditable: true, type: 'number', minWidth: '85px' },
        {
          key: 'deliveredPickupTotal',
          label: 'Total',
          align: 'right',
          isEditable: true,
          type: 'number',
          minWidth: '95px',
        },
        { key: 'rateCard', label: 'Rate Card', align: 'right', isEditable: true, type: 'number', minWidth: '95px' },
        {
          key: 'payout',
          label: 'Payout',
          align: 'right',
          isFormula: true,
          minWidth: '105px',
          cellBg: 'bg-emerald-50/25',
        },
        { key: 'loss', label: 'Loss', align: 'right', isEditable: true, type: 'number', minWidth: '85px', textClass: 'text-rose-700 font-semibold' },
        { key: 'advance', label: 'Advance', align: 'right', isEditable: true, type: 'number', minWidth: '90px', textClass: 'text-amber-700 font-semibold' },
        {
          key: 'finalPayout',
          label: 'Final Payout',
          align: 'right',
          isFormula: true,
          minWidth: '120px',
          cellBg: 'bg-blue-50/25',
        },
        { key: 'paymentStatus', label: 'Payment Stauts', align: 'center', type: 'status', minWidth: '130px' },
        { key: 'ayushRemark', label: 'Ayush Remark', isEditable: true, type: 'text', minWidth: '140px', placeholder: 'Enter remark' },
      ];
    }

    return [
      { key: 'riderName', label: 'Rider Name', isEditable: true, type: 'text', minWidth: '150px' },
      { key: 'riderId', label: 'Rider Id', isEditable: true, type: 'text', minWidth: '105px' },
      {
        key: 'deliveredPickupTotal',
        label: 'Delievred/Pickup Total',
        align: 'right',
        isEditable: true,
        type: 'number',
        minWidth: '130px',
      },
      { key: 'primary', label: 'Primary', align: 'right', isEditable: true, type: 'number', minWidth: '85px' },
      { key: 'clubbed', label: 'Clubbed', align: 'right', isEditable: true, type: 'number', minWidth: '85px' },
      { key: 'rateCard', label: 'Rate Card', align: 'right', isEditable: true, type: 'number', minWidth: '95px' },
      {
        key: 'payout',
        label: 'Payout',
        align: 'right',
        isFormula: true,
        minWidth: '105px',
        cellBg: 'bg-emerald-50/25',
      },
      { key: 'loss', label: 'Loss', align: 'right', isEditable: true, type: 'number', minWidth: '85px', textClass: 'text-rose-700 font-semibold' },
      { key: 'advance', label: 'Advance', align: 'right', isEditable: true, type: 'number', minWidth: '90px', textClass: 'text-amber-700 font-semibold' },
      {
        key: 'finalPayout',
        label: 'Final Payout',
        align: 'right',
        isFormula: true,
        minWidth: '120px',
        cellBg: 'bg-blue-50/25',
      },
      { key: 'paymentStatus', label: 'Payment Stauts', align: 'center', type: 'status', minWidth: '130px' },
      { key: 'ayushRemark', label: 'Ayush Remark', isEditable: true, type: 'text', minWidth: '140px', placeholder: 'Enter remark' },
    ];
  }, [companyFormat]);

  // Footer Summary Data
  const footerSummaryData = useMemo(() => {
    const totalDeliveries = displayedRows.reduce((sum, r) => {
      if (isDeliveredPickupFormat) return sum + (Number(r.delivered) || 0) + (Number(r.pickup) || 0);
      return sum + (Number(r.deliveredPickupTotal) || (Number(r.primary) || 0) + (Number(r.clubbed) || 0));
    }, 0);
    const totalDelivered = displayedRows.reduce((sum, r) => sum + (Number(r.delivered) || 0), 0);
    const totalPickup = displayedRows.reduce((sum, r) => sum + (Number(r.pickup) || 0), 0);
    const totalPrimary = displayedRows.reduce((sum, r) => sum + (Number(r.primary) || 0), 0);
    const totalClubbed = displayedRows.reduce((sum, r) => sum + (Number(r.clubbed) || 0), 0);
    const totalGrossPayout = displayedRows.reduce((sum, r) => sum + (Number(r.payout) || 0), 0);
    const totalLoss = displayedRows.reduce((sum, r) => sum + (Number(r.loss) || 0), 0);
    const totalAdvance = displayedRows.reduce((sum, r) => sum + (Number(r.advance) || 0), 0);
    const totalFinalPayout = displayedRows.reduce((sum, r) => sum + (Number(r.finalPayout) || 0), 0);
    const paidCount = displayedRows.filter((r) => (r.paymentStatus || '').toUpperCase() === 'PAID').length;
    const pendingCount = displayedRows.filter((r) => (r.paymentStatus || '').toUpperCase() === 'PENDING').length;

    return {
      riderCombined: `Total (${displayedRows.length} Riders)`,
      riderName: `Total (${displayedRows.length} Riders)`,
      riderId: '',
      delivered: totalDelivered,
      pickup: totalPickup,
      deliveredPickupTotal: totalDeliveries,
      primary: totalPrimary,
      clubbed: totalClubbed,
      rateCard: '-',
      payout: totalGrossPayout,
      loss: totalLoss,
      advance: totalAdvance,
      finalPayout: totalFinalPayout,
      paymentStatus: `${paidCount} Paid / ${pendingCount} Pend`,
      ayushRemark: '',
    };
  }, [displayedRows, isDeliveredPickupFormat]);

  return (
    <div className="h-full w-full flex flex-col min-h-0 gap-2">
      {/* Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 bg-white p-2 rounded-xl border border-gray-200/80 shadow-xs shrink-0">
        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search rider name, ID, remark..."
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

          {/* Export Dropdown (Excel .xlsx and CSV .csv) */}
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

          {/* Send Email Button */}
          <button
            type="button"
            onClick={openEmailModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all duration-200 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 shadow-2xs cursor-pointer shrink-0"
            title="Send Exported Payout Excel directly to Email"
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
            <span>Add Rider Row</span>
          </button>
        </div>
      </div>

      {/* Modern Data Table with Checkbox Selection and Protected Formulas */}
      <CommonTable
        columns={columns}
        data={displayedRows}
        onCellChange={handleCellChange}
        onDeleteRow={handleDeleteRow}
        canEdit={canEdit}
        showFooterSummary={true}
        footerSummaryData={footerSummaryData}
        enableSelection={true}
        selectedRowIds={selectedRowIds}
        onSelectRow={(id) => {
          setSelectedRowIds((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
          );
        }}
        onSelectAll={(newIds) => setSelectedRowIds(newIds)}
        onBulkDelete={handleTriggerBulkDelete}
        emptyMessage="No payout records found for the selected company and month"
      />

      {/* Send Email Modal */}
      {isEmailModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-rose-50/50 via-white to-gray-50/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100 shadow-2xs">
                  <Mail className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Send Payout Export via Email</h3>
                  <p className="text-[11px] text-gray-500">
                    Directly email the exported Excel report to any recipient
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsEmailModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="p-5 space-y-4">
              {/* Recipient Email */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Recipient Email *
                </label>
                <div className="relative">
                  <AtSign className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. vineetpancheshwar1611@gmail.com"
                    value={emailForm.toEmail}
                    onChange={(e) => setEmailForm({ ...emailForm, toEmail: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 font-medium transition-all"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">
                  Default recipient is <span className="font-semibold text-gray-700">vineetpancheshwar1611@gmail.com</span>, or change to any email address.
                </p>
              </div>

              {/* Subject Line */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Email Subject *
                </label>
                <div className="relative">
                  <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    placeholder="Email Subject"
                    value={emailForm.subject}
                    onChange={(e) => setEmailForm({ ...emailForm, subject: e.target.value })}
                    className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 font-semibold text-gray-800 transition-all"
                  />
                </div>
              </div>

              {/* Custom Message / Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Message / Notes (Optional)
                </label>
                <textarea
                  rows="2"
                  placeholder="Add any extra notes or message for the recipient..."
                  value={emailForm.customMessage}
                  onChange={(e) => setEmailForm({ ...emailForm, customMessage: e.target.value })}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 font-medium resize-none transition-all"
                />
              </div>

              {/* Attachment Preview Card */}
              <div className="bg-gray-50/80 border border-gray-200/80 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Company & Period:</span>
                  <span className="font-bold text-gray-900">
                    {currentCompany?.name || 'Company'} • {selectedMonthFilter} ({selectedFinancialYear || 'FY'})
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Records Included:</span>
                  <span className="font-bold text-gray-900">{displayedRows.length} Riders</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 font-medium">Net Final Payout:</span>
                  <span className="font-extrabold text-emerald-600">
                    {formatCurrency(footerSummaryData?.finalPayout || 0)}
                  </span>
                </div>
                <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-rose-700 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100">
                    <span>📎</span>
                    <span>Rider_Payouts_{(selectedMonthFilter || 'Month')}_{(currentCompany?.name || 'Company').replace(/\s+/g, '_')}.xlsx</span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600">Excel Attachment</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  disabled={isSendingEmail}
                  onClick={() => setIsEmailModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSendingEmail}
                  className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {isSendingEmail ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending Email...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>Send Mail Now</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Single Delete Modal */}
      <ConfirmationModal
        isOpen={!!rowToDelete}
        onClose={() => setRowToDelete(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Rider Record"
        message={`Are you sure you want to delete "${rowToDelete?.riderName || 'this rider'}"? This action cannot be undone.`}
        confirmLabel="Yes, Delete"
        variant="danger"
      />

      {/* Bulk Delete Modal */}
      <ConfirmationModal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onConfirm={handleConfirmBulkDelete}
        title="Bulk Delete Rider Records"
        message={`Are you sure you want to delete ${selectedRowIds.length} selected rider records? This will also remove any corresponding payment disbursements.`}
        confirmLabel={`Yes, Delete ${selectedRowIds.length} Records`}
        variant="danger"
      />
    </div>
  );
};
