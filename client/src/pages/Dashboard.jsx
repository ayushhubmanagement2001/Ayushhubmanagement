import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  IndianRupee,
  Users,
  Building2,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  AlertTriangle,
  ChevronRight,
  Bell,
  Check,
  CreditCard,
  CheckCircle2,
  RotateCw,
  Tag,
  Receipt,
  Plus,
  BarChart3,
  PieChart,
  Package,
} from 'lucide-react';
import { useCompany } from '../context/CompanyContext';
import { useTabRefresh } from '../context/RefreshContext';
import { useToast } from '../context/ToastContext';
import { formatCurrency, formatNumber, formatCompactNumber } from '../utils/calculations';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';

// Company matching helper - checks ObjectId or string ID
const isCompanyMatch = (recordComp, filterCompId) => {
  if (!filterCompId || filterCompId === 'all') return true;
  if (!recordComp) return false;
  const rawId = recordComp?._id || recordComp?.id || recordComp;
  return String(rawId).trim().toLowerCase() === String(filterCompId).trim().toLowerCase();
};

// Check if a company or ID corresponds to Valmo
export const isValmoCompany = (companyObjOrId, companiesList = []) => {
  if (!companyObjOrId) return false;
  if (typeof companyObjOrId === 'object') {
    const name = (companyObjOrId.name || '').toLowerCase();
    const sheetType = (companyObjOrId.sheetType || '').toLowerCase();
    if (name.includes('valmo') || sheetType === 'valmo') return true;
    const cid = companyObjOrId._id || companyObjOrId.id;
    if (cid && Array.isArray(companiesList) && companiesList.length > 0) {
      const match = companiesList.find((c) => String(c._id || c.id) === String(cid));
      if (match) {
        return (match.name || '').toLowerCase().includes('valmo') || (match.sheetType || '').toLowerCase() === 'valmo';
      }
    }
  }
  if (typeof companyObjOrId === 'string' && Array.isArray(companiesList) && companiesList.length > 0) {
    const match = companiesList.find((c) => String(c._id || c.id) === String(companyObjOrId));
    if (match) {
      return (match.name || '').toLowerCase().includes('valmo') || (match.sheetType || '').toLowerCase() === 'valmo';
    }
  }
  return false;
};

// Flexible cycle matching helper
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

