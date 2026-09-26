import axios from 'axios';
import { API_BASE_URL } from './endpoints';
import { getStorageItem, setStorageItem, removeStorageItem, STORAGE_KEYS } from '../utils/storage';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach JWT Token if present
apiClient.interceptors.request.use(
  (config) => {
    const authState = getStorageItem(STORAGE_KEYS.AUTH_STATE, null);
    if (authState?.token) {
      config.headers.Authorization = `Bearer ${authState.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: 1-Hour Session Expiration & Error Handling
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const status = error.response?.status;
    const isTokenExpired = error.response?.data?.isExpired || status === 401;

    // Handle 1-hour session expiry / Unauthorized
    if (isTokenExpired) {
      console.warn('[Session Expired]: 1-hour token expired or unauthorized. Logging out.');
      removeStorageItem(STORAGE_KEYS.AUTH_STATE);
      
      // If not already on login page, redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login?expired=true';
      }
    }

    const errorMessage =
      error.response?.data?.message ||
      error.message ||
      'An unexpected server error occurred. Please try again.';

    return Promise.reject({
      ...error,
      message: errorMessage,
      status: status || 500,
    });
  }
);

export default apiClient;
