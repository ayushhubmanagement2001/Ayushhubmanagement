import React, { createContext, useContext, useState } from 'react';
import { INITIAL_RIDERS } from '../data/mockData';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../utils/storage';
import { useLock } from './LockContext';
import { useToast } from './ToastContext';
import { calculateRiderPayout, calculateFinalPayout } from '../utils/calculations';

const RiderContext = createContext(null);

export const RiderProvider = ({ children }) => {
  const [riders, setRiders] = useState(() => {
    return getStorageItem(STORAGE_KEYS.RIDERS, INITIAL_RIDERS);
  });

  const { canEdit, notifyLocked } = useLock();
  const { toast } = useToast();

  const syncRiders = (updated) => {
    setRiders(updated);
    setStorageItem(STORAGE_KEYS.RIDERS, updated);
  };

  const addRider = (riderData) => {
    if (!canEdit) {
      notifyLocked('add a new rider');
      return false;
    }

    const computedPayout = riderData.payout !== undefined && riderData.payout !== ''
      ? Number(riderData.payout)
      : calculateRiderPayout(riderData);

    const computedFinal = riderData.finalPayout !== undefined && riderData.finalPayout !== ''
      ? Number(riderData.finalPayout)
      : calculateFinalPayout({ ...riderData, payout: computedPayout });

    const newRider = {
      ...riderData,
      id: `rider-${Date.now().toString(36)}`,
      riderId: riderData.riderId || `RD-${Math.floor(100000 + Math.random() * 900000)}`,
      deliveredPickupTotal: Number(riderData.deliveredPickupTotal) || 0,
      primary: Number(riderData.primary) || 0,
      clubbed: Number(riderData.clubbed) || 0,
      rateCard: Number(riderData.rateCard) || 12,
      payout: computedPayout,
      loss: Number(riderData.loss) || 0,
      advance: Number(riderData.advance) || 0,
      finalPayout: computedFinal,
      paymentStatus: riderData.paymentStatus || 'Pending',
      joiningDate: riderData.joiningDate || new Date().toISOString().split('T')[0],
      status: riderData.status || 'Active',
    };

    const updated = [newRider, ...riders];
    syncRiders(updated);
    toast.success(`Rider "${newRider.riderName}" added successfully.`);
    return true;
  };

  const updateRider = (id, updatedData) => {
    if (!canEdit) {
      notifyLocked('edit rider details');
      return false;
    }

    const updated = riders.map((r) => {
      if (r.id === id) {
        const merged = { ...r, ...updatedData };
        const payout = updatedData.payout !== undefined ? Number(updatedData.payout) : calculateRiderPayout(merged);
        const finalPayout = updatedData.finalPayout !== undefined ? Number(updatedData.finalPayout) : calculateFinalPayout({ ...merged, payout });
        return {
          ...merged,
          payout,
          finalPayout,
        };
      }
      return r;
    });

    syncRiders(updated);
    toast.success('Rider record updated successfully.');
    return true;
  };

  const deleteRider = (id) => {
    if (!canEdit) {
      notifyLocked('delete this rider');
      return false;
    }

    const target = riders.find((r) => r.id === id);
    const updated = riders.filter((r) => r.id !== id);
    syncRiders(updated);
    toast.success(`Rider "${target?.riderName || 'Rider'}" removed.`);
    return true;
  };

  const getRidersByCompany = (companyId) => {
    return riders.filter((r) => r.companyId === companyId);
  };

  return (
    <RiderContext.Provider
      value={{
        riders,
        addRider,
        updateRider,
        deleteRider,
        getRidersByCompany,
      }}
    >
      {children}
    </RiderContext.Provider>
  );
};

export const useRiders = () => {
  const context = useContext(RiderContext);
  if (!context) {
    throw new Error('useRiders must be used within a RiderProvider');
  }
  return context;
};
