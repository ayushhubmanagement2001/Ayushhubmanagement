import React, { createContext, useContext, useState } from 'react';
import { INITIAL_EXPENSES } from '../data/mockData';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../utils/storage';
import { useLock } from './LockContext';
import { useToast } from './ToastContext';

const ExpenseContext = createContext(null);

export const ExpenseProvider = ({ children }) => {
  const [expenses, setExpenses] = useState(() => {
    return getStorageItem(STORAGE_KEYS.EXPENSES, INITIAL_EXPENSES);
  });

  const { canEdit, notifyLocked } = useLock();
  const { toast } = useToast();

  const syncExpenses = (updated) => {
    setExpenses(updated);
    setStorageItem(STORAGE_KEYS.EXPENSES, updated);
  };

  const addExpense = (expenseData) => {
    if (!canEdit) {
      notifyLocked('add a new expense');
      return false;
    }

    const newExpense = {
      ...expenseData,
      id: `exp-${Date.now().toString(36)}`,
      amount: Number(expenseData.amount) || 0,
      date: expenseData.date || new Date().toISOString().split('T')[0],
      status: expenseData.status || 'Approved',
      referenceNo: `EXP-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`,
    };

    const updated = [newExpense, ...expenses];
    syncExpenses(updated);
    toast.success(`Expense of ₹${newExpense.amount} recorded.`);
    return true;
  };

  const updateExpense = (id, updatedData) => {
    if (!canEdit) {
      notifyLocked('edit this expense');
      return false;
    }

    const updated = expenses.map((exp) =>
      exp.id === id ? { ...exp, ...updatedData, amount: Number(updatedData.amount) || exp.amount } : exp
    );
    syncExpenses(updated);
    toast.success('Expense record updated successfully.');
    return true;
  };

  const deleteExpense = (id) => {
    if (!canEdit) {
      notifyLocked('delete this expense');
      return false;
    }

    const updated = expenses.filter((exp) => exp.id !== id);
    syncExpenses(updated);
    toast.success('Expense record deleted.');
    return true;
  };

  return (
    <ExpenseContext.Provider
      value={{
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
      }}
    >
      {children}
    </ExpenseContext.Provider>
  );
};

export const useExpenses = () => {
  const context = useContext(ExpenseContext);
  if (!context) {
    throw new Error('useExpenses must be used within an ExpenseProvider');
  }
  return context;
};