export const Dashboard = () => {
  const navigate = useNavigate();
  const {
    companies,
    selectedCompanyFilter,
    selectedMonthFilter,
    selectedFinancialYear,
    selectedCycleFilter,
    fetchCompanies,
  } = useCompany();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState('');
  const [hoveredBarIndex, setHoveredBarIndex] = useState(null);
  const [hoveredCategory, setHoveredCategory] = useState(null);

  // Datasets from API
  const [myPayments, setMyPayments] = useState([]);
  const [riderPayouts, setRiderPayouts] = useState([]);
  const [hubExpenses, setHubExpenses] = useState([]);
  const [lossDetails, setLossDetails] = useState([]);
  const [advances, setAdvances] = useState([]);

  // Active companies
  const activeCompanies = useMemo(() => {
    return (companies || []).filter((c) => c.status === 'Active');
  }, [companies]);

  // Selected company object (if any)
  const isAllCompanies = !selectedCompanyFilter || selectedCompanyFilter === 'all';
  const isAllCycles = !selectedCycleFilter || selectedCycleFilter === 'all';
  const selectedCompany = useMemo(() => {
    if (isAllCompanies) return null;
    return (companies || []).find((c) => String(c.id || c._id) === String(selectedCompanyFilter)) || null;
  }, [companies, selectedCompanyFilter, isAllCompanies]);

  // Valmo check for currently selected filter
  const isValmoSelected = useMemo(() => {
    return isValmoCompany(selectedCompanyFilter, companies);
  }, [selectedCompanyFilter, companies]);

  // Helper to determine if a rider record belongs to Valmo
  const isValmoRiderRecord = useCallback(
    (r) => {
      if (!r) return false;
      return isValmoCompany(r.companyId, companies);
    },
    [companies]
  );

  // Load all dashboard financial datasets (month & financial year governed by global header)
  const loadDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const monthParams = (selectedMonthFilter && selectedMonthFilter !== 'all') ? { month: selectedMonthFilter } : {};
      const paymentParams = { ...monthParams };
      if (selectedFinancialYear && selectedFinancialYear !== 'all') {
        paymentParams.financialYear = selectedFinancialYear;
      }

      const [
        myPaymentsRes,
        riderPayoutsRes,
        hubExpensesRes,
        lossDetailsRes,
        advancesRes,
      ] = await Promise.allSettled([
        apiClient.get(ENDPOINTS.MY_PAYMENTS.GET_ALL, { params: paymentParams }),
        apiClient.get(ENDPOINTS.RIDER_PAYOUTS.GET_ALL, { params: monthParams }),
        apiClient.get(ENDPOINTS.HUB_EXPENSES.GET_ALL, { params: monthParams }),
        apiClient.get(ENDPOINTS.LOSS_DETAILS.GET_ALL, { params: paymentParams }),
        apiClient.get(ENDPOINTS.ADVANCES.GET_ALL),
      ]);

      const extractList = (res) => {
        if (res.status !== 'fulfilled') return [];
        const val = res.value;
        if (Array.isArray(val)) return val;
        if (Array.isArray(val?.data)) return val.data;
        if (Array.isArray(val?.data?.data)) return val.data.data;
        return [];
      };

      setMyPayments(extractList(myPaymentsRes));
      setRiderPayouts(extractList(riderPayoutsRes));
      setHubExpenses(extractList(hubExpensesRes));
      setLossDetails(extractList(lossDetailsRes));
      setAdvances(extractList(advancesRes));

      const now = new Date();
      setLastUpdatedTime(
        `${now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, ${now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
      );
    } catch (err) {
      console.error('[Dashboard Data Load Error]:', err);
      toast.error('Failed to refresh dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedMonthFilter, selectedFinancialYear, toast]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  useTabRefresh(() => {
    loadDashboardData();
    if (typeof fetchCompanies === 'function') fetchCompanies();
  });

  // -------------------------------------------------------------
  // FILTERED DATASETS ACCORDING TO HEADER FILTERS
  // -------------------------------------------------------------
  // Filtered Franchise Payments (MyPayment collection)
  const filteredPayments = useMemo(() => {
    return myPayments.filter((p) => {
      const matchComp = isAllCompanies || isCompanyMatch(p.companyId, selectedCompanyFilter);
      const matchCycle = isAllCycles || isCycleMatch(p.cycle, selectedCycleFilter);
      return matchComp && matchCycle;
    });
  }, [myPayments, selectedCompanyFilter, isAllCompanies, selectedCycleFilter, isAllCycles]);

  // Filtered Rider Payouts
  const filteredRiderPayouts = useMemo(() => {
    return riderPayouts.filter((r) => {
      return isAllCompanies || isCompanyMatch(r.companyId, selectedCompanyFilter);
    });
  }, [riderPayouts, selectedCompanyFilter, isAllCompanies]);

  // Raw Total Loss across the entire hub
  const rawTotalLoss = useMemo(() => {
    return lossDetails.reduce((s, l) => s + (Number(l.price) || 0), 0);
  }, [lossDetails]);

  const rawTotalUnrecoveredLoss = useMemo(() => {
    return lossDetails
      .filter((l) => (l.status || '').toLowerCase() !== 'recovered')
      .reduce((s, l) => s + (Number(l.price) || 0), 0);
  }, [lossDetails]);

  const rawTotalRecoveredLoss = useMemo(() => {
    return lossDetails
      .filter((l) => (l.status || '').toLowerCase() === 'recovered')
      .reduce((s, l) => s + (Number(l.price) || 0), 0);
  }, [lossDetails]);

  // Filtered Loss Details (Direct company losses or shared losses without companyId)
  const filteredLossDetails = useMemo(() => {
    if (isAllCompanies) return lossDetails;
    return lossDetails.filter((l) => {
      return !l.companyId || isCompanyMatch(l.companyId, selectedCompanyFilter);
    });
  }, [lossDetails, selectedCompanyFilter, isAllCompanies]);

  // Raw Total Hub Expenses across the entire hub
  const rawTotalHubExpenses = useMemo(() => {
    return hubExpenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  }, [hubExpenses]);

  // Filtered Hub Expenses (Company direct expenses or shared overheads)
  const filteredHubExpenses = useMemo(() => {
    if (isAllCompanies) return hubExpenses;
    return hubExpenses.filter((e) => {
      return !e.companyId || isCompanyMatch(e.companyId, selectedCompanyFilter);
    });
  }, [hubExpenses, selectedCompanyFilter, isAllCompanies]);

  // Filtered Advances
  const filteredAdvances = useMemo(() => {
    if (isAllCompanies) return advances;
    return advances.filter((a) => {
      return !a.companyId || isCompanyMatch(a.companyId, selectedCompanyFilter);
    });
  }, [advances, selectedCompanyFilter, isAllCompanies]);

  // -------------------------------------------------------------
  // COMPUTED TOP METRICS (100% REAL FROM DATABASE, ZERO DUMMY DATA)
  // -------------------------------------------------------------
  // 1. Franchise Revenue Received (from MyPayment)
  const totalRevenue = useMemo(() => {
    return filteredPayments.reduce((s, p) => {
      const val = Number(p.amount) || Number(p.finalPayable) || 0;
      return s + val;
    }, 0);
  }, [filteredPayments]);

  // 2. Rider Payout Cost
  // VALMO BUSINESS RULE: In Valmo, riders pay money to the hub (hub does not disburse payout to riders).
  // Therefore, rider payout cost for Valmo is strictly 0 on the dashboard.
  const totalRiderPayout = useMemo(() => {
    if (isValmoSelected) return 0;
    return filteredRiderPayouts.reduce((s, r) => {
      if (isValmoRiderRecord(r)) return s; // Exclude Valmo riders from payout expense
      return s + (Number(r.finalPayout) || Number(r.payout) || 0);
    }, 0);
  }, [filteredRiderPayouts, isValmoSelected, isValmoRiderRecord]);

  // Amount collected from Valmo riders (riders pay the hub) - only counted when status is marked PAID
  const totalValmoRiderCollection = useMemo(() => {
    return filteredRiderPayouts.reduce((s, r) => {
      if (isValmoRiderRecord(r)) {
        const isPaid = (r.paymentStatus || r.status || '').toString().trim().toUpperCase() === 'PAID';
        if (isPaid) {
          return s + (Number(r.finalPayout) || Number(r.payout) || 0);
        }
      }
      return s;
    }, 0);
  }, [filteredRiderPayouts, isValmoRiderRecord]);

  // Total Money In = Franchise Revenue + Valmo Rider Collection (riders pay the hub in Valmo)
  const totalMoneyIn = useMemo(() => {
    return totalRevenue + totalValmoRiderCollection;
  }, [totalRevenue, totalValmoRiderCollection]);

  // 2b. Rate Card Average across filtered riders
  const avgRateCard = useMemo(() => {
    const ridersWithRate = filteredRiderPayouts.filter((r) => Number(r.rateCard) > 0);
    if (ridersWithRate.length === 0) return 0;
    const total = ridersWithRate.reduce((s, r) => s + Number(r.rateCard), 0);
    const avg = total / ridersWithRate.length;
    return Number(avg.toFixed(2));
  }, [filteredRiderPayouts]);

  const ridersWithRateCount = useMemo(() => {
    return filteredRiderPayouts.filter((r) => Number(r.rateCard) > 0).length;
  }, [filteredRiderPayouts]);

  // 3. Hub Expenses (office + operations)
  // When 'All' is selected, shows total hub expenses (₹5,000).
  // When a specific franchise is selected, shows proportional allocated share (e.g. 1,667 for Shadowfax).
  const totalHubExpenses = useMemo(() => {
    if (isAllCompanies) return rawTotalHubExpenses;
    const numCompanies = activeCompanies.length || 1;
    const directExp = hubExpenses
      .filter((e) => isCompanyMatch(e.companyId, selectedCompanyFilter))
      .reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const sharedExp = hubExpenses
      .filter((e) => !e.companyId)
      .reduce((s, e) => s + (Number(e.amount) || 0), 0) / numCompanies;
    return directExp + Math.round(sharedExp);
  }, [isAllCompanies, rawTotalHubExpenses, activeCompanies, hubExpenses, selectedCompanyFilter]);

  // 4. Losses & Deductions (Filter-wise: Direct company loss + proportional shared overhead share)
  const { totalLoss, unrecoveredLoss, recoveredLoss, hasSharedLoss } = useMemo(() => {
    if (isAllCompanies) {
      return {
        totalLoss: rawTotalLoss,
        unrecoveredLoss: rawTotalUnrecoveredLoss,
        recoveredLoss: rawTotalRecoveredLoss,
        hasSharedLoss: false,
      };
    }

    const numCompanies = activeCompanies.length || 1;
    const directLosses = lossDetails.filter((l) => isCompanyMatch(l.companyId, selectedCompanyFilter));
    const sharedLosses = lossDetails.filter((l) => !l.companyId);

    const directTot = directLosses.reduce((s, l) => s + (Number(l.price) || 0), 0);
    const directUnrec = directLosses
      .filter((l) => (l.status || '').toLowerCase() !== 'recovered')
      .reduce((s, l) => s + (Number(l.price) || 0), 0);
    const directRec = directLosses
      .filter((l) => (l.status || '').toLowerCase() === 'recovered')
      .reduce((s, l) => s + (Number(l.price) || 0), 0);

    const sharedTot = sharedLosses.reduce((s, l) => s + (Number(l.price) || 0), 0);
    const sharedUnrec = sharedLosses
      .filter((l) => (l.status || '').toLowerCase() !== 'recovered')
      .reduce((s, l) => s + (Number(l.price) || 0), 0);
    const sharedRec = sharedLosses
      .filter((l) => (l.status || '').toLowerCase() === 'recovered')
      .reduce((s, l) => s + (Number(l.price) || 0), 0);

    return {
      totalLoss: directTot + Math.round(sharedTot / numCompanies),
      unrecoveredLoss: directUnrec + Math.round(sharedUnrec / numCompanies),
      recoveredLoss: directRec + Math.round(sharedRec / numCompanies),
      hasSharedLoss: sharedTot > 0,
    };
  }, [
    isAllCompanies,
    rawTotalLoss,
    rawTotalUnrecoveredLoss,
    rawTotalRecoveredLoss,
    lossDetails,
    selectedCompanyFilter,
    activeCompanies,
  ]);

  // Raw Total Advances across the entire hub
  const rawTotalAdvanceGiven = useMemo(() => {
    return advances.reduce((s, a) => s + (Number(a.advance) || 0), 0);
  }, [advances]);

  const rawTotalAdvanceRecovered = useMemo(() => {
    return advances.reduce((s, a) => s + (Number(a.advanceCut) || 0), 0);
  }, [advances]);

  const rawTotalAdvanceOutstanding = useMemo(() => {
    return advances.reduce((s, a) => {
      const rem = Number(a.remainingAmount);
      if (!isNaN(rem) && rem !== undefined && rem !== null && rem > 0) return s + rem;
      const adv = Number(a.advance) || 0;
      const cut = Number(a.advanceCut) || 0;
      return s + Math.max(0, adv - cut);
    }, 0);
  }, [advances]);

  // 5. Advances
  // When 'All' is selected, shows total hub advances.
  // When a specific franchise is selected, shows proportional allocated share (divided across active companies, exactly like Hub Expenses and Loss).
  const totalAdvanceGiven = useMemo(() => {
    if (isAllCompanies) return rawTotalAdvanceGiven;
    const numCompanies = activeCompanies.length || 1;
    const directAdv = advances
      .filter((a) => isCompanyMatch(a.companyId, selectedCompanyFilter))
      .reduce((s, a) => s + (Number(a.advance) || 0), 0);
    const sharedAdv = advances
      .filter((a) => !a.companyId)
      .reduce((s, a) => s + (Number(a.advance) || 0), 0) / numCompanies;
    return directAdv + Math.round(sharedAdv);
  }, [isAllCompanies, rawTotalAdvanceGiven, activeCompanies, advances, selectedCompanyFilter]);

  const totalAdvanceRecovered = useMemo(() => {
    if (isAllCompanies) return rawTotalAdvanceRecovered;
    const numCompanies = activeCompanies.length || 1;
    const directCut = advances
      .filter((a) => isCompanyMatch(a.companyId, selectedCompanyFilter))
      .reduce((s, a) => s + (Number(a.advanceCut) || 0), 0);
    const sharedCut = advances
      .filter((a) => !a.companyId)
      .reduce((s, a) => s + (Number(a.advanceCut) || 0), 0) / numCompanies;
    return directCut + Math.round(sharedCut);
  }, [isAllCompanies, rawTotalAdvanceRecovered, activeCompanies, advances, selectedCompanyFilter]);

  const totalAdvanceOutstanding = useMemo(() => {
    if (isAllCompanies) return rawTotalAdvanceOutstanding;
    const numCompanies = activeCompanies.length || 1;
    return Math.round(rawTotalAdvanceOutstanding / numCompanies);
  }, [isAllCompanies, rawTotalAdvanceOutstanding, activeCompanies]);

  // 6. Net Business Profit = Revenue (including Valmo rider collection) - Rider Payout - Hub Expenses - Unrecovered Loss
  const netProfit = useMemo(() => {
    return totalMoneyIn - totalRiderPayout - totalHubExpenses - unrecoveredLoss;
  }, [totalMoneyIn, totalRiderPayout, totalHubExpenses, unrecoveredLoss]);

  // 7. Total Money Out = Rider Payout + Hub Expenses + Unrecovered Loss + Advances Given
  const totalMoneyOut = useMemo(() => {
    return totalRiderPayout + totalHubExpenses + unrecoveredLoss + totalAdvanceGiven;
  }, [totalRiderPayout, totalHubExpenses, unrecoveredLoss, totalAdvanceGiven]);

  // 8. Opening & Closing Balance
  const openingBalance = 0;
  const closingBalance = useMemo(() => {
    return openingBalance + totalMoneyIn - totalMoneyOut;
  }, [openingBalance, totalMoneyIn, totalMoneyOut]);

  // 9. Rider stats
  const riderStats = useMemo(() => {
    const total = filteredRiderPayouts.length;
    const paid = filteredRiderPayouts.filter((r) => (r.paymentStatus || '').toUpperCase() === 'PAID').length;
    const pending = total - paid;
    // For Valmo, hub does not owe payout to riders (hub payout cost is 0)
    const paidAmount = isValmoSelected
      ? 0
      : filteredRiderPayouts
        .filter((r) => (r.paymentStatus || '').toUpperCase() === 'PAID' && !isValmoRiderRecord(r))
        .reduce((s, r) => s + (Number(r.finalPayout) || Number(r.payout) || 0), 0);
    const pendingAmount = isValmoSelected
      ? 0
      : filteredRiderPayouts
        .filter((r) => (r.paymentStatus || '').toUpperCase() !== 'PAID' && !isValmoRiderRecord(r))
        .reduce((s, r) => s + (Number(r.finalPayout) || Number(r.payout) || 0), 0);
    return { total, paid, pending, paidAmount, pendingAmount };
  }, [filteredRiderPayouts, isValmoSelected, isValmoRiderRecord]);

  // 10. Advance stats
  const advanceStats = useMemo(() => {
    const total = filteredAdvances.length;
    const recovered = filteredAdvances.filter((a) => {
      const rem = Number(a.remainingAmount);
      const adv = Number(a.advance) || 0;
      const cut = Number(a.advanceCut) || 0;
      return rem === 0 || (adv > 0 && cut >= adv);
    }).length;
    const pending = total - recovered;
    return { total, recovered, pending };
  }, [filteredAdvances]);

  // 11. Loss stats
  const lossStats = useMemo(() => {
    const total = filteredLossDetails.length;
    const recovered = filteredLossDetails.filter((l) => (l.status || '').toLowerCase() === 'recovered').length;
    const pending = total - recovered;
    return { total, recovered, pending };
  }, [filteredLossDetails]);

  // -------------------------------------------------------------
  // MONEY IN BY COMPANY (Real Franchise Payments for selected period)
  // -------------------------------------------------------------
  const moneyInByCompany = useMemo(() => {
    const targetCompanies = isAllCompanies
      ? activeCompanies
      : activeCompanies.filter((c) => isCompanyMatch(c.id || c._id, selectedCompanyFilter));

    return targetCompanies.map((comp) => {
      const compId = comp.id || comp._id;
      const compPayments = myPayments.filter((p) => {
        const matchComp = isCompanyMatch(p.companyId, compId);
        const matchCycle = isAllCycles || isCycleMatch(p.cycle, selectedCycleFilter);
        return matchComp && matchCycle;
      });

      const amount = compPayments.reduce((s, p) => s + (Number(p.amount) || Number(p.finalPayable) || 0), 0);

      return {
        id: compId,
        name: comp.name,
        amount,
        isSelected: !isAllCompanies && isCompanyMatch(compId, selectedCompanyFilter),
      };
    });
  }, [activeCompanies, myPayments, isAllCompanies, selectedCompanyFilter, isAllCycles, selectedCycleFilter]);

  // -------------------------------------------------------------
  // FRANCHISE PERFORMANCE TABLE (Matrix by Company from Real DB Data)
  // -------------------------------------------------------------
  const franchisePerformance = useMemo(() => {
    const targetCompanies = isAllCompanies
      ? activeCompanies
      : activeCompanies.filter((c) => isCompanyMatch(c.id || c._id, selectedCompanyFilter));

    const numCompanies = activeCompanies.length || 1;

    return targetCompanies.map((comp, idx) => {
      const compId = comp.id || comp._id;

      // Real income from Franchise Payments (MyPayment)
      const compPayments = myPayments.filter((p) => {
        const matchComp = isCompanyMatch(p.companyId, compId);
        const matchCycle = isAllCycles || isCycleMatch(p.cycle, selectedCycleFilter);
        return matchComp && matchCycle;
      });
      const income = compPayments.reduce((s, p) => s + (Number(p.amount) || Number(p.finalPayable) || 0), 0);

      // Real rider payout (VALMO riders pay the hub, so payout is 0)
      const compRiders = riderPayouts.filter((p) => isCompanyMatch(p.companyId, compId));
      const isCompValmo = isValmoCompany(comp, activeCompanies);
      const payout = isCompValmo
        ? 0
        : compRiders.reduce((s, p) => s + (Number(p.finalPayout) || Number(p.payout) || 0), 0);

      // Valmo rider collection (money received from riders - only when status is marked PAID)
      const valmoCollection = isCompValmo
        ? compRiders.reduce((s, p) => {
          const isPaid = (p.paymentStatus || p.status || '').toString().trim().toUpperCase() === 'PAID';
          if (isPaid) {
            return s + (Number(p.finalPayout) || Number(p.payout) || 0);
          }
          return s;
        }, 0)
        : 0;

      // Real unrecovered loss (direct franchise loss + shared overhead share)
      const directLoss = lossDetails
        .filter((l) => isCompanyMatch(l.companyId, compId) && (l.status || '').toLowerCase() !== 'recovered')
        .reduce((s, l) => s + (Number(l.price) || 0), 0);

      const rawSharedLoss = lossDetails
        .filter((l) => !l.companyId && (l.status || '').toLowerCase() !== 'recovered')
        .reduce((s, l) => s + (Number(l.price) || 0), 0);

      let compSharedLoss = 0;
      if (isAllCompanies && idx === targetCompanies.length - 1) {
        // Last company takes remainder so sum is EXACTLY rawSharedLoss
        const baseShare = Math.round(rawSharedLoss / numCompanies);
        compSharedLoss = Math.max(0, rawSharedLoss - baseShare * (numCompanies - 1));
      } else {
        compSharedLoss = Math.round(rawSharedLoss / numCompanies);
      }

      const compLoss = directLoss + compSharedLoss;

      // Real hub expenses (direct + shared proportion with exact remainder balancing)
      const directExp = hubExpenses
        .filter((e) => isCompanyMatch(e.companyId, compId))
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);

      const rawSharedExpenses = hubExpenses
        .filter((e) => !e.companyId)
        .reduce((s, e) => s + (Number(e.amount) || 0), 0);

      let compSharedExp = 0;
      if (isAllCompanies && idx === targetCompanies.length - 1) {
        // Last company takes remainder so sum is EXACTLY rawSharedExpenses (e.g. 5,000 - 1,667*2 = 1,666)
        const baseShare = Math.round(rawSharedExpenses / numCompanies);
        compSharedExp = Math.max(0, rawSharedExpenses - baseShare * (numCompanies - 1));
      } else {
        compSharedExp = Math.round(rawSharedExpenses / numCompanies);
      }

      const hubExpense = directExp + compSharedExp;
      const otherExpense = 0;
      const myPayment = 0;
      const compNetProfit = income + valmoCollection - payout - hubExpense - compLoss;

      return {
        companyId: compId,
        name: comp.name,
        income,
        payout,
        valmoCollection,
        isValmo: isCompValmo,
        hubExpense,
        otherExpense,
        loss: compLoss,
        myPayment,
        netProfit: compNetProfit,
        isSelected: !isAllCompanies && isCompanyMatch(compId, selectedCompanyFilter),
      };
    });
  }, [activeCompanies, myPayments, riderPayouts, lossDetails, hubExpenses, isAllCompanies, selectedCompanyFilter, isAllCycles, selectedCycleFilter, rawTotalUnrecoveredLoss, rawTotalHubExpenses]);

  // Aggregate totals across all companies for the performance matrix table
  const allCompaniesTotals = useMemo(() => {
    const totals = franchisePerformance.reduce(
      (acc, f) => ({
        income: acc.income + f.income,
        payout: acc.payout + f.payout,
        valmoCollection: acc.valmoCollection + (f.valmoCollection || 0),
        hubExpense: acc.hubExpense + f.hubExpense,
        otherExpense: acc.otherExpense + f.otherExpense,
        loss: acc.loss + f.loss,
        myPayment: acc.myPayment + f.myPayment,
        netProfit: acc.netProfit + f.netProfit,
      }),
      { income: 0, payout: 0, valmoCollection: 0, hubExpense: 0, otherExpense: 0, loss: 0, myPayment: 0, netProfit: 0 }
    );

    if (isAllCompanies) {
      totals.hubExpense = rawTotalHubExpenses;
      totals.loss = rawTotalUnrecoveredLoss;
      totals.netProfit = totals.income + totals.valmoCollection - totals.payout - totals.hubExpense - totals.loss;
    }

    return totals;
  }, [franchisePerformance, isAllCompanies, rawTotalHubExpenses, rawTotalUnrecoveredLoss]);

  // -------------------------------------------------------------
  // REVENUE VS EXPENSE VS PROFIT CHART DATA
  // Includes all active franchises + grand "Total" pillar when in All Franchise mode
  // -------------------------------------------------------------
  const chartBarsData = useMemo(() => {
    const list = franchisePerformance.map((f) => ({
      ...f,
      incomeTotal: f.income + (f.valmoCollection || 0),
      expTotal: f.payout + f.hubExpense + (f.loss || 0),
    }));

    if (isAllCompanies && franchisePerformance.length > 0) {
      const totalExp = allCompaniesTotals.payout + allCompaniesTotals.hubExpense + (allCompaniesTotals.loss || 0);
      list.push({
        companyId: 'all-total',
        name: 'Total',
        isTotal: true,
        income: allCompaniesTotals.income + (allCompaniesTotals.valmoCollection || 0),
        incomeTotal: allCompaniesTotals.income + (allCompaniesTotals.valmoCollection || 0),
        payout: allCompaniesTotals.payout,
        hubExpense: allCompaniesTotals.hubExpense,
        loss: allCompaniesTotals.loss,
        netProfit: allCompaniesTotals.netProfit,
        expTotal: totalExp,
      });
    }

    return list;
  }, [franchisePerformance, isAllCompanies, allCompaniesTotals]);

  // -------------------------------------------------------------
  // DYNAMIC BAR CHART SCALING (Adaptive multi-tier scaling based on all plotted bars)
  // -------------------------------------------------------------
  const chartMaxVal = useMemo(() => {
    let max = 0;
    chartBarsData.forEach((f) => {
      const prof = Math.max(0, f.netProfit);
      max = Math.max(max, f.income, f.expTotal, prof);
    });
    if (max <= 0) return 1000;
    if (max <= 500) return 500;
    if (max <= 1000) return 1000;
    if (max <= 2500) return 2500;
    if (max <= 5000) return 5000;
    if (max <= 10000) return 10000;
    if (max <= 25000) return 25000;
    if (max <= 50000) return 50000;
    if (max <= 100000) return Math.ceil(max / 20000) * 20000;
    return Math.ceil(max / 50000) * 50000;
  }, [chartBarsData]);

  // -------------------------------------------------------------
  // DYNAMIC EXPENSE BREAKDOWN (From real Hub Expenses)
  // -------------------------------------------------------------
  const expenseCategories = useMemo(() => {
    if (filteredHubExpenses.length === 0) return [];

    const numCompanies = activeCompanies.length || 1;
    const catMap = {};
    filteredHubExpenses.forEach((e) => {
      const name = (e.expenseName || 'General').trim();
      const rawAmt = Number(e.amount) || 0;
      if (rawAmt <= 0) return;

      const amt = isAllCompanies ? rawAmt : (!e.companyId ? rawAmt / numCompanies : rawAmt);
      catMap[name] = (catMap[name] || 0) + amt;
    });

    const total = Object.values(catMap).reduce((s, v) => s + v, 0);
    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

    return Object.entries(catMap).map(([name, amount], idx) => {
      const percent = total > 0 ? Math.round((amount / total) * 100) : 0;
      return {
        name,
        color: colors[idx % colors.length],
        percent,
        amount: Math.round(amount),
      };
    });
  }, [filteredHubExpenses, isAllCompanies, activeCompanies]);

  const activeExpenseCategory = useMemo(() => {
    if (!hoveredCategory) return null;
    return expenseCategories.find((c) => c.name === hoveredCategory) || null;
  }, [hoveredCategory, expenseCategories]);

  // -------------------------------------------------------------
  // DYNAMIC SHIPMENT SUMMARY (From real Rider Payouts)
  // -------------------------------------------------------------
  const shipmentSummary = useMemo(() => {
    const targetCompanies = isAllCompanies
      ? activeCompanies
      : activeCompanies.filter((c) => isCompanyMatch(c.id || c._id, selectedCompanyFilter));

    const rows = targetCompanies.map((c) => {
      const compId = c.id || c._id;
      const compRiders = riderPayouts.filter((r) => isCompanyMatch(r.companyId, compId));

      const delivered = compRiders.reduce((s, r) => s + (Number(r.delivered) || 0), 0);
      const pickup = compRiders.reduce((s, r) => s + (Number(r.pickup) || 0), 0);
      const primary = compRiders.reduce((s, r) => s + (Number(r.primary) || 0), 0);
      const clubbed = compRiders.reduce((s, r) => s + (Number(r.clubbed) || 0), 0);
      const total = compRiders.reduce(
        (s, r) =>
          s +
          (Number(r.deliveredPickupTotal) ||
            (Number(r.delivered) || 0) +
            (Number(r.pickup) || 0) +
            (Number(r.primary) || 0) +
            (Number(r.clubbed) || 0)),
        0
      );

      return {
        id: compId,
        name: c.name,
        total,
        delivered: delivered || (primary + clubbed),
        rto: 0,
        oda: 0,
        pending: pickup,
      };
    });

    const totals = rows.reduce(
      (acc, r) => ({
        total: acc.total + r.total,
        delivered: acc.delivered + r.delivered,
        rto: acc.rto + r.rto,
        oda: acc.oda + r.oda,
        pending: acc.pending + r.pending,
      }),
      { total: 0, delivered: 0, rto: 0, oda: 0, pending: 0 }
    );

    return { rows, totals };
  }, [activeCompanies, riderPayouts, isAllCompanies, selectedCompanyFilter]);

  // -------------------------------------------------------------
  // ATTENTION REQUIRED ITEMS (3 Core Operational Alerts Only)
  // -------------------------------------------------------------
  const attentionItems = useMemo(() => {
    const items = [];
    if (!isValmoSelected && riderStats.pending > 0 && riderStats.pendingAmount > 0) {
      items.push({
        id: 'riders',
        icon: Users,
        iconColor: 'text-rose-500',
        title: `${riderStats.pending} Rider Payments Pending`,
        value: formatCurrency(riderStats.pendingAmount),
        path: '/payout-details',
      });
    }
    if (totalAdvanceOutstanding > 0) {
      items.push({
        id: 'advances',
        icon: Wallet,
        iconColor: 'text-amber-500',
        title: `${formatCurrency(totalAdvanceOutstanding)} Advance Outstanding`,
        value: `${advanceStats.pending} Riders`,
        path: '/advanced',
      });
    }
    if (unrecoveredLoss > 0) {
      items.push({
        id: 'losses',
        icon: AlertTriangle,
        iconColor: 'text-rose-500',
        title: `${formatCurrency(unrecoveredLoss)} Loss Recovery Pending`,
        value: `${lossStats.pending} Incident${lossStats.pending === 1 ? '' : 's'}`,
        path: '/loss-details',
      });
    }
    return items.slice(0, 3);
  }, [riderStats, totalAdvanceOutstanding, advanceStats, unrecoveredLoss, lossStats]);

  return (
    <div className="space-y-4 pb-8">
      {/* 1. TOP 5 EXECUTIVE KPI CARDS (Company-level high-density, crisp styling) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
        {/* Card 1: Franchise Revenue */}
        <div
          onClick={() => navigate('/my-payment')}
          className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-50 border border-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
            <IndianRupee className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate leading-tight">
              Franchise Revenue
            </div>
            <div className="text-lg font-bold text-gray-900 leading-tight mt-0.5 tracking-tight">
              {formatCurrency(totalMoneyIn)}
            </div>
            <div className="text-[10px] text-gray-400 truncate mt-0.5">
              {totalValmoRiderCollection > 0
                ? `${formatCurrency(totalRevenue)} + ${formatCurrency(totalValmoRiderCollection)} Riders`
                : filteredPayments.length > 0
                  ? `${filteredPayments.length} Payment Cycle${filteredPayments.length > 1 ? 's' : ''}`
                  : 'No payments recorded'}
            </div>
          </div>
        </div>

        {/* Card 2: Rider Payout */}
        <div
          onClick={() => navigate('/payout-details')}
          className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100/70 text-rose-500 flex items-center justify-center shrink-0">
            <Users className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate leading-tight flex items-center justify-between">
              <span>Rider Payout</span>
              {isValmoSelected && (
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-200/80 leading-none">
                  Riders Pay Hub
                </span>
              )}
            </div>
            <div className="text-lg font-bold text-gray-900 leading-tight mt-0.5 tracking-tight flex items-baseline gap-1.5">
              <span>{formatCurrency(totalRiderPayout)}</span>
              {isValmoSelected && totalValmoRiderCollection > 0 && (
                <span className="text-[11px] font-medium text-emerald-600">
                  (+{formatCurrency(totalValmoRiderCollection)} received)
                </span>
              )}
            </div>
            <div className="text-[10px] text-gray-400 truncate mt-0.5">
              {isValmoSelected
                ? `${riderStats.total} Riders Total • ${riderStats.paid} Paid (${riderStats.pending} Pending)`
                : `${riderStats.total} Riders Total (${riderStats.pending} Pending)`}
            </div>
          </div>
        </div>

        {/* Card 3: Hub Expenses */}
        <div
          onClick={() => navigate('/hub-expenses')}
          className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-100/70 text-amber-600 flex items-center justify-center shrink-0">
            <Building2 className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate leading-tight flex items-center justify-between">
              <span>Hub Expenses</span>
              {!isAllCompanies && (
                <span className="text-[9px] font-semibold text-amber-700 bg-amber-50 px-1 py-0.5 rounded border border-amber-200/70 leading-none">
                  Divided ({activeCompanies.length > 0 ? `1/${activeCompanies.length}` : 'Shared'})
                </span>
              )}
            </div>
            <div className="text-lg font-bold text-gray-900 leading-tight mt-0.5 tracking-tight">
              {formatCurrency(totalHubExpenses)}
            </div>
            <div className="text-[10px] text-gray-400 truncate mt-0.5">
              {isAllCompanies
                ? `${filteredHubExpenses.length} Expense Entries`
                : `Divided share (1/${activeCompanies.length || 1} of ${formatCurrency(rawTotalHubExpenses)})`}
            </div>
          </div>
        </div>

        {/* Card 4: Avg Rate Card */}
        <div
          onClick={() => navigate('/payout-details')}
          className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all cursor-pointer flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-100/70 text-purple-600 flex items-center justify-center shrink-0">
            <Tag className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate leading-tight">
              Avg Rate Card
            </div>
            <div className="text-lg font-bold text-purple-700 leading-tight mt-0.5 tracking-tight">
              ₹{avgRateCard > 0 ? (avgRateCard % 1 === 0 ? avgRateCard : avgRateCard.toFixed(1)) : '0'}
            </div>
            <div className="text-[10px] text-gray-400 truncate mt-0.5">
              {ridersWithRateCount > 0
                ? `Avg of ${ridersWithRateCount} Active Rider${ridersWithRateCount > 1 ? 's' : ''}`
                : 'No rate cards recorded'}
            </div>
          </div>
        </div>

        {/* Card 5: Net Profit */}
        <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-2xs hover:shadow-xs transition-all flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${netProfit >= 0
              ? 'bg-blue-50 border-blue-100/70 text-blue-600'
              : 'bg-rose-50 border-rose-100/70 text-rose-600'
              }`}
          >
            <TrendingUp className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider truncate leading-tight">
              Net Profit
            </div>
            <div
              className={`text-lg font-bold leading-tight mt-0.5 tracking-tight ${netProfit >= 0 ? 'text-blue-600' : 'text-rose-600'
                }`}
            >
              {formatCurrency(netProfit)}
            </div>
            <div className="text-[10px] text-gray-400 truncate mt-0.5">
              Rev - Payout - Hub - Loss
            </div>
          </div>
        </div>
      </div>

      {/* 3. ROW 2: MONEY FLOW (LEFT) & FRANCHISE PERFORMANCE (RIGHT) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5">
        {/* LEFT BLOCK: Money Flow (This Month) - 3 Columns inside */}
        <div className="xl:col-span-6 bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="text-xs font-bold text-gray-900 mb-2.5 flex items-center gap-1.5 flex-wrap">
              <span>Money Flow</span>
              <span className="text-gray-400 font-normal">({selectedMonthFilter})</span>
              {!isAllCycles && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {selectedCycleFilter}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* 1. Money In */}
              <div className="border border-emerald-100 rounded-lg p-2.5 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                    <div className="w-4.5 h-4.5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                      <ArrowUpRight className="w-3 h-3" />
                    </div>
                    <span>Money In</span>
                  </div>

                  <div className="mt-2 space-y-1 text-[10.5px]">
                    <div className="flex items-center justify-between font-bold text-gray-800 gap-1">
                      <span className="whitespace-nowrap">Franchise Payment</span>
                      <span className="whitespace-nowrap tabular-nums">{formatCurrency(totalRevenue)}</span>
                    </div>
                    {moneyInByCompany.map((c) => (
                      <div key={c.id} className="flex items-center justify-between text-gray-500 pl-2 gap-1 text-[10px]">
                        <span className="truncate">{c.name}</span>
                        <span className="whitespace-nowrap tabular-nums">{formatCurrency(c.amount)}</span>
                      </div>
                    ))}

                    {/* Valmo Rider Collection / Rider Received */}
                    {totalValmoRiderCollection > 0 && (
                      <div className="pt-1.5 mt-1 border-t border-emerald-100/70">
                        <div className="flex items-center justify-between font-bold text-gray-800 gap-1">
                          <span className="whitespace-nowrap">Rider Collection</span>
                          <span className="whitespace-nowrap tabular-nums text-emerald-700 font-bold">
                            {formatCurrency(totalValmoRiderCollection)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-gray-500 pl-2 gap-1 text-[10px]">
                          <span className="truncate">
                            {isValmoSelected ? 'VALMO (Riders pay hub)' : 'VALMO Riders'}
                          </span>
                          <span className="whitespace-nowrap tabular-nums">{formatCurrency(totalValmoRiderCollection)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-emerald-50">
                  <div className="bg-emerald-50 text-emerald-900 font-bold text-[11px] py-1 px-2 rounded-md flex items-center justify-between gap-1">
                    <span className="whitespace-nowrap">Total Money In</span>
                    <span className="whitespace-nowrap tabular-nums">{formatCurrency(totalMoneyIn)}</span>
                  </div>
                </div>
              </div>

              {/* 2. Money Out */}
              <div className="border border-rose-100 rounded-lg p-2.5 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-rose-800">
                    <div className="w-4.5 h-4.5 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center">
                      <ArrowDownRight className="w-3 h-3" />
                    </div>
                    <span>Money Out</span>
                  </div>

                  <div className="mt-2 space-y-1 text-[10.5px] text-gray-700">
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        Rider Payout
                        {isValmoSelected && (
                          <span className="text-[9px] text-emerald-600 font-medium">(Riders pay hub)</span>
                        )}
                      </span>
                      <strong className="text-gray-900 whitespace-nowrap tabular-nums">{formatCurrency(totalRiderPayout)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        Hub Expenses
                        {!isAllCompanies && (
                          <span className="text-[9px] text-amber-600 font-medium">(Div)</span>
                        )}
                      </span>
                      <strong className="text-gray-900 whitespace-nowrap tabular-nums">{formatCurrency(totalHubExpenses)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="flex items-center gap-1 whitespace-nowrap">
                        Rider Advances
                        {!isAllCompanies && (
                          <span className="text-[9px] text-amber-600 font-medium">(Div)</span>
                        )}
                      </span>
                      <strong className="text-gray-900 whitespace-nowrap tabular-nums">{formatCurrency(totalAdvanceGiven)}</strong>
                    </div>
                    <div
                      onClick={() => navigate('/loss-details')}
                      className="flex items-center justify-between gap-1 hover:bg-rose-50/70 p-1 -mx-1 rounded cursor-pointer transition-colors"
                      title="Click to view Loss & Recovery Details"
                    >
                      <div className="min-w-0">
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          Loss / Deduction
                          {!isAllCompanies && hasSharedLoss && (
                            <span className="text-[9px] text-amber-600 font-medium">(Div)</span>
                          )}
                        </span>
                        {recoveredLoss > 0 && (
                          <span className="text-[9px] text-emerald-600 font-semibold block leading-tight">
                            ({formatCurrency(recoveredLoss)} recovered)
                          </span>
                        )}
                      </div>
                      <strong className="text-gray-900 whitespace-nowrap tabular-nums">{formatCurrency(unrecoveredLoss)}</strong>
                    </div>
                  </div>
                </div>

                <div className="mt-2.5 pt-2 border-t border-rose-50">
                  <div className="bg-rose-50 text-rose-900 font-bold text-[11px] py-1 px-2 rounded-md flex items-center justify-between gap-1">
                    <span className="whitespace-nowrap">Total Money Out</span>
                    <span className="whitespace-nowrap tabular-nums">{formatCurrency(totalMoneyOut)}</span>
                  </div>
                </div>
              </div>

              {/* 3. Closing Balance */}
              <div className="border border-teal-100 rounded-lg p-2.5 bg-white flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800">
                    <div className="w-4.5 h-4.5 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center">
                      <CreditCard className="w-3 h-3" />
                    </div>
                    <span>Closing Balance</span>
                  </div>

                  <div className="text-lg font-bold text-gray-900 mt-1.5 tracking-tight">
                    {formatCurrency(closingBalance)}
                  </div>

                  <div className="mt-2 space-y-1 text-[10.5px] text-gray-600">
                    <div className="flex items-center justify-between gap-1">
                      <span className="whitespace-nowrap">Opening Balance</span>
                      <strong className="text-gray-900 whitespace-nowrap tabular-nums">{formatCurrency(openingBalance)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="whitespace-nowrap">Total In</span>
                      <strong className="text-gray-900 whitespace-nowrap tabular-nums">{formatCurrency(totalMoneyIn)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-1">
                      <span className="whitespace-nowrap">Total Out</span>
                      <strong className="text-gray-900 whitespace-nowrap tabular-nums">{formatCurrency(totalMoneyOut)}</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT BLOCK: Franchise Performance (Profit & Loss Table) */}
        <div className="xl:col-span-6 bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2.5">
            <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
              <span>Franchise Performance</span>
              <span className="text-gray-400 font-normal">(Profit & Loss)</span>
              {!isAllCycles && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
                  {selectedCycleFilter}
                </span>
              )}
            </div>
            <div className="bg-gray-100 px-2 py-0.5 rounded text-[10px] font-bold text-gray-600">
              Profit & Loss
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[10.5px]">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-bold text-[10px] uppercase tracking-wider">
                  <th className="py-1.5 px-2 whitespace-nowrap">Particular</th>
                  {franchisePerformance.map((f) => (
                    <th key={f.companyId} className="py-1.5 px-2 text-right whitespace-nowrap">
                      {f.name}
                    </th>
                  ))}
                  {isAllCompanies && <th className="py-1.5 px-2 text-right text-gray-900 whitespace-nowrap">Total</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="py-1.5 px-2 font-medium text-gray-700 whitespace-nowrap">Franchise Income</td>
                  {franchisePerformance.map((f) => (
                    <td key={f.companyId} className="py-1.5 px-2 text-right text-gray-900 whitespace-nowrap tabular-nums">
                      {formatCurrency(f.income + (f.valmoCollection || 0))}
                      {f.valmoCollection > 0 && (
                        <span className="block text-[9px] text-emerald-600 font-medium leading-none mt-0.5">
                          (+{formatCurrency(f.valmoCollection)} rider rec)
                        </span>
                      )}
                    </td>
                  ))}
                  {isAllCompanies && (
                    <td className="py-1.5 px-2 text-right font-bold text-gray-900 whitespace-nowrap tabular-nums">
                      {formatCurrency(allCompaniesTotals.income + (allCompaniesTotals.valmoCollection || 0))}
                    </td>
                  )}
                </tr>

                <tr>
                  <td className="py-1.5 px-2 font-medium text-gray-700 whitespace-nowrap">Rider Payout</td>
                  {franchisePerformance.map((f) => {
                    const isVal = isValmoCompany(f.companyId, activeCompanies) || (f.name || '').toLowerCase().includes('valmo');
                    return (
                      <td key={f.companyId} className="py-1.5 px-2 text-right text-gray-700 whitespace-nowrap tabular-nums">
                        {formatCurrency(f.payout)}
                        {isVal && (
                          <span className="block text-[9px] text-emerald-600 font-medium leading-none mt-0.5">
                            {f.valmoCollection > 0 ? `+${formatCurrency(f.valmoCollection)} received` : '(Rider pays)'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                  {isAllCompanies && (
                    <td className="py-1.5 px-2 text-right font-bold text-gray-800 whitespace-nowrap tabular-nums">
                      {formatCurrency(allCompaniesTotals.payout)}
                      {allCompaniesTotals.valmoCollection > 0 && (
                        <span className="block text-[9px] text-emerald-600 font-medium leading-none mt-0.5">
                          (+{formatCurrency(allCompaniesTotals.valmoCollection)} Valmo rec)
                        </span>
                      )}
                    </td>
                  )}
                </tr>

                <tr>
                  <td className="py-1.5 px-2 font-medium text-gray-700 whitespace-nowrap">Hub Expenses</td>
                  {franchisePerformance.map((f) => (
                    <td key={f.companyId} className="py-1.5 px-2 text-right text-gray-700 whitespace-nowrap tabular-nums">
                      {formatCurrency(f.hubExpense)}
                    </td>
                  ))}
                  {isAllCompanies && (
                    <td className="py-1.5 px-2 text-right font-bold text-gray-800 whitespace-nowrap tabular-nums">
                      {formatCurrency(allCompaniesTotals.hubExpense)}
                    </td>
                  )}
                </tr>

                <tr>
                  <td className="py-1.5 px-2 font-medium text-gray-700 whitespace-nowrap">Loss / Deduction</td>
                  {franchisePerformance.map((f) => (
                    <td key={f.companyId} className="py-1.5 px-2 text-right text-gray-700 whitespace-nowrap tabular-nums">
                      {formatCurrency(f.loss)}
                    </td>
                  ))}
                  {isAllCompanies && (
                    <td className="py-1.5 px-2 text-right font-bold text-gray-800 whitespace-nowrap tabular-nums">
                      {formatCurrency(allCompaniesTotals.loss)}
                    </td>
                  )}
                </tr>

                <tr className="bg-emerald-50/60 font-bold border-t border-emerald-200">
                  <td className="py-1.5 px-2 text-emerald-900 whitespace-nowrap">Net Profit</td>
                  {franchisePerformance.map((f) => (
                    <td
                      key={f.companyId}
                      className={`py-1.5 px-2 text-right font-bold whitespace-nowrap tabular-nums ${f.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}
                    >
                      {formatCurrency(f.netProfit)}
                    </td>
                  ))}
                  {isAllCompanies && (
                    <td
                      className={`py-1.5 px-2 text-right font-black whitespace-nowrap tabular-nums ${allCompaniesTotals.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}
                    >
                      {formatCurrency(allCompaniesTotals.netProfit)}
                    </td>
                  )}
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. ROW 3: CHARTS & SHIPMENT SUMMARY */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* 1. Bar Chart: Revenue vs Expense vs Profit */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <div>
                <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5 flex-wrap">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>
                    Revenue vs Expense vs Profit{' '}
                    {isAllCompanies && (
                      <span className="text-slate-500 font-semibold text-[11px]">(All Franchise)</span>
                    )}
                  </span>
                </div>
                <div className="text-[10px] text-gray-400 font-medium">
                  {selectedMonthFilter} {isAllCycles ? '' : `• ${selectedCycleFilter}`}
                </div>
              </div>
              <div className="flex items-center gap-2 text-[10px] font-bold">
                <span className="flex items-center gap-1 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Revenue
                </span>
                <span className="flex items-center gap-1 text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Expense
                </span>
                <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100/70">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Profit
                </span>
              </div>
            </div>

            {/* Bar Chart with interactive hover & guide grid */}
            <div className="h-48 flex items-end justify-between gap-2 pt-6 relative select-none">
              {/* Horizontal Grid Guide Lines */}
              <div className="absolute inset-x-0 bottom-6 top-6 flex flex-col justify-between pointer-events-none pl-12 pr-1 z-0">
                <div className="border-b border-dashed border-slate-100 w-full" />
                <div className="border-b border-dashed border-slate-100 w-full" />
                <div className="border-b border-dashed border-slate-100 w-full" />
                <div className="border-b border-dashed border-slate-100 w-full" />
                <div className="border-b border-slate-200/90 w-full" />
              </div>

              {/* Left Y-axis values */}
              <div className="flex flex-col justify-between h-36 text-[9px] text-gray-400 font-bold shrink-0 pr-1.5 pb-6 z-10 select-none">
                <span>{formatCurrency(chartMaxVal)}</span>
                <span>{formatCurrency(Math.round(chartMaxVal * 0.75))}</span>
                <span>{formatCurrency(Math.round(chartMaxVal * 0.5))}</span>
                <span>{formatCurrency(Math.round(chartMaxVal * 0.25))}</span>
                <span>₹0</span>
              </div>

              {/* Bars container */}
              <div className="flex-1 flex items-end justify-around h-36 border-b border-slate-200/90 pb-0.5 z-10">
                {chartBarsData.map((f, idx) => {
                  const isHovered = hoveredBarIndex === idx;
                  const isAnyHovered = hoveredBarIndex !== null;
                  const expTotal = f.expTotal;

                  // Compute bar heights with headroom for label on top (max 78%)
                  const maxBarPercent = 78;
                  const revH = f.income > 0 ? Math.max(6, Math.min(maxBarPercent, Math.round((f.income / chartMaxVal) * maxBarPercent))) : 0;
                  const expH = expTotal > 0 ? Math.max(6, Math.min(maxBarPercent, Math.round((expTotal / chartMaxVal) * maxBarPercent))) : 0;
                  const profVal = Math.max(0, f.netProfit);
                  const profH = profVal > 0 ? Math.max(6, Math.min(maxBarPercent, Math.round((profVal / chartMaxVal) * maxBarPercent))) : 0;

                  // Tooltip positioning to avoid clipping at ends
                  const tooltipPosClass = idx === chartBarsData.length - 1
                    ? 'right-0 -translate-x-1'
                    : idx === 0
                      ? 'left-0 translate-x-1'
                      : 'left-1/2 -translate-x-1/2';

                  const caretPosClass = idx === chartBarsData.length - 1
                    ? 'right-6'
                    : idx === 0
                      ? 'left-6'
                      : 'left-1/2 -translate-x-1/2';

                  return (
                    <div
                      key={f.companyId}
                      onMouseEnter={() => setHoveredBarIndex(idx)}
                      onMouseLeave={() => setHoveredBarIndex(null)}
                      className={`relative flex flex-col items-center justify-end h-full px-1.5 sm:px-2 py-1 rounded-xl transition-all duration-200 cursor-pointer ${isHovered ? 'bg-slate-100/90 shadow-2xs' : 'hover:bg-slate-50/70'
                        } ${isAnyHovered && !isHovered ? 'opacity-40' : 'opacity-100'}`}
                    >
                      {/* Floating Rich Tooltip */}
                      {isHovered && (
                        <div className={`absolute bottom-[104%] ${tooltipPosClass} z-50 bg-slate-900/95 backdrop-blur-md text-white rounded-xl p-3 shadow-2xl border border-slate-700/80 min-w-[210px] pointer-events-none animate-in fade-in zoom-in-95 duration-150`}>
                          <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-slate-800">
                            <span className="font-bold text-xs text-white tracking-wide">
                              {f.isTotal ? 'All Franchises Total' : f.name}
                            </span>
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                              {selectedMonthFilter || 'Overview'}
                            </span>
                          </div>

                          <div className="space-y-1.5 text-[11px]">
                            <div className="flex items-center justify-between text-slate-300">
                              <span className="flex items-center gap-1.5 font-medium">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                                Revenue:
                              </span>
                              <strong className="text-emerald-400 font-bold">{formatCurrency(f.income)}</strong>
                            </div>

                            <div className="flex items-center justify-between text-slate-300">
                              <span className="flex items-center gap-1.5 font-medium">
                                <span className="w-2 h-2 rounded-full bg-rose-400 shrink-0" />
                                Expense:
                              </span>
                              <strong className="text-rose-400 font-bold">{formatCurrency(expTotal)}</strong>
                            </div>

                            {/* Sub-breakdown for Expense */}
                            {(f.payout > 0 || f.hubExpense > 0 || f.loss > 0) && (
                              <div className="pl-3.5 pr-0.5 text-[10px] text-slate-400 space-y-0.5 pb-0.5">
                                <div className="flex justify-between">
                                  <span>• Rider Payout:</span>
                                  <span className="text-slate-300 font-medium">
                                    {!f.isTotal && (isValmoCompany(f.companyId, activeCompanies) || (f.name || '').toLowerCase().includes('valmo'))
                                      ? '₹0 (Riders pay hub)'
                                      : formatCurrency(f.payout)}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span>• Hub Expense:</span>
                                  <span className="text-slate-300 font-medium">{formatCurrency(f.hubExpense)}</span>
                                </div>
                                {f.loss > 0 && (
                                  <div className="flex justify-between">
                                    <span>• Loss / Deduction:</span>
                                    <span className="text-slate-300 font-medium">{formatCurrency(f.loss)}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            <div className="flex items-center justify-between pt-1.5 border-t border-slate-800">
                              <span className="flex items-center gap-1.5 font-bold text-slate-200">
                                <span className={`w-2 h-2 rounded-full shrink-0 ${f.netProfit >= 0 ? 'bg-blue-400' : 'bg-rose-500'}`} />
                                Net Profit:
                              </span>
                              <strong className={`font-black ${f.netProfit >= 0 ? 'text-blue-300' : 'text-rose-400'}`}>
                                {formatCurrency(f.netProfit)}
                              </strong>
                            </div>

                            {f.income > 0 && (
                              <div className="text-[10px] text-right font-medium text-slate-400 pt-0.5">
                                Margin: <span className={f.netProfit >= 0 ? 'text-emerald-300' : 'text-rose-400'}>{((f.netProfit / f.income) * 100).toFixed(1)}%</span>
                              </div>
                            )}
                          </div>

                          {/* Pointer caret */}
                          <div className={`absolute -bottom-1.5 ${caretPosClass} w-3 h-3 bg-slate-900 border-r border-b border-slate-700/80 rotate-45`} />
                        </div>
                      )}

                      {/* 3 Pillars (Revenue, Expense, Profit) */}
                      <div className="flex items-end gap-1 sm:gap-1.5 h-28 pb-0.5 relative z-10">
                        {/* Revenue Bar */}
                        <div className="flex flex-col items-center justify-end h-full w-3 sm:w-3.5">
                          {f.income > 0 && (
                            <span className="text-[7.5px] sm:text-[8px] font-extrabold text-slate-700 tracking-tighter mb-0.5 leading-none select-none tabular-nums whitespace-nowrap">
                              {formatCompactNumber(f.income)}
                            </span>
                          )}
                          {revH > 0 ? (
                            <div
                              style={{ height: `${revH}%` }}
                              className="w-full bg-gradient-to-t from-emerald-600 via-emerald-500 to-emerald-400 rounded-t-md shadow-[0_2px_8px_rgba(16,185,129,0.3)] transition-all duration-300 hover:brightness-110"
                            />
                          ) : (
                            <div className="w-full h-1 bg-slate-200 rounded-full" title="Revenue: ₹0" />
                          )}
                        </div>

                        {/* Expense Bar */}
                        <div className="flex flex-col items-center justify-end h-full w-3 sm:w-3.5">
                          {expTotal > 0 && (
                            <span className="text-[7.5px] sm:text-[8px] font-extrabold text-slate-700 tracking-tighter mb-0.5 leading-none select-none tabular-nums whitespace-nowrap">
                              {formatCompactNumber(expTotal)}
                            </span>
                          )}
                          {expH > 0 ? (
                            <div
                              style={{ height: `${expH}%` }}
                              className="w-full bg-gradient-to-t from-rose-600 via-rose-500 to-rose-400 rounded-t-md shadow-[0_2px_8px_rgba(244,63,94,0.3)] transition-all duration-300 hover:brightness-110"
                            />
                          ) : (
                            <div className="w-full h-1 bg-slate-200 rounded-full" title="Expense: ₹0" />
                          )}
                        </div>

                        {/* Profit Bar */}
                        <div className="flex flex-col items-center justify-end h-full w-3 sm:w-3.5">
                          {profVal > 0 ? (
                            <span className="text-[7.5px] sm:text-[8px] font-extrabold text-slate-700 tracking-tighter mb-0.5 leading-none select-none tabular-nums whitespace-nowrap">
                              {formatCompactNumber(profVal)}
                            </span>
                          ) : f.netProfit < 0 ? (
                            <span className="text-[7.5px] sm:text-[8px] font-extrabold text-rose-600 tracking-tighter mb-0.5 leading-none select-none tabular-nums whitespace-nowrap">
                              -{formatCompactNumber(Math.abs(f.netProfit))}
                            </span>
                          ) : null}
                          {profH > 0 ? (
                            <div
                              style={{ height: `${profH}%` }}
                              className="w-full bg-gradient-to-t from-blue-600 via-blue-500 to-indigo-400 rounded-t-md shadow-[0_2px_8px_rgba(59,130,246,0.3)] transition-all duration-300 hover:brightness-110"
                            />
                          ) : (
                            <div className="w-full h-1 bg-slate-200 rounded-full" title={`Profit: ${formatCurrency(f.netProfit)}`} />
                          )}
                        </div>
                      </div>

                      {/* Label */}
                      {f.isTotal ? (
                        <span className="text-[10px] font-black text-indigo-700 bg-indigo-50/90 px-1.5 py-0.5 rounded border border-indigo-100 truncate max-w-[85px] sm:max-w-[100px] text-center mt-1">
                          Total
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold text-gray-700 truncate max-w-[85px] sm:max-w-[100px] text-center mt-1 group-hover:text-indigo-600 transition-colors">
                          {f.name}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-gray-400">
            <span>Hover on any company to inspect live figures</span>
            <span className="font-semibold text-gray-500">
              {franchisePerformance.length} Franchises {isAllCompanies && franchisePerformance.length > 0 && '+ Total'}
            </span>
          </div>
        </div>

        {/* 2. Donut Chart: Expense Breakdown (Dynamic from Hub Expenses) */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between gap-1 mb-2">
              <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
                <PieChart className="w-3.5 h-3.5 text-amber-500" />
                <span>Expense Breakdown</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                {filteredHubExpenses.length} Entries {!isAllCompanies && '(Divided)'}
              </span>
            </div>

            <div className="flex items-center justify-between gap-3 pt-2">
              {/* Donut graphic with interactive hover highlight */}
              <div className="relative w-32 h-32 flex items-center justify-center shrink-0">
                <svg viewBox="0 0 36 36" className="w-full h-full transform -rotate-90">
                  <circle cx="18" cy="18" r="15.9155" fill="none" stroke="#f1f5f9" strokeWidth="4" />
                  {(() => {
                    let accumulated = 0;
                    return expenseCategories.map((c) => {
                      const offset = -accumulated;
                      accumulated += c.percent;
                      const isHovered = hoveredCategory === c.name;
                      return (
                        <circle
                          key={c.name}
                          cx="18"
                          cy="18"
                          r="15.9155"
                          fill="none"
                          stroke={c.color}
                          strokeWidth={isHovered ? 5.5 : 4}
                          strokeDasharray={`${c.percent} ${100 - c.percent}`}
                          strokeDashoffset={offset}
                          className="transition-all duration-200 cursor-pointer"
                          style={{
                            filter: isHovered ? `drop-shadow(0 0 4px ${c.color}aa)` : 'none',
                          }}
                          onMouseEnter={() => setHoveredCategory(c.name)}
                          onMouseLeave={() => setHoveredCategory(null)}
                        />
                      );
                    });
                  })()}
                </svg>

                {/* Center text showing active hovered category OR total */}
                <div className="absolute text-center max-w-[85px] pointer-events-none transition-all duration-200">
                  {activeExpenseCategory ? (
                    <div className="animate-in fade-in zoom-in-95 duration-150">
                      <div className="text-[9px] font-bold text-gray-400 truncate leading-tight">
                        {activeExpenseCategory.name}
                      </div>
                      <div
                        className="text-xs font-black leading-tight mt-0.5"
                        style={{ color: activeExpenseCategory.color }}
                      >
                        {formatCurrency(activeExpenseCategory.amount)}
                      </div>
                      <div className="text-[9px] font-bold text-gray-500 mt-0.5">
                        {activeExpenseCategory.percent}%
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="text-xs font-black text-gray-900 leading-tight">
                        {formatCurrency(totalHubExpenses)}
                      </div>
                      <div className="text-[9px] text-gray-400 font-medium mt-0.5 leading-tight">
                        {isAllCompanies ? 'Total Expense' : 'Allocated Share'}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Legend list */}
              <div className="space-y-1.5 text-[11px] flex-1 max-h-36 overflow-y-auto pr-0.5">
                {expenseCategories.length === 0 ? (
                  <div className="py-2 text-center flex flex-col items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-1.5">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="text-[11px] font-bold text-gray-600">No Expenses Recorded</div>
                    <div className="text-[10px] text-gray-400">Zero hub entries for this period</div>
                    <button
                      type="button"
                      onClick={() => navigate('/hub-expenses')}
                      className="mt-2 text-[10px] font-bold text-amber-600 hover:text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Expense
                    </button>
                  </div>
                ) : (
                  expenseCategories.map((c) => {
                    const isHovered = hoveredCategory === c.name;
                    return (
                      <div
                        key={c.name}
                        onMouseEnter={() => setHoveredCategory(c.name)}
                        onMouseLeave={() => setHoveredCategory(null)}
                        className={`flex items-center justify-between p-1.5 rounded-lg transition-all cursor-pointer ${isHovered ? 'bg-slate-100/90 shadow-2xs' : 'hover:bg-slate-50'
                          }`}
                      >
                        <span className="flex items-center gap-1.5 truncate max-w-[85px]">
                          <span
                            className="w-2 h-2 rounded-full shrink-0 transition-transform"
                            style={{
                              backgroundColor: c.color,
                              transform: isHovered ? 'scale(1.3)' : 'scale(1)',
                            }}
                          />
                          <span className={`truncate font-medium ${isHovered ? 'text-gray-900 font-bold' : 'text-gray-600'}`}>
                            {c.name}
                          </span>
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 ml-1">
                          <span className="text-[10px] font-semibold text-gray-400">{c.percent}%</span>
                          <strong className="text-gray-900 font-bold">{formatCurrency(c.amount)}</strong>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-gray-400">Hub & Operations</span>
            <button
              type="button"
              onClick={() => navigate('/hub-expenses')}
              className="text-amber-600 hover:underline font-bold cursor-pointer"
            >
              View Expenses →
            </button>
          </div>
        </div>

        {/* 3. Franchise-wise Shipment Summary Table */}
        <div className="lg:col-span-4 bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] flex flex-col">
          <div className="flex items-center justify-between pb-2.5 mb-2 border-b border-gray-100">
            <div className="text-xs font-bold text-gray-900 flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-blue-600" />
              <span>Franchise-wise Shipment Summary</span>
            </div>
            <button
              type="button"
              onClick={() => navigate('/payout-details')}
              className="text-[10px] font-bold text-blue-600 hover:underline flex items-center gap-0.5 cursor-pointer"
            >
              View All <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="pb-2">Franchise</th>
                  <th className="pb-2 text-right">Total</th>
                  <th className="pb-2 text-right">Delivered</th>
                  <th className="pb-2 text-right">Pending</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shipmentSummary.rows.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-2.5 font-bold text-gray-800 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      <span>{r.name}</span>
                    </td>
                    <td className="py-2.5 text-right font-semibold text-gray-700 tabular-nums">
                      {formatNumber(r.total)}
                    </td>
                    <td className="py-2.5 text-right font-bold text-emerald-600 tabular-nums">
                      {formatNumber(r.delivered)}
                    </td>
                    <td className={`py-2.5 text-right font-bold tabular-nums ${r.pending > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {formatNumber(r.pending)}
                    </td>
                  </tr>
                ))}
                {isAllCompanies && shipmentSummary.rows.length > 1 && (
                  <tr className="font-extrabold text-gray-900 border-t-2 border-gray-200 bg-slate-50/50">
                    <td className="py-2 font-bold">Total</td>
                    <td className="py-2 text-right tabular-nums">{formatNumber(shipmentSummary.totals.total)}</td>
                    <td className="py-2 text-right text-emerald-600 tabular-nums">{formatNumber(shipmentSummary.totals.delivered)}</td>
                    <td className="py-2 text-right text-amber-600 tabular-nums">{formatNumber(shipmentSummary.totals.pending)}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Quick Fulfillment Metric Bar */}
          {/* <div className="my-2.5 p-2.5 bg-slate-50/80 rounded-xl border border-slate-100/80">
            <div className="flex items-center justify-between text-[11px] mb-1.5">
              <span className="font-bold text-gray-700 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Delivery Fulfillment
              </span>
              <span className="font-black text-emerald-700 tabular-nums">
                {shipmentSummary.totals.total > 0
                  ? ((shipmentSummary.totals.delivered / shipmentSummary.totals.total) * 100).toFixed(1)
                  : '0.0'}%
              </span>
            </div>
            <div className="w-full bg-slate-200/70 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${
                    shipmentSummary.totals.total > 0
                      ? Math.min(100, Math.round((shipmentSummary.totals.delivered / shipmentSummary.totals.total) * 100))
                      : 0
                  }%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[9.5px] text-gray-400 mt-1 font-medium">
              <span>{formatNumber(shipmentSummary.totals.delivered)} Delivered</span>
              <span>{formatNumber(shipmentSummary.totals.pending)} Pending</span>
            </div>
          </div> */}

          <div className="mt-auto pt-2 border-t border-slate-100 flex items-center justify-between text-[10px]">
            <span className="text-gray-400">
              {shipmentSummary.rows.length} {shipmentSummary.rows.length === 1 ? 'Franchise' : 'Franchises'} Active
            </span>
            <button
              type="button"
              onClick={() => navigate('/payout-details')}
              className="text-blue-600 hover:underline font-bold cursor-pointer"
            >
              Payout Details →
            </button>
          </div>
        </div>
      </div>

      {/* 5. ROW 4: BOTTOM 4 SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Rider Payout Summary */}
        <div className="group relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-slate-600 to-indigo-600" />
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 leading-tight block">Rider Payout Summary</span>
                  <span className="text-[10px] text-slate-400 font-medium">Monthly Payout Breakdown</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/payout-details')}
                className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-100/80 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Total</div>
                <div className="text-xs font-black text-slate-900 mt-1">{formatCurrency(totalRiderPayout)}</div>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100/70 p-2.5 rounded-xl">
                <div className="text-[10px] text-emerald-600 font-medium">Paid</div>
                <div className="text-xs font-black text-emerald-700 mt-1">{formatCurrency(riderStats.paidAmount)}</div>
              </div>
              <div className="bg-rose-50/50 border border-rose-100/70 p-2.5 rounded-xl">
                <div className="text-[10px] text-rose-500 font-medium">Pending</div>
                <div className="text-xs font-black text-rose-600 mt-1">{formatCurrency(riderStats.pendingAmount)}</div>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500">
            {isValmoSelected ? (
              <span className="text-emerald-600 font-medium">
                ✨ Valmo Model: Riders pay hub {totalValmoRiderCollection > 0 ? `(${formatCurrency(totalValmoRiderCollection)} received)` : '• ₹0 Payout Outflow'}
              </span>
            ) : (
              <>
                <span>{riderStats.total} Riders</span>
                <span>•</span>
                <span className="text-emerald-600">{riderStats.paid} Paid</span>
                <span>•</span>
                <span className="text-rose-500">{riderStats.pending} Pending</span>
              </>
            )}
          </div>
        </div>

        {/* Card 2: Advance Summary */}
        <div className="group relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100/60">
                  <Wallet className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 leading-tight block">Advance Summary</span>
                  <span className="text-[10px] text-slate-400 font-medium">Rider Advances</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/advanced')}
                className="text-[10px] font-bold text-emerald-600 hover:underline cursor-pointer bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-100/80 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Given</div>
                <div className="text-xs font-black text-slate-900 mt-1">{formatCurrency(totalAdvanceGiven)}</div>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100/70 p-2.5 rounded-xl">
                <div className="text-[10px] text-emerald-600 font-medium">Recovered</div>
                <div className="text-xs font-black text-emerald-700 mt-1">{formatCurrency(totalAdvanceRecovered)}</div>
              </div>
              <div className="bg-amber-50/50 border border-amber-100/70 p-2.5 rounded-xl">
                <div className="text-[10px] text-amber-600 font-medium">Outstanding</div>
                <div className="text-xs font-black text-amber-700 mt-1">{formatCurrency(totalAdvanceOutstanding)}</div>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500">
            {isAllCompanies ? (
              <>
                <span>{advanceStats.total} Records</span>
                <span>•</span>
                <span className="text-emerald-600">{advanceStats.recovered} Recovered</span>
                <span>•</span>
                <span className="text-amber-600">{advanceStats.pending} Pending</span>
              </>
            ) : (
              <span>Divided share (1/{activeCompanies.length || 1} of {formatCurrency(rawTotalAdvanceGiven)})</span>
            )}
          </div>
        </div>

        {/* Card 3: Loss Summary */}
        <div className="group relative overflow-hidden bg-white border border-slate-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-pink-500" />
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/60">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 leading-tight block">Loss & Recovery</span>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {isAllCompanies ? 'Incidents & Recoveries' : `${selectedCompany?.name || 'Franchise'} Loss Details`}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate('/loss-details')}
                className="text-[10px] font-bold text-rose-600 hover:underline cursor-pointer bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100"
              >
                View All
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-50 border border-slate-100/80 p-2.5 rounded-xl">
                <div className="text-[10px] text-slate-400 font-medium">Total Loss</div>
                <div className="text-xs font-black text-slate-900 mt-1">{formatCurrency(totalLoss)}</div>
              </div>
              <div className="bg-emerald-50/50 border border-emerald-100/70 p-2.5 rounded-xl">
                <div className="text-[10px] text-emerald-600 font-medium">Recovered</div>
                <div className="text-xs font-black text-emerald-700 mt-1">{formatCurrency(recoveredLoss)}</div>
              </div>
              <div className="bg-rose-50/50 border border-rose-100/70 p-2.5 rounded-xl">
                <div className="text-[10px] text-rose-500 font-medium">Pending</div>
                <div className="text-xs font-black text-rose-600 mt-1">{formatCurrency(unrecoveredLoss)}</div>
              </div>
            </div>
          </div>

          <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] font-bold text-slate-500">
            <span>{lossStats.total} Incident{lossStats.total !== 1 ? 's' : ''}</span>
            <span>•</span>
            <span className="text-emerald-600">{lossStats.recovered} Recovered</span>
            <span>•</span>
            <span className="text-rose-500">{lossStats.pending} Pending</span>
            {!isAllCompanies && hasSharedLoss && (
              <>
                <span>•</span>
                <span className="text-amber-600">(includes shared loss)</span>
              </>
            )}
          </div>
        </div>

        {/* Card 4: Attention Required (100% Dynamic) */}
        <div className="group relative overflow-hidden bg-white border border-rose-200/80 rounded-2xl p-5 shadow-[0_4px_20px_-2px_rgba(0,0,0,0.05),0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_12px_28px_-4px_rgba(0,0,0,0.08)] transition-all duration-300 flex flex-col justify-between">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-rose-500 to-amber-500" />
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100/60">
                  <Bell className="w-4 h-4 fill-rose-100" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 leading-tight block">Attention Required</span>
                  <span className="text-[10px] text-slate-400 font-medium">Urgent Actions</span>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-white text-[10px] font-extrabold ${attentionItems.length > 0 ? 'bg-rose-500 shadow-xs' : 'bg-emerald-500'
                  }`}
              >
                {attentionItems.length}
              </span>
            </div>

            <div className="space-y-2 text-[11px]">
              {attentionItems.length === 0 ? (
                <div className="py-4 text-center text-emerald-600 flex flex-col items-center justify-center gap-1">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span className="text-xs font-bold">All Good</span>
                  <span className="text-[10px] text-slate-400">No urgent pending actions</span>
                </div>
              ) : (
                attentionItems.slice(0, 3).map((item) => {
                  const ItemIcon = item.icon;
                  return (
                    <div
                      key={item.id}
                      onClick={() => navigate(item.path)}
                      className="p-2 rounded-xl bg-slate-50/70 hover:bg-rose-50/60 border border-slate-100/80 transition-colors cursor-pointer flex items-center justify-between text-slate-700"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <ItemIcon className={`w-3.5 h-3.5 shrink-0 ${item.iconColor}`} />
                        <span className="truncate font-medium">{item.title}</span>
                      </div>
                      <div className="flex items-center gap-1 font-bold text-slate-900 shrink-0 ml-1">
                        <span>{item.value}</span>
                        <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};


