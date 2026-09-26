import React, { createContext, useContext, useState } from 'react';
import { INITIAL_CATEGORIES } from '../data/mockData';
import { getStorageItem, setStorageItem, STORAGE_KEYS } from '../utils/storage';
import { useLock } from './LockContext';
import { useToast } from './ToastContext';

const CategoryContext = createContext(null);

export const CategoryProvider = ({ children }) => {
  const [categories, setCategories] = useState(() => {
    return getStorageItem(STORAGE_KEYS.CATEGORIES, INITIAL_CATEGORIES);
  });

  const { canEdit, notifyLocked } = useLock();
  const { toast } = useToast();

  const syncCategories = (updated) => {
    setCategories(updated);
    setStorageItem(STORAGE_KEYS.CATEGORIES, updated);
  };

  const addCategory = (categoryData) => {
    if (!canEdit) {
      notifyLocked('add a new category');
      return false;
    }

    const newCategory = {
      ...categoryData,
      id: `cat-${Date.now().toString(36)}`,
      createdDate: new Date().toISOString().split('T')[0],
      status: categoryData.status || 'Active',
    };

    const updated = [newCategory, ...categories];
    syncCategories(updated);
    toast.success(`Category "${newCategory.name}" added successfully.`);
    return true;
  };

  const updateCategory = (id, updatedData) => {
    if (!canEdit) {
      notifyLocked('edit this category');
      return false;
    }

    const updated = categories.map((cat) =>
      cat.id === id ? { ...cat, ...updatedData } : cat
    );
    syncCategories(updated);
    toast.success('Category updated successfully.');
    return true;
  };

  const deleteCategory = (id) => {
    if (!canEdit) {
      notifyLocked('delete this category');
      return false;
    }

    const target = categories.find((c) => c.id === id);
    const updated = categories.filter((c) => c.id !== id);
    syncCategories(updated);
    toast.success(`Category "${target?.name || 'Category'}" deleted.`);
    return true;
  };

  return (
    <CategoryContext.Provider
      value={{
        categories,
        addCategory,
        updateCategory,
        deleteCategory,
      }}
    >
      {children}
    </CategoryContext.Provider>
  );
};

export const useCategory = () => {
  const context = useContext(CategoryContext);
  if (!context) {
    throw new Error('useCategory must be used within a CategoryProvider');
  }
  return context;
};
