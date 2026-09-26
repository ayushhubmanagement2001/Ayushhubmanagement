import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import { useToast } from './ToastContext';
import { useAuth } from './AuthContext';

const CompanyContext = createContext(null);

export const CompanyProvider = ({ children }) => {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState('');
  const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Auto-detect and select the current real-world month
  const currentMonthIdx = new Date().getMonth(); // 0-11
  const currentMonthName = MONTHS[currentMonthIdx] || 'September';
  const [selectedMonthFilter, setSelectedMonthFilter] = useState(currentMonthName);

  // Compute current financial year (format: 2026-2027, starts in April)
  const currentYear = new Date().getFullYear();
  const defaultFYStart = currentMonthIdx >= 3 ? currentYear : currentYear - 1;
  const defaultFY = `${defaultFYStart}-${defaultFYStart + 1}`;

  const [selectedFinancialYear, setSelectedFinancialYear] = useState(defaultFY);
  const [selectedCycleFilter, setSelectedCycleFilter] = useState('all');

  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  // Fetch companies from backend
  const fetchCompanies = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setLoading(true);
      const res = await apiClient.get(ENDPOINTS.COMPANIES.GET_ALL);
      if (res.success && Array.isArray(res.data)) {
        const formatted = res.data.map((c) => ({
          ...c,
          id: c._id || c.id,
        }));
        setCompanies(formatted);
        const active = formatted.filter((c) => c.status === 'Active');
        if (active.length > 0) {
          setSelectedCompanyFilter((prev) => {
            if (prev === 'all') return 'all';
            if (!prev || !formatted.some((c) => (c.id || c._id) === prev)) {
              return active[0].id || active[0]._id;
            }
            return prev;
          });
        }
      }
    } catch (error) {
      console.error('[Fetch Companies Error]:', error.message);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const addCompany = async (companyData) => {
    try {
      const res = await apiClient.post(ENDPOINTS.COMPANIES.CREATE, companyData);
      if (res.success && res.data) {
        const newComp = { ...res.data, id: res.data._id };
        setCompanies((prev) => [newComp, ...prev]);
        toast.success(`Company '${newComp.name}' added successfully!`);
        return true;
      }
    } catch (error) {
      toast.error(error.message || 'Failed to add company');
      return false;
    }
  };

  const updateCompany = async (id, updatedFields) => {
    try {
      const res = await apiClient.put(ENDPOINTS.COMPANIES.UPDATE(id), updatedFields);
      if (res.success && res.data) {
        const updated = { ...res.data, id: res.data._id };
        setCompanies((prev) => prev.map((c) => (c.id === id || c._id === id ? updated : c)));
        toast.success(`Company '${updated.name}' updated successfully!`);
        return true;
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update company');
      return false;
    }
  };

  const toggleCompanyStatus = async (id) => {
    try {
      const res = await apiClient.patch(ENDPOINTS.COMPANIES.TOGGLE_STATUS(id));
      if (res.success && res.data) {
        const updated = { ...res.data, id: res.data._id };
        setCompanies((prev) => prev.map((c) => (c.id === id || c._id === id ? updated : c)));
        toast.info(`Company '${updated.name}' is now ${updated.status}.`);
        return true;
      }
    } catch (error) {
      toast.error(error.message || 'Failed to toggle status');
      return false;
    }
  };

  const deleteCompany = async (id) => {
    try {
      const target = companies.find((c) => c.id === id || c._id === id);
      const res = await apiClient.delete(ENDPOINTS.COMPANIES.DELETE(id));
      if (res.success) {
        setCompanies((prev) => prev.filter((c) => c.id !== id && c._id !== id));
        if (selectedCompanyFilter === id) {
          const remainingActive = companies.filter((c) => (c.id !== id && c._id !== id) && c.status === 'Active');
          setSelectedCompanyFilter(remainingActive[0]?.id || remainingActive[0]?._id || '');
        }
        toast.success(`Company '${target?.name || ''}' deleted successfully.`);
        return true;
      }
    } catch (error) {
      toast.error(error.message || 'Failed to delete company');
      return false;
    }
  };

  const bulkDeleteCompanies = async (ids) => {
    try {
      const res = await apiClient.post(ENDPOINTS.COMPANIES.BULK_DELETE, { ids });
      if (res.success) {
        setCompanies((prev) => prev.filter((c) => !ids.includes(c.id) && !ids.includes(c._id)));
        toast.success(`Deleted ${ids.length} companies successfully.`);
        return true;
      }
    } catch (error) {
      toast.error(error.message || 'Failed to bulk delete companies');
      return false;
    }
  };

  return (
    <CompanyContext.Provider
      value={{
        companies,
        loading,
        selectedCompanyFilter,
        setSelectedCompanyFilter,
        selectedMonthFilter,
        setSelectedMonthFilter,
        selectedFinancialYear,
        setSelectedFinancialYear,
        selectedCycleFilter,
        setSelectedCycleFilter,
        fetchCompanies,
        addCompany,
        updateCompany,
        toggleCompanyStatus,
        deleteCompany,
        bulkDeleteCompanies,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
};
