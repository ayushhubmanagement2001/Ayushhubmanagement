import React, { createContext, useContext, useState, useCallback } from 'react';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../utils/storage';
import { useToast } from './ToastContext';

const LockContext = createContext(null);

export const LockProvider = ({ children }) => {
  const [isLocked, setIsLockedState] = useState(() => {
    return getStorageItem(STORAGE_KEYS.LOCK_STATE, false);
  });

  const { toast } = useToast();

  const canEdit = !isLocked;

  const setLocked = useCallback(() => {
    setIsLockedState(true);
    setStorageItem(STORAGE_KEYS.LOCK_STATE, true);
    toast.warning('Locked Mode enabled. Application is now read-only.');
  }, [toast]);

  const setUnlocked = useCallback(() => {
    setIsLockedState(false);
    setStorageItem(STORAGE_KEYS.LOCK_STATE, false);
    toast.success('Edit Mode activated. You can now make changes.');
  }, [toast]);

  const toggleLock = useCallback(() => {
    setIsLockedState((current) => {
      const next = !current;
      setStorageItem(STORAGE_KEYS.LOCK_STATE, next);
      return next;
    });

    // Call toast outside updater
    setIsLockedState((current) => {
      if (current) {
        toast.warning('Locked Mode enabled. Application is now read-only.');
      } else {
        toast.success('Edit Mode activated. You can now make changes.');
      }
      return current;
    });
  }, [toast]);

  const notifyLocked = useCallback((actionName = 'perform this action') => {
    toast.warning(`Dashboard is locked. Turn on Edit Mode to ${actionName}.`);
  }, [toast]);

  return (
    <LockContext.Provider
      value={{
        isLocked,
        canEdit,
        setLocked,
        setUnlocked,
        toggleLock,
        notifyLocked,
      }}
    >
      {children}
    </LockContext.Provider>
  );
};

export const useLock = () => {
  const context = useContext(LockContext);
  if (!context) {
    throw new Error('useLock must be used within a LockProvider');
  }
  return context;
};
