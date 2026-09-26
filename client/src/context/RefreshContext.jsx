import React, { createContext, useContext, useState, useCallback, useEffect, useRef } from 'react';
import { useToast } from './ToastContext';

const RefreshContext = createContext(null);

export const RefreshProvider = ({ children }) => {
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { toast } = useToast();

  const triggerRefresh = useCallback((showToast = true) => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    if (showToast) {
      toast.success('Tab refreshed successfully!');
    }
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  }, [toast]);

  return (
    <RefreshContext.Provider value={{ refreshKey, isRefreshing, triggerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => {
  const context = useContext(RefreshContext);
  if (!context) {
    throw new Error('useRefresh must be used within a RefreshProvider');
  }
  return context;
};

/**
 * Hook to automatically trigger page data re-fetch whenever the refresh button is clicked
 * @param {Function} onRefreshFn - The function to execute on refresh
 */
export const useTabRefresh = (onRefreshFn) => {
  const { refreshKey, isRefreshing, triggerRefresh } = useRefresh();
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    if (typeof onRefreshFn === 'function') {
      onRefreshFn();
    }
  }, [refreshKey]);

  return { refreshKey, isRefreshing, triggerRefresh };
};
