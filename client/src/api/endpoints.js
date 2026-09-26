/**
 * Centralized API Endpoints Directory
 * Contains all backend REST API routes and URLs used in the application.
 */

// Normalize API_BASE_URL so it always has /api and no trailing slash
const rawApiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4500/api').trim().replace(/\/+$/, '');
export const API_BASE_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;
export const SERVER_STATIC_URL = (
  import.meta.env.VITE_SERVER_URL ||
  rawApiUrl.replace(/\/api$/, '') ||
  'http://localhost:4500'
).trim().replace(/\/+$/, '');

export const ENDPOINTS = {
  // 1. Authentication & Admin Profile
  AUTH: {
    LOGIN: `${API_BASE_URL}/auth/login`,
    PROFILE: `${API_BASE_URL}/auth/profile`,
    UPLOAD_AVATAR: `${API_BASE_URL}/auth/upload-avatar`,
  },

  // 2. Logistics Companies Management
  COMPANIES: {
    GET_ALL: `${API_BASE_URL}/companies`,
    CREATE: `${API_BASE_URL}/companies`,
    UPDATE: (id) => `${API_BASE_URL}/companies/${id}`,
    DELETE: (id) => `${API_BASE_URL}/companies/${id}`,
    BULK_DELETE: `${API_BASE_URL}/companies/bulk-delete`,
    TOGGLE_STATUS: (id) => `${API_BASE_URL}/companies/${id}/toggle-status`,
  },

  // 3. Categories / Rider Delivery & Payouts Ledger
  RIDER_PAYOUTS: {
    GET_ALL: `${API_BASE_URL}/rider-payouts`,
    CREATE: `${API_BASE_URL}/rider-payouts`,
    BULK_IMPORT: `${API_BASE_URL}/rider-payouts/bulk-import`,
    BULK_DELETE: `${API_BASE_URL}/rider-payouts/bulk-delete`,
    SEND_EMAIL: `${API_BASE_URL}/rider-payouts/send-email`,
    UPDATE: (id) => `${API_BASE_URL}/rider-payouts/${id}`,
    DELETE: (id) => `${API_BASE_URL}/rider-payouts/${id}`,
  },

  // 4. Loss Details Management
  LOSS_DETAILS: {
    GET_ALL: `${API_BASE_URL}/loss-details`,
    CREATE: `${API_BASE_URL}/loss-details`,
    BULK_IMPORT: `${API_BASE_URL}/loss-details/bulk-import`,
    BULK_DELETE: `${API_BASE_URL}/loss-details/bulk-delete`,
    UPDATE: (id) => `${API_BASE_URL}/loss-details/${id}`,
    DELETE: (id) => `${API_BASE_URL}/loss-details/${id}`,
  },

  // 5. Hub Operational Expenses
  HUB_EXPENSES: {
    GET_ALL: `${API_BASE_URL}/hub-expenses`,
    CREATE: `${API_BASE_URL}/hub-expenses`,
    BULK_IMPORT: `${API_BASE_URL}/hub-expenses/bulk-import`,
    BULK_DELETE: `${API_BASE_URL}/hub-expenses/bulk-delete`,
    UPDATE: (id) => `${API_BASE_URL}/hub-expenses/${id}`,
    DELETE: (id) => `${API_BASE_URL}/hub-expenses/${id}`,
  },

  // 6. Payment Disbursements Ledger
  PAYMENTS: {
    GET_ALL: `${API_BASE_URL}/payments`,
    CREATE: `${API_BASE_URL}/payments`,
    UPDATE_STATUS: (id) => `${API_BASE_URL}/payments/${id}/status`,
    BULK_DELETE: `${API_BASE_URL}/payments/bulk-delete`,
    DELETE: (id) => `${API_BASE_URL}/payments/${id}`,
  },

  // 7. Rider Advance Management
  ADVANCES: {
    GET_ALL: `${API_BASE_URL}/advances`,
    GET_OUTSTANDING: `${API_BASE_URL}/advances/outstanding`,
    CARRY_FORWARD: `${API_BASE_URL}/advances/carry-forward`,
    CREATE: `${API_BASE_URL}/advances`,
    BULK_IMPORT: `${API_BASE_URL}/advances/bulk-import`,
    BULK_DELETE: `${API_BASE_URL}/advances/bulk-delete`,
    UPDATE: (id) => `${API_BASE_URL}/advances/${id}`,
    DELETE: (id) => `${API_BASE_URL}/advances/${id}`,
  },

  // 8. My Payment / Company Cycle Payout Management
  MY_PAYMENTS: {
    GET_ALL: `${API_BASE_URL}/my-payments`,
    CREATE: `${API_BASE_URL}/my-payments`,
    BULK_IMPORT: `${API_BASE_URL}/my-payments/bulk-import`,
    BULK_DELETE: `${API_BASE_URL}/my-payments/bulk-delete`,
    UPDATE: (id) => `${API_BASE_URL}/my-payments/${id}`,
    DELETE: (id) => `${API_BASE_URL}/my-payments/${id}`,
  },

  // 9. Email Report Dispatch
  EMAIL: {
    SEND_REPORT: `${API_BASE_URL}/email/send-report`,
  },

  // Health check
  HEALTH: `${API_BASE_URL}/health`,
};

