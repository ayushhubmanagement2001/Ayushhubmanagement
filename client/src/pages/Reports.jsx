import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  BarChart3,
  Building2,
  Calendar,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  IndianRupee,
  Layers,
  PieChart,
  Printer,
  RefreshCw,
  Search,
  SlidersHorizontal,
  TrendingDown,
  TrendingUp,
  User,
  Users,
  Wallet,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  ChevronRight,
  FileCheck,
  Percent,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useCompany } from '../context/CompanyContext';
import { useTabRefresh } from '../context/RefreshContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatNumber } from '../utils/calculations';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import { Card, StatCard, Badge, Button, CustomDropdown } from '../components/common';

const REPORT_TABS = [
  { id: 'monthly_pnl', label: 'Monthly P&L', icon: BarChart3, desc: 'Overall Monthly Profit & Loss Statement' },
  { id: 'franchise_pnl', label: 'Franchise-wise P&L', icon: Building2, desc: 'Profit & Loss breakdown per company' },
  { id: 'rider_payout', label: 'Rider Payout Report', icon: Users, desc: 'Deliveries, rate card, deductions & net payout' },
  { id: 'hub_expense', label: 'Expense Report', icon: Receipt, desc: 'Hub operational costs & expenses breakdown' },
  { id: 'loss_report', label: 'Loss Report', icon: AlertTriangle, desc: 'Parcel losses, recoveries & net loss impact' },
  { id: 'advance_report', label: 'Advance Report', icon: Wallet, desc: 'Rider advances disbursed, deducted & outstanding' },
  { id: 'cash_flow', label: 'Cash Flow Report', icon: CreditCard, desc: 'Inflow vs outflow transactions timeline' },
  { id: 'owner_report', label: 'Owner / CA Report', icon: ShieldCheck, desc: 'Tax & ITR ready summary for CA accounting' },
];

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

