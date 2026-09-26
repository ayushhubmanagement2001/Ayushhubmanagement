/**
 * LocalStorage utility wrapper with JSON parse/stringify & fallback defaults.
 */

export const getStorageItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null || item === undefined) {
      return defaultValue;
    }
    return JSON.parse(item);
  } catch (error) {
    console.warn(`Error reading localStorage key "${key}":`, error);
    return defaultValue;
  }
};

export const setStorageItem = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Error writing to localStorage key "${key}":`, error);
  }
};

export const removeStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`Error removing localStorage key "${key}":`, error);
  }
};

export const STORAGE_KEYS = {
  AUTH_STATE: 'portal_auth_state',
  LOCK_STATE: 'portal_lock_state',
  COMPANIES: 'portal_companies',
  CATEGORIES: 'portal_categories',
  RIDERS: 'portal_riders',
  EXPENSES: 'portal_expenses',
  PAYMENTS: 'portal_payments',
  SETTINGS: 'portal_settings',
};
