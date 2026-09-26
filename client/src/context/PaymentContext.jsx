import React, { createContext, useContext, useState } from 'react';
import { INITIAL_PAYMENTS } from '../data/mockData';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../utils/storage';
import { useLock } from './LockContext';
import { useToast } from './ToastContext';

const PaymentContext = createContext(null);

export const PaymentProvider = ({ children }) => {
  const [payments, setPayments] = useState(() => {
    return getStorageItem(STORAGE_KEYS.PAYMENTS, INITIAL_PAYMENTS);
  });

  const { canEdit, notifyLocked } = useLock();
  const { toast } = useToast();

  const syncPayments = (updated) => {
    setPayments(updated);
    setStorageItem(STORAGE_KEYS.PAYMENTS, updated);
  };

  const addPayment = (paymentData) => {
    if (!canEdit) {
      notifyLocked('add a payment entry');
      return false;
    }

    const newPayment = {
      ...paymentData,
      id: `pay-${Date.now().toString(36)}`,
      payout: Number(paymentData.payout) || 0,
      loss: Number(paymentData.loss) || 0,
      advance: Number(paymentData.advance) || 0,
      finalPayout: Number(paymentData.finalPayout) || 0,
      paymentStatus: paymentData.paymentStatus || 'Paid',
      paymentDate: paymentData.paymentStatus === 'Paid' ? (paymentData.paymentDate || new Date().toISOString().split('T')[0]) : '-',
      transactionId: paymentData.paymentStatus === 'Paid' ? (paymentData.transactionId || `TXN-${Math.floor(1000000 + Math.random() * 9000000)}`) : '-',
    };

    const updated = [newPayment, ...payments];
    syncPayments(updated);
    toast.success(`Payment recorded for ${newPayment.riderName}.`);
    return true;
  };

  const updatePaymentStatus = (id, newStatus) => {
    if (!canEdit) {
      notifyLocked('change payment status');
      return false;
    }

    const updated = payments.map((p) => {
      if (p.id === id) {
        const isPaid = newStatus === 'Paid';
        return {
          ...p,
          paymentStatus: newStatus,
          paymentDate: isPaid ? new Date().toISOString().split('T')[0] : '-',
          transactionId: isPaid ? (p.transactionId !== '-' ? p.transactionId : `TXN-${Math.floor(1000000 + Math.random() * 9000000)}`) : '-',
        };
      }
      return p;
    });

    syncPayments(updated);
    toast.success(`Payment marked as ${newStatus}.`);
    return true;
  };

  const updatePayment = (id, updatedData) => {
    if (!canEdit) {
      notifyLocked('edit payment details');
      return false;
    }

    const updated = payments.map((p) =>
      p.id === id ? { ...p, ...updatedData } : p
    );
    syncPayments(updated);
    toast.success('Payment record updated.');
    return true;
  };

  const deletePayment = (id) => {
    if (!canEdit) {
      notifyLocked('delete this payment record');
      return false;
    }

    const updated = payments.filter((p) => p.id !== id);
    syncPayments(updated);
    toast.success('Payment record deleted.');
    return true;
  };

  const syncPaidRider = (riderRecord, companyName = '') => {
    const existingIndex = payments.findIndex(
      (p) => p.riderId === riderRecord.riderId && (p.month === riderRecord.month || !p.month)
    );

    const isPaid = (riderRecord.paymentStatus || '').toUpperCase() === 'PAID';
    const statusText = isPaid ? 'Paid' : (riderRecord.paymentStatus || 'Pending');

    if (existingIndex >= 0) {
      const updated = [...payments];
      const existing = updated[existingIndex];
      updated[existingIndex] = {
        ...existing,
        riderName: riderRecord.riderName,
        companyId: riderRecord.companyId || existing.companyId,
        companyName: companyName || existing.companyName,
        month: riderRecord.month || existing.month || 'September',
        payout: Number(riderRecord.payout) || 0,
        loss: Number(riderRecord.loss) || 0,
        advance: Number(riderRecord.advance) || 0,
        finalPayout: Number(riderRecord.finalPayout) || 0,
        paymentStatus: statusText,
        remark: riderRecord.ayushRemark || existing.remark || '',
        paymentDate: isPaid ? (existing.paymentDate !== '-' ? existing.paymentDate : new Date().toISOString().split('T')[0]) : '-',
        transactionId: isPaid ? (existing.transactionId !== '-' ? existing.transactionId : `TXN-${Math.floor(1000000 + Math.random() * 9000000)}`) : '-',
      };
      syncPayments(updated);
    } else if (isPaid) {
      const newPayment = {
        id: `pay-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 5)}`,
        riderId: riderRecord.riderId,
        riderName: riderRecord.riderName,
        companyId: riderRecord.companyId || 'company-001',
        companyName: companyName || 'Company',
        month: riderRecord.month || 'September',
        payout: Number(riderRecord.payout) || 0,
        loss: Number(riderRecord.loss) || 0,
        advance: Number(riderRecord.advance) || 0,
        finalPayout: Number(riderRecord.finalPayout) || 0,
        paymentStatus: 'Paid',
        remark: riderRecord.ayushRemark || '',
        paymentDate: new Date().toISOString().split('T')[0],
        transactionId: `TXN-${Math.floor(1000000 + Math.random() * 9000000)}`,
      };
      const updated = [newPayment, ...payments];
      syncPayments(updated);
    }
  };

  return (
    <PaymentContext.Provider
      value={{
        payments,
        addPayment,
        updatePayment,
        updatePaymentStatus,
        deletePayment,
        syncPaidRider,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
};

export const usePayments = () => {
  const context = useContext(PaymentContext);
  if (!context) {
    throw new Error('usePayments must be used within a PaymentProvider');
  }
  return context;
};