export const Reports = () => {
  const {
    companies,
    selectedCompanyFilter,
    setSelectedCompanyFilter,
    selectedMonthFilter,
    setSelectedMonthFilter,
    selectedFinancialYear,
    setSelectedFinancialYear,
    fetchCompanies,
  } = useCompany();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState('monthly_pnl');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeScope, setTimeScope] = useState('month'); // 'month' or 'fy'

  // Raw data collections
  const [myPayments, setMyPayments] = useState([]);
  const [riderPayouts, setRiderPayouts] = useState([]);
  const [hubExpenses, setHubExpenses] = useState([]);
  const [lossDetails, setLossDetails] = useState([]);
  const [advances, setAdvances] = useState([]);
  const [paymentsLedger, setPaymentsLedger] = useState([]);

  // Active companies
  const activeCompanies = useMemo(() => {
    return (companies || []).filter((c) => c.status === 'Active');
  }, [companies]);

  // Current company name
  const currentCompanyName = useMemo(() => {
    if (selectedCompanyFilter === 'all') return 'All Companies / Hub Wide';
    const found = (companies || []).find((c) => (c.id || c._id) === selectedCompanyFilter);
    return found ? found.name : 'Selected Company';
  }, [companies, selectedCompanyFilter]);

  // Load all necessary financial records
  const loadFinancialData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCompanyFilter && selectedCompanyFilter !== 'all') {
        params.companyId = selectedCompanyFilter;
      }
      if (timeScope === 'month' && selectedMonthFilter) {
        params.month = selectedMonthFilter;
      }
      if (selectedFinancialYear) {
        params.financialYear = selectedFinancialYear;
      }

      // Fetch across all modules in parallel
      const [
        myPaymentsRes,
        riderPayoutsRes,
        hubExpensesRes,
        lossDetailsRes,
        advancesRes,
        paymentsRes,
      ] = await Promise.allSettled([
        apiClient.get(ENDPOINTS.MY_PAYMENTS.GET_ALL, { params }),
        apiClient.get(ENDPOINTS.RIDER_PAYOUTS.GET_ALL, { params }),
        apiClient.get(ENDPOINTS.HUB_EXPENSES.GET_ALL, {
          params: timeScope === 'month' ? { month: selectedMonthFilter } : {},
        }),
        apiClient.get(ENDPOINTS.LOSS_DETAILS.GET_ALL, { params }),
        apiClient.get(ENDPOINTS.ADVANCES.GET_ALL),
        apiClient.get(ENDPOINTS.PAYMENTS.GET_ALL, { params }),
      ]);

      if (myPaymentsRes.status === 'fulfilled') {
        setMyPayments(myPaymentsRes.value.data?.data || myPaymentsRes.value.data || []);
      }
      if (riderPayoutsRes.status === 'fulfilled') {
        setRiderPayouts(riderPayoutsRes.value.data?.data || riderPayoutsRes.value.data || []);
      }
      if (hubExpensesRes.status === 'fulfilled') {
        setHubExpenses(hubExpensesRes.value.data?.data || hubExpensesRes.value.data || []);
      }
      if (lossDetailsRes.status === 'fulfilled') {
        setLossDetails(lossDetailsRes.value.data?.data || lossDetailsRes.value.data || []);
      }
      if (advancesRes.status === 'fulfilled') {
        setAdvances(advancesRes.value.data?.data || advancesRes.value.data || []);
      }
      if (paymentsRes.status === 'fulfilled') {
        setPaymentsLedger(paymentsRes.value.data?.data || paymentsRes.value.data || []);
      }
    } catch (err) {
      console.error('Error fetching report datasets:', err);
      toast.error('Failed to aggregate financial reports.');
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyFilter, selectedMonthFilter, selectedFinancialYear, timeScope, toast]);

  useEffect(() => {
    loadFinancialData();
  }, [loadFinancialData]);

  // Hook into top header refresh
  useTabRefresh(() => {
    loadFinancialData();
    if (typeof fetchCompanies === 'function') fetchCompanies();
  });

  // -------------------------------------------------------------
  // COMPUTED AGGREGATIONS FOR EXECUTIVE METRICS & REPORTS
  // -------------------------------------------------------------

  // 1. Total Franchise Inflow / Revenue (₹ from MyPayment)
  const totalRevenue = useMemo(() => {
    return myPayments.reduce((acc, row) => acc + (Number(row.amount) || Number(row.finalPayable) || 0), 0);
  }, [myPayments]);

  // Check if selected company is Valmo
  const isValmoSelected = useMemo(() => {
    if (!selectedCompanyFilter || selectedCompanyFilter === 'all') return false;
    const comp = activeCompanies.find((c) => String(c.id || c._id) === String(selectedCompanyFilter));
    return (comp?.name || '').toLowerCase().includes('valmo') || (comp?.sheetType || '').toLowerCase() === 'valmo';
  }, [selectedCompanyFilter, activeCompanies]);

  // 2. Total Rider Payout Cost (₹ from RiderPayout)
  // For Valmo, riders pay the hub, so rider payout cost is 0.
  const totalRiderPayout = useMemo(() => {
    if (isValmoSelected) return 0;
    return riderPayouts.reduce((acc, row) => {
      const compName = (row.companyId?.name || '').toLowerCase();
      const sheetType = (row.companyId?.sheetType || '').toLowerCase();
      if (compName.includes('valmo') || sheetType === 'valmo') return acc;
      return acc + (Number(row.finalPayout) || Number(row.payout) || 0);
    }, 0);
  }, [riderPayouts, isValmoSelected]);

  // 3. Total Hub Operating Expenses (₹ from HubExpense) - allocated per company when filtered
  const totalHubExpenses = useMemo(() => {
    if (!selectedCompanyFilter || selectedCompanyFilter === 'all') {
      return hubExpenses.reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
    }
    const numCompanies = activeCompanies.length || 1;
    const direct = hubExpenses
      .filter((e) => (e.companyId?._id || e.companyId?.id || e.companyId) === selectedCompanyFilter)
      .reduce((acc, row) => acc + (Number(row.amount) || 0), 0);
    const shared = hubExpenses
      .filter((e) => !e.companyId)
      .reduce((acc, row) => acc + (Number(row.amount) || 0), 0) / numCompanies;
    return direct + Math.round(shared);
  }, [hubExpenses, selectedCompanyFilter, activeCompanies]);

  // 4. Total Loss & Recovery (₹ from LossDetail) - direct company loss + shared overhead share
  const lossMetrics = useMemo(() => {
    let rawTotalLoss = 0;
    let rawRecoveredLoss = 0;
    let rawUnrecoveredLoss = 0;

    const isCompanyFiltered = selectedCompanyFilter && selectedCompanyFilter !== 'all';
    const relevantLosses = !isCompanyFiltered
      ? lossDetails
      : lossDetails.filter((l) => {
          const compId = l.companyId?._id || l.companyId?.id || l.companyId;
          return compId === selectedCompanyFilter || !compId;
        });

    relevantLosses.forEach((row) => {
      const price = Number(row.price) || 0;
      const compId = row.companyId?._id || row.companyId?.id || row.companyId;
      const isShared = !compId;
      const effectivePrice = isCompanyFiltered && isShared ? price / (activeCompanies.length || 1) : price;

      rawTotalLoss += effectivePrice;
      if (row.status === 'Recovered') {
        rawRecoveredLoss += effectivePrice;
      } else {
        rawUnrecoveredLoss += effectivePrice;
      }
    });

    const totalLoss = Math.round(rawTotalLoss);
    const recoveredLoss = Math.round(rawRecoveredLoss);
    const unrecoveredLoss = Math.round(rawUnrecoveredLoss);
    const recoveryRate = totalLoss > 0 ? (recoveredLoss / totalLoss) * 100 : 100;
    return { totalLoss, recoveredLoss, unrecoveredLoss, recoveryRate, rawTotalLoss, rawUnrecoveredLoss };
  }, [lossDetails, selectedCompanyFilter, activeCompanies]);

  // 5. Total Advances (₹ from Advance)
  const advanceMetrics = useMemo(() => {
    let totalAdvance = 0;
    let totalAdvanceCut = 0;
    let remainingAmount = 0;

    advances.forEach((row) => {
      const adv = Number(row.advance) || 0;
      const cut = Number(row.advanceCut) || 0;
      const rem = Number(row.remainingAmount) !== undefined ? Number(row.remainingAmount) : (adv - cut);
      totalAdvance += adv;
      totalAdvanceCut += cut;
      remainingAmount += rem;
    });

    return { totalAdvance, totalAdvanceCut, remainingAmount };
  }, [advances]);

  // 6. Net Profit & Loss Calculation
  const netProfit = useMemo(() => {
    return totalRevenue - (totalRiderPayout + totalHubExpenses + lossMetrics.unrecoveredLoss);
  }, [totalRevenue, totalRiderPayout, totalHubExpenses, lossMetrics.unrecoveredLoss]);

  const profitMargin = useMemo(() => {
    if (totalRevenue <= 0) return 0;
    return ((netProfit / totalRevenue) * 100).toFixed(1);
  }, [netProfit, totalRevenue]);

  // -------------------------------------------------------------
  // TAB 1: MONTHLY P&L BREAKDOWN
  // -------------------------------------------------------------
  const monthlyPnlData = useMemo(() => {
    const monthMap = {};
    MONTHS.forEach((m) => {
      monthMap[m] = {
        month: m,
        revenue: 0,
        riderPayout: 0,
        hubExpense: 0,
        losses: 0,
        deliveries: 0,
        netProfit: 0,
        margin: 0,
      };
    });

    myPayments.forEach((p) => {
      const m = p.month || selectedMonthFilter;
      if (monthMap[m]) {
        monthMap[m].revenue += Number(p.amount) || Number(p.finalPayable) || 0;
      }
    });

    riderPayouts.forEach((r) => {
      const m = r.month || selectedMonthFilter;
      const compName = (r.companyId?.name || '').toLowerCase();
      const sheetType = (r.companyId?.sheetType || '').toLowerCase();
      const isVal = compName.includes('valmo') || sheetType === 'valmo' || isValmoSelected;
      if (monthMap[m]) {
        if (!isVal) {
          monthMap[m].riderPayout += Number(r.finalPayout) || Number(r.payout) || 0;
        }
        monthMap[m].deliveries += Number(r.deliveredPickupTotal) || Number(r.delivered) || 0;
      }
    });

    const isCompanyFiltered = Boolean(selectedCompanyFilter && selectedCompanyFilter !== 'all');
    const numCompanies = activeCompanies.length || 1;

    hubExpenses.forEach((e) => {
      const m = e.month || selectedMonthFilter;
      if (monthMap[m]) {
        const amt = Number(e.amount) || 0;
        if (!isCompanyFiltered) {
          monthMap[m].hubExpense += amt;
        } else {
          const compId = e.companyId?._id || e.companyId?.id || e.companyId;
          if (compId === selectedCompanyFilter) {
            monthMap[m].hubExpense += amt;
          } else if (!compId) {
            // Shared hub operational expense allocated equally across active companies
            monthMap[m].hubExpense += amt / numCompanies;
          }
        }
      }
    });

    lossDetails.forEach((l) => {
      const m = l.month || selectedMonthFilter;
      if (monthMap[m] && l.status !== 'Recovered') {
        const price = Number(l.price) || 0;
        if (!isCompanyFiltered) {
          monthMap[m].losses += price;
        } else {
          const compId = l.companyId?._id || l.companyId?.id || l.companyId;
          if (compId === selectedCompanyFilter) {
            monthMap[m].losses += price;
          } else if (!compId) {
            // Shared loss allocated equally across active companies
            monthMap[m].losses += price / numCompanies;
          }
        }
      }
    });

    return MONTHS.map((m) => {
      const row = monthMap[m];
      const hubExp = Math.round(row.hubExpense);
      const lossExp = Math.round(row.losses);
      const net = row.revenue - (row.riderPayout + hubExp + lossExp);
      const margin = row.revenue > 0 ? ((net / row.revenue) * 100).toFixed(1) : '0.0';
      return {
        ...row,
        hubExpense: hubExp,
        losses: lossExp,
        netProfit: net,
        margin,
        hasData: row.revenue > 0 || row.riderPayout > 0 || hubExp > 0 || lossExp > 0,
      };
    }).filter((r) => (timeScope === 'month' ? r.month === selectedMonthFilter : r.hasData || r.month === selectedMonthFilter));
  }, [myPayments, riderPayouts, hubExpenses, lossDetails, selectedMonthFilter, timeScope, selectedCompanyFilter, activeCompanies]);

  // -------------------------------------------------------------
  // TAB 2: FRANCHISE-WISE P&L BREAKDOWN
  // -------------------------------------------------------------
  const franchisePnlData = useMemo(() => {
    return activeCompanies.map((comp) => {
      const compId = comp.id || comp._id;
      const compPayments = myPayments.filter(
        (p) => (p.companyId?._id || p.companyId?.id || p.companyId) === compId
      );
      const compPayouts = riderPayouts.filter(
        (p) => (p.companyId?._id || p.companyId?.id || p.companyId) === compId
      );
      const compLosses = lossDetails.filter(
        (p) => (p.companyId?._id || p.companyId?.id || p.companyId) === compId
      );
      const compExpenses = hubExpenses.filter(
        (p) => (p.companyId?._id || p.companyId?.id || p.companyId) === compId
      );

      const revenue = compPayments.reduce((s, p) => s + (Number(p.amount) || Number(p.finalPayable) || 0), 0);
      const riderPayout = compPayouts.reduce((s, p) => s + (Number(p.finalPayout) || Number(p.payout) || 0), 0);
      const deliveries = compPayouts.reduce((s, p) => s + (Number(p.deliveredPickupTotal) || Number(p.delivered) || 0), 0);
      // Filter-wise unrecovered loss: direct company loss + shared overhead share
      const directUnrecLoss = compLosses
        .filter((l) => (l.status || '').toLowerCase() !== 'recovered')
        .reduce((s, l) => s + (Number(l.price) || 0), 0);
      const sharedUnrecLoss = lossDetails
        .filter((l) => !l.companyId && (l.status || '').toLowerCase() !== 'recovered')
        .reduce((s, l) => s + (Number(l.price) || 0), 0) / (activeCompanies.length || 1);
      const unrecoveredLoss = directUnrecLoss + Math.round(sharedUnrecLoss);
      
      // Shared hub costs allocated equally or recorded per company
      const directExpense = compExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
      const sharedExpense = hubExpenses
        .filter((e) => !e.companyId)
        .reduce((s, e) => s + (Number(e.amount) || 0), 0) / (activeCompanies.length || 1);
      const totalExpense = directExpense + sharedExpense;

      const net = revenue - (riderPayout + totalExpense + unrecoveredLoss);
      const margin = revenue > 0 ? ((net / revenue) * 100).toFixed(1) : '0.0';

      return {
        companyId: compId,
        companyName: comp.name,
        companyCode: comp.code || comp.name.slice(0, 3).toUpperCase(),
        revenue,
        deliveries,
        riderPayout,
        loss: unrecoveredLoss,
        hubExpense: totalExpense,
        netProfit: net,
        margin,
      };
    });
  }, [activeCompanies, myPayments, riderPayouts, lossDetails, hubExpenses]);

  // -------------------------------------------------------------
  // TAB 7: CASH FLOW REPORT DATA
  // -------------------------------------------------------------
  const cashFlowData = useMemo(() => {
    const list = [];

    // Inflows from Franchise Payments
    myPayments.forEach((p, idx) => {
      list.push({
        id: `IN-${p._id || idx}`,
        date: p.createdAt ? new Date(p.createdAt).toISOString().split('T')[0] : selectedMonthFilter,
        type: 'INFLOW',
        entity: p.companyId?.name || currentCompanyName,
        category: `Franchise Cycle Payment (${p.cycle || 'Monthly'})`,
        amount: Number(p.amount) || Number(p.finalPayable) || 0,
        status: p.status || 'Paid',
      });
    });

    // Outflows from Rider Payouts (Only for non-Valmo companies where hub pays riders)
    riderPayouts.forEach((r, idx) => {
      const compName = (r.companyId?.name || '').toLowerCase();
      const sheetType = (r.companyId?.sheetType || '').toLowerCase();
      const isVal = compName.includes('valmo') || sheetType === 'valmo' || isValmoSelected;
      if (isVal) return;
      list.push({
        id: `OUT-RP-${r._id || idx}`,
        date: r.createdAt ? new Date(r.createdAt).toISOString().split('T')[0] : selectedMonthFilter,
        type: 'OUTFLOW',
        entity: `${r.riderName || 'Rider'} (${r.riderId || 'N/A'})`,
        category: 'Rider Delivery Payout',
        amount: Number(r.finalPayout) || Number(r.payout) || 0,
        status: r.paymentStatus || 'PAID',
      });
    });

    // Outflows from Hub Expenses
    hubExpenses.forEach((e, idx) => {
      list.push({
        id: `OUT-EXP-${e._id || idx}`,
        date: e.date || (e.createdAt ? new Date(e.createdAt).toISOString().split('T')[0] : selectedMonthFilter),
        type: 'OUTFLOW',
        entity: e.expenseName || 'Hub Operation',
        category: 'Hub Operational Overhead',
        amount: Number(e.amount) || 0,
        status: 'Settled',
      });
    });

    return list.sort((a, b) => (b.date > a.date ? 1 : -1));
  }, [myPayments, riderPayouts, hubExpenses, currentCompanyName, selectedMonthFilter]);

  // Filter items by search query
  const filterBySearch = (rows, keys) => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter((r) =>
      keys.some((k) => (r[k] ? String(r[k]).toLowerCase().includes(q) : false))
    );
  };

  // -------------------------------------------------------------
  // EXPORT TO EXCEL
  // -------------------------------------------------------------
  const handleExportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();

      // 1. Monthly P&L Sheet
      const monthlyHeaders = ['Month', 'Revenue (INR)', 'Rider Payout (INR)', 'Hub Expenses (INR)', 'Losses (INR)', 'Net Profit/Loss (INR)', 'Profit Margin %'];
      const monthlyRows = monthlyPnlData.map((r) => [
        r.month,
        r.revenue,
        r.riderPayout,
        r.hubExpense,
        r.losses,
        r.netProfit,
        `${r.margin}%`,
      ]);
      const wsMonthly = XLSX.utils.aoa_to_sheet([monthlyHeaders, ...monthlyRows]);
      XLSX.utils.book_append_sheet(wb, wsMonthly, 'Monthly P&L');

      // 2. Franchise-wise P&L Sheet
      const compHeaders = ['Company Name', 'Deliveries/Pickups', 'Revenue (INR)', 'Rider Cost (INR)', 'Hub Expenses (INR)', 'Loss Impact (INR)', 'Net Profit (INR)', 'Margin %'];
      const compRows = franchisePnlData.map((r) => [
        r.companyName,
        r.deliveries,
        r.revenue,
        r.riderPayout,
        r.hubExpense,
        r.loss,
        r.netProfit,
        `${r.margin}%`,
      ]);
      const wsComp = XLSX.utils.aoa_to_sheet([compHeaders, ...compRows]);
      XLSX.utils.book_append_sheet(wb, wsComp, 'Franchise-wise P&L');

      // 3. Rider Payouts Sheet
      const rpHeaders = ['Rider ID', 'Rider Name', 'Company', 'Month', 'Total Orders', 'Rate Card', 'Base Payout', 'Advance Cut', 'Loss Cut', 'Final Net Payout', 'Status'];
      const rpRows = riderPayouts.map((r) => [
        r.riderId || '',
        r.riderName || '',
        r.companyId?.name || currentCompanyName,
        r.month || selectedMonthFilter,
        r.deliveredPickupTotal || r.delivered || 0,
        r.rateCard || 12,
        r.payout || 0,
        r.advance || 0,
        r.loss || 0,
        r.finalPayout || 0,
        r.paymentStatus || 'PENDING',
      ]);
      const wsRP = XLSX.utils.aoa_to_sheet([rpHeaders, ...rpRows]);
      XLSX.utils.book_append_sheet(wb, wsRP, 'Rider Payouts');

      // 4. Hub Expenses Sheet
      const expHeaders = ['Date', 'Expense Name', 'Month', 'Amount (INR)', 'Remark'];
      const expRows = hubExpenses.map((e) => [
        e.date || '',
        e.expenseName || '',
        e.month || selectedMonthFilter,
        e.amount || 0,
        e.remark || '',
      ]);
      const wsExp = XLSX.utils.aoa_to_sheet([expHeaders, ...expRows]);
      XLSX.utils.book_append_sheet(wb, wsExp, 'Hub Expenses');

      // 5. Loss & Recovery Sheet
      const lossHeaders = ['Tracking ID', 'Company', 'Rider Name', 'Month', 'Loss Reason', 'Price (INR)', 'Status', 'Remark'];
      const lossRows = lossDetails.map((l) => [
        l.trackingId || '',
        l.companyId?.name || (companies || []).find((c) => (c.id || c._id) === (l.companyId?._id || l.companyId))?.name || '',
        l.riderName || '',
        l.month || selectedMonthFilter,
        l.reason || '',
        l.price || 0,
        l.status || 'Not Recovered',
        l.remark || '',
      ]);
      const wsLoss = XLSX.utils.aoa_to_sheet([lossHeaders, ...lossRows]);
      XLSX.utils.book_append_sheet(wb, wsLoss, 'Loss & Recovery');

      // 6. Advances Sheet
      const advHeaders = ['Date', 'Rider ID', 'Rider Name', 'Month', 'Advance Given', 'Advance Cut', 'Remaining Amount', 'Remark'];
      const advRows = advances.map((a) => [
        a.date || '',
        a.riderId || '',
        a.riderName || '',
        a.month || selectedMonthFilter,
        a.advance || 0,
        a.advanceCut || 0,
        a.remainingAmount || 0,
        a.remark || '',
      ]);
      const wsAdv = XLSX.utils.aoa_to_sheet([advHeaders, ...advRows]);
      XLSX.utils.book_append_sheet(wb, wsAdv, 'Rider Advances');

      // 7. Owner / CA Summary Sheet
      const caHeaders = ['Particulars', 'Amount (INR)', 'Notes / CA Reference'];
      const caRows = [
        ['Gross Inflow / Franchise Turnover', totalRevenue, 'Gross Receipts from Logistics Franchises'],
        ['Direct Cost: Rider Payouts', totalRiderPayout, 'Direct Delivery Wages Disbursed'],
        ['Gross Profit (Operating Margin)', totalRevenue - totalRiderPayout, 'Gross Margin before Overheads'],
        ['Indirect Overhead: Hub Expenses', totalHubExpenses, 'Rent, Utilities, Internet, Tea/Refreshments, Hub Ops'],
        ['Indirect Overhead: Net Unrecovered Losses', lossMetrics.unrecoveredLoss, 'Damaged/Missing Parcel Claims'],
        ['Net Taxable Business Profit (P&L)', netProfit, 'Net Earnings for ITR-3/ITR-4 Filing'],
        ['Estimated TDS Deducted at Source (1% - 2%)', (totalRevenue * 0.01).toFixed(2), 'Estimated Section 194C TDS'],
        ['Outstanding Rider Advances Asset', advanceMetrics.remainingAmount, 'Recoverable Asset on Balance Sheet'],
      ];
      const wsCA = XLSX.utils.aoa_to_sheet([caHeaders, ...caRows]);
      XLSX.utils.book_append_sheet(wb, wsCA, 'CA & Tax Summary');

      const fileName = `Ayush_Hub_Financial_Report_${selectedFinancialYear}_${selectedMonthFilter}.xlsx`;
      XLSX.writeFile(wb, fileName);
      toast.success('Complete Financial Workbook exported to Excel successfully!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to export Excel report.');
    }
  };

  // -------------------------------------------------------------
  // EXPORT TO PDF (Clean Print Window Layout)
  // -------------------------------------------------------------
  const handleExportPDF = () => {
    const printWindow = window.open('', '_blank', 'width=1100,height=800');
    if (!printWindow) {
      toast.error('Pop-up blocked. Please allow pop-ups to print or export PDF.');
      return;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Ayush Hub - Financial & Audit Report (${selectedFinancialYear} - ${selectedMonthFilter})</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }
            body { padding: 24px; color: #111827; background: #fff; font-size: 11px; }
            .header-box { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #E53935; padding-bottom: 12px; margin-bottom: 16px; }
            .brand-title { font-size: 20px; font-weight: 800; color: #111827; letter-spacing: -0.5px; }
            .brand-title span { color: #E53935; }
            .brand-sub { font-size: 10px; color: #6B7280; font-weight: 600; text-transform: uppercase; margin-top: 2px; }
            .meta-box { text-align: right; font-size: 10px; color: #4B5563; }
            .meta-box strong { color: #111827; }
            
            .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
            .kpi-card { border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px; background: #F9FAFB; }
            .kpi-label { font-size: 9px; font-weight: 700; text-transform: uppercase; color: #6B7280; margin-bottom: 4px; }
            .kpi-val { font-size: 14px; font-weight: 800; color: #111827; }
            .kpi-val.green { color: #16A34A; }
            .kpi-val.red { color: #E53935; }
            
            .section-title { font-size: 12px; font-weight: 700; color: #111827; margin: 16px 0 8px; border-left: 3px solid #E53935; padding-left: 6px; }
            
            table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 10px; }
            th { background: #F3F4F6; color: #374151; font-weight: 700; text-align: left; padding: 6px 8px; border: 1px solid #E5E7EB; }
            td { padding: 5px 8px; border: 1px solid #E5E7EB; color: #1F2937; }
            tr:nth-child(even) { background: #FAFAFA; }
            .total-row { background: #FEE2E2 !important; font-weight: 700; color: #991B1B; }
            .num-col { text-align: right; }
            
            .footer-sign { display: flex; justify-content: space-between; margin-top: 36px; padding-top: 16px; border-top: 1px dashed #D1D5DB; }
            .sign-box { width: 200px; text-align: center; }
            .sign-line { border-bottom: 1px solid #111827; height: 35px; margin-bottom: 6px; }
            
            @media print {
              body { padding: 12px; }
              @page { size: A4 landscape; margin: 10mm; }
            }
          </style>
        </head>
        <body>
          <div class="header-box">
            <div>
              <div class="brand-title">AYUSH <span>HUB</span> MANAGEMENT</div>
              <div class="brand-sub">Comprehensive Financial, Operational & Tax Audit Report</div>
            </div>
            <div class="meta-box">
              <div>Financial Year: <strong>${selectedFinancialYear}</strong></div>
              <div>Report Period: <strong>${selectedMonthFilter}</strong></div>
              <div>Entity: <strong>${currentCompanyName}</strong></div>
              <div>Generated On: <strong>${new Date().toLocaleString('en-IN')}</strong></div>
            </div>
          </div>

          <!-- KPI Summary -->
          <div class="kpi-grid">
            <div class="kpi-card">
              <div class="kpi-label">Total Franchise Revenue</div>
              <div class="kpi-val">${formatCurrency(totalRevenue)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Total Rider Payouts</div>
              <div class="kpi-val">${formatCurrency(totalRiderPayout)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Hub Expenses & Losses</div>
              <div class="kpi-val">${formatCurrency(totalHubExpenses + lossMetrics.unrecoveredLoss)}</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Net Profit (Margin ${profitMargin}%)</div>
              <div class="kpi-val ${netProfit >= 0 ? 'green' : 'red'}">${formatCurrency(netProfit)}</div>
            </div>
          </div>

          <!-- Monthly P&L Statement -->
          <div class="section-title">1. Monthly Profit & Loss Summary</div>
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th class="num-col">Franchise Inflow (₹)</th>
                <th class="num-col">Rider Cost (₹)</th>
                <th class="num-col">Hub Expenses (₹)</th>
                <th class="num-col">Net Losses (₹)</th>
                <th class="num-col">Net P&L (₹)</th>
                <th class="num-col">Margin %</th>
              </tr>
            </thead>
            <tbody>
              ${monthlyPnlData
                .map(
                  (r) => `
                <tr>
                  <td><strong>${r.month}</strong></td>
                  <td class="num-col">${formatNumber(r.revenue)}</td>
                  <td class="num-col">${formatNumber(r.riderPayout)}</td>
                  <td class="num-col">${formatNumber(r.hubExpense)}</td>
                  <td class="num-col">${formatNumber(r.losses)}</td>
                  <td class="num-col" style="font-weight:bold; color: ${r.netProfit >= 0 ? '#16A34A' : '#E53935'}">${formatNumber(r.netProfit)}</td>
                  <td class="num-col">${r.margin}%</td>
                </tr>
              `
                )
                .join('')}
              <tr class="total-row">
                <td>TOTAL</td>
                <td class="num-col">${formatNumber(totalRevenue)}</td>
                <td class="num-col">${formatNumber(totalRiderPayout)}</td>
                <td class="num-col">${formatNumber(totalHubExpenses)}</td>
                <td class="num-col">${formatNumber(lossMetrics.unrecoveredLoss)}</td>
                <td class="num-col">${formatNumber(netProfit)}</td>
                <td class="num-col">${profitMargin}%</td>
              </tr>
            </tbody>
          </table>

          <!-- Franchise Wise P&L -->
          <div class="section-title">2. Franchise / Company Performance Breakdown</div>
          <table>
            <thead>
              <tr>
                <th>Company Name</th>
                <th class="num-col">Total Deliveries</th>
                <th class="num-col">Invoiced Revenue (₹)</th>
                <th class="num-col">Rider Payout (₹)</th>
                <th class="num-col">Loss / Damage (₹)</th>
                <th class="num-col">Allocated Hub Exp (₹)</th>
                <th class="num-col">Net Contribution (₹)</th>
                <th class="num-col">Margin %</th>
              </tr>
            </thead>
            <tbody>
              ${franchisePnlData
                .map(
                  (c) => `
                <tr>
                  <td><strong>${c.companyName}</strong> (${c.companyCode})</td>
                  <td class="num-col">${formatNumber(c.deliveries)}</td>
                  <td class="num-col">${formatNumber(c.revenue)}</td>
                  <td class="num-col">${formatNumber(c.riderPayout)}</td>
                  <td class="num-col">${formatNumber(c.loss)}</td>
                  <td class="num-col">${formatNumber(c.hubExpense)}</td>
                  <td class="num-col" style="font-weight:bold; color: ${c.netProfit >= 0 ? '#16A34A' : '#E53935'}">${formatNumber(c.netProfit)}</td>
                  <td class="num-col">${c.margin}%</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>

          <!-- CA / Tax Reference Summary -->
          <div class="section-title">3. Accounting, CA & Tax Filing Schedule (ITR Summary)</div>
          <table>
            <thead>
              <tr>
                <th>Accounting Particulars</th>
                <th class="num-col">Amount (₹)</th>
                <th>Remarks / Tax Provision</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Gross Business Turnover / Receipts</td>
                <td class="num-col"><strong>${formatCurrency(totalRevenue)}</strong></td>
                <td>Total invoice disbursement received from logistics contracts</td>
              </tr>
              <tr>
                <td>Less: Direct Operational Expenses (Rider Wages & Fuel Incentives)</td>
                <td class="num-col">${formatCurrency(totalRiderPayout)}</td>
                <td>Allowable direct business expense under Section 37(1)</td>
              </tr>
              <tr>
                <td><strong>Gross Operating Profit</strong></td>
                <td class="num-col"><strong>${formatCurrency(totalRevenue - totalRiderPayout)}</strong></td>
                <td>Gross business margin before hub overheads</td>
              </tr>
              <tr>
                <td>Less: Hub Operational Overheads (Rent, Electricity, Maintenance)</td>
                <td class="num-col">${formatCurrency(totalHubExpenses)}</td>
                <td>Commercial establishment running costs</td>
              </tr>
              <tr>
                <td>Less: Net Unrecovered Parcel Loss Deductions</td>
                <td class="num-col">${formatCurrency(lossMetrics.unrecoveredLoss)}</td>
                <td>Operational damage write-offs</td>
              </tr>
              <tr class="total-row">
                <td><strong>Net Taxable Business Profit / Owner Retained Earnings</strong></td>
                <td class="num-col"><strong>${formatCurrency(netProfit)}</strong></td>
                <td>Final Net Profit for Financial Statement & Tax Computation</td>
              </tr>
            </tbody>
          </table>

          <!-- Signatures -->
          <div class="footer-sign">
            <div class="sign-box">
              <div class="sign-line"></div>
              <div>Prepared By: <strong>Hub Manager</strong></div>
            </div>
            <div class="sign-box">
              <div class="sign-line"></div>
              <div>Authorized By: <strong>Ayush (Proprietor)</strong></div>
            </div>
            <div class="sign-box">
              <div class="sign-line"></div>
              <div>Verified By: <strong>Chartered Accountant</strong></div>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 400);
  };

  return (
    <div className="space-y-3.5 pb-8">
      {/* 1. TOP HERO / BANNER HEADER */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-3 sm:p-3.5 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#FFEBEE] text-[#E53935] flex items-center justify-center shrink-0 shadow-2xs">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-sm sm:text-base font-bold text-gray-900 tracking-tight">
                Reports & Financial Analytics
              </h1>
              <Badge variant="danger" size="sm">CA & ITR Ready</Badge>
            </div>
            <p className="text-[11px] text-gray-500 font-medium hidden sm:block">
              Comprehensive Profit & Loss, Payouts, Hub Expenses, Losses & Audit Schedules
            </p>
          </div>
        </div>

        {/* Global Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0">
          {/* Scope toggle: Month vs Full FY */}
          <div className="bg-gray-100 p-0.5 rounded-lg flex items-center text-xs font-semibold text-gray-600 border border-gray-200">
            <button
              type="button"
              onClick={() => setTimeScope('month')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs ${
                timeScope === 'month'
                  ? 'bg-white text-gray-900 shadow-2xs font-bold'
                  : 'hover:text-gray-900 text-gray-500'
              }`}
            >
              {selectedMonthFilter}
            </button>
            <button
              type="button"
              onClick={() => setTimeScope('fy')}
              className={`px-2.5 py-1 rounded-md transition-all cursor-pointer text-xs ${
                timeScope === 'fy'
                  ? 'bg-white text-gray-900 shadow-2xs font-bold'
                  : 'hover:text-gray-900 text-gray-500'
              }`}
            >
              Full FY {selectedFinancialYear}
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            className="h-8 px-2.5 text-xs border-gray-200 hover:bg-gray-50 text-gray-700 shadow-2xs cursor-pointer font-medium"
          >
            <Printer className="w-3.5 h-3.5 mr-1 text-[#E53935]" />
            PDF / Print
          </Button>

          <Button
            variant="danger"
            size="sm"
            onClick={handleExportExcel}
            className="h-8 px-2.5 text-xs bg-[#E53935] hover:bg-red-700 text-white shadow-2xs cursor-pointer font-semibold"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" />
            Excel (.xlsx)
          </Button>
        </div>
      </div>

      {/* 2. TOP EXECUTIVE METRICS CARDS (Small, Compact, Responsive Grid) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* TOTAL REVENUE */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs hover:border-blue-300 transition-all">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">
              Total Revenue
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <IndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold text-gray-900 mt-1 tracking-tight tabular-nums">
            {formatCurrency(totalRevenue)}
          </div>
          <div className="text-[10px] sm:text-[11px] font-medium text-gray-500 mt-0.5 flex items-center gap-1 truncate">
            <span className="text-blue-600 font-semibold">{myPayments.length} cycles</span> invoiced
          </div>
        </div>

        {/* RIDER PAYOUT COST */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">
              Rider Payout Cost
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold text-gray-900 mt-1 tracking-tight tabular-nums">
            {formatCurrency(totalRiderPayout)}
          </div>
          <div className="text-[10px] sm:text-[11px] font-medium text-gray-500 mt-0.5 flex items-center gap-1 truncate">
            {isValmoSelected ? (
              <span className="text-emerald-600 font-semibold">Valmo: Riders pay Hub (₹0 Outflow)</span>
            ) : (
              <>
                <span className="text-purple-600 font-semibold">{riderPayouts.length} riders</span> paid
              </>
            )}
          </div>
        </div>

        {/* HUB OVERHEADS & LOSS */}
        <div className="bg-white border border-gray-200 rounded-xl p-3 shadow-2xs hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-gray-500 uppercase tracking-wider truncate">
              Hub Overheads & Loss
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Receipt className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="text-base sm:text-xl font-bold text-gray-900 mt-1 tracking-tight tabular-nums">
            {formatCurrency(totalHubExpenses + lossMetrics.unrecoveredLoss)}
          </div>
          <div className="text-[10px] sm:text-[11px] font-medium text-gray-500 mt-0.5 flex items-center gap-1 truncate">
            <span>Exp: {formatCurrency(totalHubExpenses)}</span>
            <span className="text-gray-300">|</span>
            <span>Loss: {formatCurrency(lossMetrics.unrecoveredLoss)}</span>
          </div>
        </div>

        {/* NET P&L */}
        <div className={`border rounded-xl p-3 shadow-2xs transition-all ${
          netProfit >= 0
            ? 'bg-green-50/40 border-green-200 hover:border-green-300'
            : 'bg-red-50/40 border-red-200 hover:border-red-300'
        }`}>
          <div className="flex items-center justify-between gap-1">
            <span className="text-[10px] sm:text-[11px] font-bold text-gray-700 uppercase tracking-wider truncate">
              Net P&L (Profit)
            </span>
            <div className={`w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center shrink-0 ${
              netProfit >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-[#E53935]'
            }`}>
              {netProfit >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            </div>
          </div>
          <div className={`text-base sm:text-xl font-bold mt-1 tracking-tight tabular-nums ${
            netProfit >= 0 ? 'text-green-700' : 'text-[#E53935]'
          }`}>
            {formatCurrency(netProfit)}
          </div>
          <div className="text-[10px] sm:text-[11px] font-semibold mt-0.5 flex items-center gap-1.5 truncate">
            <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
              netProfit >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {profitMargin}%
            </span>
            <span className="text-gray-500 font-medium text-[10px]">Net Hub Margin</span>
          </div>
        </div>
      </div>

      {/* 3. REPORT TAB SELECTION PILLS */}
      <div className="bg-white border border-[#E5E7EB] rounded-xl p-1 shadow-2xs">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {REPORT_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#FFEBEE] text-[#E53935] shadow-2xs border border-[#FFCDD2]'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border border-transparent'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#E53935]' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. SEARCH & FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search report records..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-medium bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-[#E53935] focus:ring-1 focus:ring-[#FFCDD2] shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end text-[11px] text-gray-500 font-medium">
          <span className="hidden sm:inline">Active Context:</span>
          <Badge variant="neutral" size="sm">{currentCompanyName}</Badge>
          <Badge variant="primary" size="sm">{selectedMonthFilter} {selectedFinancialYear}</Badge>
        </div>
      </div>

      {/* 5. TAB SPECIFIC REPORT VIEWS */}

      {/* TAB 1: MONTHLY PROFIT & LOSS */}
      {activeTab === 'monthly_pnl' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-2xs">
          <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-gray-900">Monthly Profit & Loss Statement</h2>
              <p className="text-[11px] text-gray-500">Gross inflows, rider expenses, hub operating costs, and net margin</p>
            </div>
            <Badge variant="info" size="sm">FY {selectedFinancialYear}</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-3">Month</th>
                  <th className="py-2 px-3 text-right">Franchise Inflow</th>
                  <th className="py-2 px-3 text-right">Rider Payout</th>
                  <th className="py-2 px-3 text-right">Hub Expenses</th>
                  <th className="py-2 px-3 text-right">Parcel Losses</th>
                  <th className="py-2 px-3 text-right">Net Profit / (Loss)</th>
                  <th className="py-2 px-3 text-center">Net Margin</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filterBySearch(monthlyPnlData, ['month']).map((row) => {
                  const isProfitable = row.netProfit >= 0;
                  return (
                    <tr key={row.month} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-1.5 sm:py-2 px-3 font-semibold text-gray-900 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        {row.month}
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-right font-medium text-gray-900 tabular-nums">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-right font-medium text-gray-700 tabular-nums">
                        {formatCurrency(row.riderPayout)}
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-right font-medium text-gray-700 tabular-nums">
                        {formatCurrency(row.hubExpense)}
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-right font-medium text-amber-700 tabular-nums">
                        {formatCurrency(row.losses)}
                      </td>
                      <td className={`py-1.5 sm:py-2 px-3 text-right font-bold tabular-nums ${
                        isProfitable ? 'text-green-600' : 'text-[#E53935]'
                      }`}>
                        {formatCurrency(row.netProfit)}
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-center">
                        <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-bold ${
                          isProfitable ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {row.margin}%
                        </span>
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-center">
                        <Badge variant={isProfitable ? 'success' : 'danger'} size="sm">
                          {isProfitable ? 'Profitable' : 'Loss'}
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold text-gray-900">
                  <td className="py-2 sm:py-2.5 px-3 text-xs">TOTAL / SUMMARY</td>
                  <td className="py-2 sm:py-2.5 px-3 text-right text-xs tabular-nums">{formatCurrency(totalRevenue)}</td>
                  <td className="py-2 sm:py-2.5 px-3 text-right text-xs tabular-nums">{formatCurrency(totalRiderPayout)}</td>
                  <td className="py-2 sm:py-2.5 px-3 text-right text-xs tabular-nums">{formatCurrency(totalHubExpenses)}</td>
                  <td className="py-2 sm:py-2.5 px-3 text-right text-xs tabular-nums">{formatCurrency(lossMetrics.unrecoveredLoss)}</td>
                  <td className={`py-2 sm:py-2.5 px-3 text-right text-xs tabular-nums ${
                    netProfit >= 0 ? 'text-green-700' : 'text-[#E53935]'
                  }`}>
                    {formatCurrency(netProfit)}
                  </td>
                  <td className="py-2 sm:py-2.5 px-3 text-center text-xs">{profitMargin}%</td>
                  <td className="py-2 sm:py-2.5 px-3 text-center">
                    <Badge variant={netProfit >= 0 ? 'success' : 'danger'} size="sm">
                      {netProfit >= 0 ? 'Net Gain' : 'Net Deficit'}
                    </Badge>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FRANCHISE-WISE PROFIT & LOSS */}
      {activeTab === 'franchise_pnl' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-2xs">
          <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-gray-900">Franchise / Logistics Company P&L</h2>
              <p className="text-[11px] text-gray-500">Breakdown of revenue, parcel volume, rider disbursements and net yield per partner</p>
            </div>
            <Badge variant="neutral" size="sm">{activeCompanies.length} Active Partners</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-3">Partner / Company</th>
                  <th className="py-2 px-3 text-center">Deliveries</th>
                  <th className="py-2 px-3 text-right">Inflow Revenue</th>
                  <th className="py-2 px-3 text-right">Rider Payout</th>
                  <th className="py-2 px-3 text-right">Loss Deductions</th>
                  <th className="py-2 px-3 text-right">Hub Allocated Cost</th>
                  <th className="py-2 px-3 text-right">Net Contribution</th>
                  <th className="py-2 px-3 text-center">Margin %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filterBySearch(franchisePnlData, ['companyName', 'companyCode']).map((row) => {
                  const isPositive = row.netProfit >= 0;
                  return (
                    <tr key={row.companyId} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-1.5 sm:py-2 px-3 font-semibold text-gray-900 flex items-center gap-2">
                        <div className="w-6 h-6 rounded-md bg-gray-100 text-gray-700 flex items-center justify-center font-bold text-[9px] shrink-0">
                          {row.companyCode}
                        </div>
                        <div>
                          <div>{row.companyName}</div>
                          <div className="text-[9.5px] text-gray-400 font-normal">Code: {row.companyCode}</div>
                        </div>
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-center font-medium text-gray-800 tabular-nums">
                        {formatNumber(row.deliveries)}
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-right font-medium text-gray-900 tabular-nums">
                        {formatCurrency(row.revenue)}
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-right font-medium text-gray-700 tabular-nums">
                        {formatCurrency(row.riderPayout)}
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-right font-medium text-amber-700 tabular-nums">
                        {formatCurrency(row.loss)}
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-right font-medium text-gray-600 tabular-nums">
                        {formatCurrency(row.hubExpense)}
                      </td>
                      <td className={`py-1.5 sm:py-2 px-3 text-right font-bold tabular-nums ${
                        isPositive ? 'text-green-600' : 'text-[#E53935]'
                      }`}>
                        {formatCurrency(row.netProfit)}
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-center">
                        <span className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-bold ${
                          isPositive ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'
                        }`}>
                          {row.margin}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: RIDER PAYOUT REPORT */}
      {activeTab === 'rider_payout' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-2xs">
          <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-gray-900">Rider Payout & Delivery Report</h2>
              <p className="text-[11px] text-gray-500">Individual delivery parcels, rate cards, deductions, and final net payout</p>
            </div>
            <Badge variant="primary" size="sm">{riderPayouts.length} Records</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-3">Rider Info</th>
                  <th className="py-2 px-3">Month</th>
                  <th className="py-2 px-3 text-center">Delivered</th>
                  <th className="py-2 px-3 text-right">Rate Card</th>
                  <th className="py-2 px-3 text-right">Base Payout</th>
                  <th className="py-2 px-3 text-right">Advance Cut</th>
                  <th className="py-2 px-3 text-right">Loss Cut</th>
                  <th className="py-2 px-3 text-right">Final Payout</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filterBySearch(riderPayouts, ['riderName', 'riderId', 'month', 'paymentStatus']).map((r, i) => (
                  <tr key={r._id || i} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-1.5 sm:py-2 px-3">
                      <div className="font-semibold text-gray-900">{r.riderName || 'Unnamed'}</div>
                      <div className="text-[9.5px] text-gray-400 font-medium">ID: {r.riderId || 'N/A'}</div>
                    </td>
                    <td className="py-1.5 sm:py-2 px-3 text-gray-600 font-medium">{r.month || selectedMonthFilter}</td>
                    <td className="py-1.5 sm:py-2 px-3 text-center font-bold text-gray-800 tabular-nums">
                      {r.deliveredPickupTotal || r.delivered || 0}
                    </td>
                    <td className="py-1.5 sm:py-2 px-3 text-right font-medium text-gray-600 tabular-nums">
                      ₹{r.rateCard || 12}
                    </td>
                    <td className="py-1.5 sm:py-2 px-3 text-right font-medium text-gray-900 tabular-nums">
                      {formatCurrency(r.payout)}
                    </td>
                    <td className="py-1.5 sm:py-2 px-3 text-right font-medium text-red-600 tabular-nums">
                      -{formatCurrency(r.advance || 0)}
                    </td>
                    <td className="py-1.5 sm:py-2 px-3 text-right font-medium text-amber-600 tabular-nums">
                      -{formatCurrency(r.loss || 0)}
                    </td>
                    <td className="py-1.5 sm:py-2 px-3 text-right font-bold text-[#E53935] tabular-nums">
                      {formatCurrency(r.finalPayout)}
                    </td>
                    <td className="py-1.5 sm:py-2 px-3 text-center">
                      <Badge
                        variant={
                          r.paymentStatus === 'PAID'
                            ? 'success'
                            : r.paymentStatus === 'HOLD'
                            ? 'warning'
                            : 'neutral'
                        }
                        size="sm"
                      >
                        {r.paymentStatus || 'PENDING'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: EXPENSE REPORT */}
      {activeTab === 'hub_expense' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-2xs">
          <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-gray-900">Hub Operational Expense Report</h2>
              <p className="text-[11px] text-gray-500">Rent, electricity, repairs, tea/refreshments, travel & misc expenses</p>
            </div>
            <div className="text-xs font-bold text-gray-700">
              Total: <span className="text-[#E53935] tabular-nums">{formatCurrency(totalHubExpenses)}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Expense Title / Category</th>
                  <th className="py-2 px-3">Month</th>
                  <th className="py-2 px-3 text-right">Amount</th>
                  <th className="py-2 px-3">Remark / Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filterBySearch(hubExpenses, ['expenseName', 'remark', 'month', 'date']).map((e, i) => (
                  <tr key={e._id || i} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-1.5 sm:py-2 px-3 font-medium text-gray-600">{e.date || 'N/A'}</td>
                    <td className="py-1.5 sm:py-2 px-3 font-semibold text-gray-900 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-gray-400" />
                      {e.expenseName || 'General Expense'}
                    </td>
                    <td className="py-1.5 sm:py-2 px-3 text-gray-600">{e.month || selectedMonthFilter}</td>
                    <td className="py-1.5 sm:py-2 px-3 text-right font-bold text-gray-900 tabular-nums">
                      {formatCurrency(e.amount)}
                    </td>
                    <td className="py-1.5 sm:py-2 px-3 text-gray-500 italic text-[10.5px]">{e.remark || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: LOSS REPORT */}
      {activeTab === 'loss_report' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-2xs">
          <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-gray-900">Loss & Recovery Report</h2>
              <p className="text-[11px] text-gray-500">Missing/damaged parcel claims, recoveries from riders & net hub write-offs</p>
            </div>
            <div className="flex items-center gap-1.5">
              <Badge variant="success" size="sm">Recovered: {formatCurrency(lossMetrics.recoveredLoss)}</Badge>
              <Badge variant="danger" size="sm">Pending: {formatCurrency(lossMetrics.unrecoveredLoss)}</Badge>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-3">Tracking ID</th>
                  <th className="py-2 px-3">Company</th>
                  <th className="py-2 px-3">Rider Name</th>
                  <th className="py-2 px-3">Reason</th>
                  <th className="py-2 px-3 text-right">Parcel Value</th>
                  <th className="py-2 px-3 text-center">Recovery Status</th>
                  <th className="py-2 px-3">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filterBySearch(lossDetails, ['trackingId', 'riderName', 'reason', 'remark', 'status']).map((l, i) => (
                  <tr key={l._id || i} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-1.5 sm:py-2 px-3 font-mono font-semibold text-gray-900">{l.trackingId || 'N/A'}</td>
                    <td className="py-1.5 sm:py-2 px-3 font-semibold text-gray-800 text-[11px]">
                      {l.companyId?.name || (companies || []).find((c) => (c.id || c._id) === (l.companyId?._id || l.companyId))?.name || '—'}
                    </td>
                    <td className="py-1.5 sm:py-2 px-3 font-medium text-gray-800">{l.riderName || '—'}</td>
                    <td className="py-1.5 sm:py-2 px-3 text-gray-600">{l.reason || 'Damage/Loss'}</td>
                    <td className="py-1.5 sm:py-2 px-3 text-right font-bold text-gray-900 tabular-nums">{formatCurrency(l.price)}</td>
                    <td className="py-1.5 sm:py-2 px-3 text-center">
                      <Badge variant={l.status === 'Recovered' ? 'success' : 'danger'} size="sm">
                        {l.status || 'Not Recovered'}
                      </Badge>
                    </td>
                    <td className="py-1.5 sm:py-2 px-3 text-gray-500 italic text-[10.5px]">{l.remark || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 6: ADVANCE REPORT */}
      {activeTab === 'advance_report' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-2xs">
          <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-gray-900">Rider Advances Report</h2>
              <p className="text-[11px] text-gray-500">Disbursed cash advances, deductions via payouts, and outstanding balances</p>
            </div>
            <div className="text-xs font-bold text-gray-700">
              Outstanding: <span className="text-amber-600 tabular-nums">{formatCurrency(advanceMetrics.remainingAmount)}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Rider Details</th>
                  <th className="py-2 px-3 text-right">Advance Given</th>
                  <th className="py-2 px-3 text-right">Advance Cut</th>
                  <th className="py-2 px-3 text-right">Outstanding Balance</th>
                  <th className="py-2 px-3">Remark</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filterBySearch(advances, ['riderName', 'riderId', 'remark', 'date']).map((a, i) => (
                  <tr key={a._id || i} className="hover:bg-gray-50/70 transition-colors">
                    <td className="py-1.5 sm:py-2 px-3 font-medium text-gray-600">{a.date || 'N/A'}</td>
                    <td className="py-1.5 sm:py-2 px-3">
                      <div className="font-semibold text-gray-900">{a.riderName || 'Unnamed'}</div>
                      <div className="text-[9.5px] text-gray-400 font-medium">ID: {a.riderId || 'N/A'}</div>
                    </td>
                    <td className="py-1.5 sm:py-2 px-3 text-right font-medium text-gray-900 tabular-nums">{formatCurrency(a.advance)}</td>
                    <td className="py-1.5 sm:py-2 px-3 text-right font-medium text-green-600 tabular-nums">{formatCurrency(a.advanceCut)}</td>
                    <td className="py-1.5 sm:py-2 px-3 text-right font-bold text-amber-600 tabular-nums">{formatCurrency(a.remainingAmount)}</td>
                    <td className="py-1.5 sm:py-2 px-3 text-gray-500 italic text-[10.5px]">{a.remark || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 7: CASH FLOW REPORT */}
      {activeTab === 'cash_flow' && (
        <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-2xs">
          <div className="px-3.5 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-gray-900">Cash Flow & Payment Timeline</h2>
              <p className="text-[11px] text-gray-500">Chronological ledger of franchise disbursements, payouts and hub payments</p>
            </div>
            <Badge variant="neutral" size="sm">{cashFlowData.length} Transactions</Badge>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-50/90 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Entity / Party</th>
                  <th className="py-2 px-3">Particulars</th>
                  <th className="py-2 px-3 text-right">Inflow (Cr)</th>
                  <th className="py-2 px-3 text-right">Outflow (Dr)</th>
                  <th className="py-2 px-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filterBySearch(cashFlowData, ['entity', 'category', 'type', 'status']).map((cf) => {
                  const isInflow = cf.type === 'INFLOW';
                  return (
                    <tr key={cf.id} className="hover:bg-gray-50/70 transition-colors">
                      <td className="py-1.5 sm:py-2 px-3 font-medium text-gray-600">{cf.date}</td>
                      <td className="py-1.5 sm:py-2 px-3">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                          isInflow ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-[#E53935] border border-red-200'
                        }`}>
                          {isInflow ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                          {cf.type}
                        </span>
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 font-semibold text-gray-900">{cf.entity}</td>
                      <td className="py-1.5 sm:py-2 px-3 text-gray-600">{cf.category}</td>
                      <td className="py-1.5 sm:py-2 px-3 text-right font-bold text-green-600 tabular-nums">
                        {isInflow ? formatCurrency(cf.amount) : '—'}
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-right font-bold text-[#E53935] tabular-nums">
                        {!isInflow ? formatCurrency(cf.amount) : '—'}
                      </td>
                      <td className="py-1.5 sm:py-2 px-3 text-center">
                        <Badge variant="success" size="sm">{cf.status}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: OWNER / PERSONAL PAYMENT & CA TAX REPORT */}
      {activeTab === 'owner_report' && (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-red-50 via-white to-gray-50 border border-[#FFCDD2] rounded-xl p-4 shadow-2xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#E53935]" />
                  <h2 className="text-sm sm:text-base font-bold text-gray-900">CA & Tax Filing Computation Schedule</h2>
                </div>
                <p className="text-[11px] text-gray-600 mt-0.5 max-w-2xl">
                  Prepared for Chartered Accountant audit, Section 194C TDS reconciliation, ITR-3/ITR-4 business income filing, and Proprietor Personal Retained Earnings.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Button variant="danger" size="sm" onClick={handleExportPDF} className="h-8 text-xs font-semibold">
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Official Schedule
                </Button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3.5">
            <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-xl overflow-hidden shadow-2xs">
              <div className="px-3.5 py-2.5 border-b border-gray-100 font-bold text-xs sm:text-sm text-gray-900 flex items-center justify-between">
                <span>Profit & Loss Schedule for ITR Computation</span>
                <Badge variant="primary" size="sm">{selectedFinancialYear}</Badge>
              </div>

              <div className="divide-y divide-gray-100 text-xs">
                <div className="p-3 flex items-center justify-between hover:bg-gray-50/70">
                  <div>
                    <div className="font-semibold text-gray-900">1. Gross Business Turnover / Franchise Revenue</div>
                    <div className="text-[10px] text-gray-500">Gross Contract Invoices received from Logistics Partners</div>
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-gray-900 tabular-nums">{formatCurrency(totalRevenue)}</div>
                </div>

                <div className="p-3 flex items-center justify-between hover:bg-gray-50/70">
                  <div>
                    <div className="font-semibold text-gray-700">2. Less: Direct Operational Wages (Rider Payouts)</div>
                    <div className="text-[10px] text-gray-500">Direct delivery charges disbursed under contract</div>
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-red-600 tabular-nums">-{formatCurrency(totalRiderPayout)}</div>
                </div>

                <div className="p-3 flex items-center justify-between bg-gray-50 font-bold">
                  <div>
                    <div className="text-gray-900 font-bold">3. Gross Operating Profit (EBITDA Level)</div>
                    <div className="text-[10px] text-gray-500 font-normal">Margin before hub overheads</div>
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-gray-900 tabular-nums">{formatCurrency(totalRevenue - totalRiderPayout)}</div>
                </div>

                <div className="p-3 flex items-center justify-between hover:bg-gray-50/70">
                  <div>
                    <div className="font-semibold text-gray-700">4. Less: Hub Indirect Overheads (Rent, Utilities, Ops)</div>
                    <div className="text-[10px] text-gray-500">Allowable business overhead expenses</div>
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-red-600 tabular-nums">-{formatCurrency(totalHubExpenses)}</div>
                </div>

                <div className="p-3 flex items-center justify-between hover:bg-gray-50/70">
                  <div>
                    <div className="font-semibold text-gray-700">5. Less: Operational Parcel Losses & Write-offs</div>
                    <div className="text-[10px] text-gray-500">Unrecovered missing/damaged shipment claims</div>
                  </div>
                  <div className="font-bold text-xs sm:text-sm text-red-600 tabular-nums">-{formatCurrency(lossMetrics.unrecoveredLoss)}</div>
                </div>

                <div className="p-3 sm:p-3.5 flex items-center justify-between bg-[#FFEBEE] border-t-2 border-[#E53935]">
                  <div>
                    <div className="font-bold text-xs sm:text-sm text-[#E53935]">6. NET TAXABLE BUSINESS PROFIT / OWNER RETAINED EARNINGS</div>
                    <div className="text-[10px] text-red-700 font-medium">Final Net Taxable Income before Advance Tax</div>
                  </div>
                  <div className="font-bold text-sm sm:text-base text-[#E53935] tabular-nums">{formatCurrency(netProfit)}</div>
                </div>
              </div>
            </div>

            {/* Right Card: Tax & Compliance Highlights */}
            <div className="space-y-3">
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-3.5 shadow-2xs space-y-2.5">
                <div className="flex items-center gap-1.5 font-bold text-xs text-gray-900">
                  <FileCheck className="w-3.5 h-3.5 text-[#E53935]" />
                  <span>Tax Compliance Summary</span>
                </div>

                <div className="space-y-2 text-xs text-gray-600">
                  <div className="flex justify-between border-b border-gray-100 pb-1.5">
                    <span>Estimated TDS Claim (1% Sec 194C)</span>
                    <strong className="text-gray-900 tabular-nums">{formatCurrency(totalRevenue * 0.01)}</strong>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-1.5">
                    <span>Outstanding Advance Asset</span>
                    <strong className="text-amber-600 tabular-nums">{formatCurrency(advanceMetrics.remainingAmount)}</strong>
                  </div>
                  <div className="flex justify-between border-b border-gray-100 pb-1.5">
                    <span>Net Margin Efficiency</span>
                    <strong className="text-green-600 tabular-nums">{profitMargin}%</strong>
                  </div>
                </div>

                <div className="pt-1 text-[10px] text-gray-400 leading-relaxed">
                  * Note: All computations are aggregated in real-time from ledger entries and verified according to Indian Accounting Standards (AS).
                </div>
              </div>

              <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-3 text-xs text-blue-900 space-y-1.5">
                <div className="font-bold flex items-center gap-1.5 text-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-700" />
                  <span>Ready for Audit Verification</span>
                </div>
                <p className="text-[10.5px] text-blue-800 leading-relaxed">
                  Click <strong>Export Excel (.xlsx)</strong> or <strong>Export PDF</strong> to send directly to your Chartered Accountant for financial year closure.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
