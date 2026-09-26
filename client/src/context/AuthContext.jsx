import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';
import { ENDPOINTS } from '../api/endpoints';
import { getStorageItem, setStorageItem, removeStorageItem, STORAGE_KEYS } from '../utils/storage';
import { useToast } from './ToastContext';

const AuthContext = createContext(null);

const ONE_HOUR_MS = 60 * 60 * 1000; // 1 Hour session expiration

export const AuthProvider = ({ children }) => {
  const { toast } = useToast();

  const [authState, setAuthState] = useState(() => {
    const saved = getStorageItem(STORAGE_KEYS.AUTH_STATE, null);
    // Check if saved session has exceeded 1 hour
    if (saved?.loginTime) {
      const elapsed = Date.now() - new Date(saved.loginTime).getTime();
      if (elapsed > ONE_HOUR_MS) {
        removeStorageItem(STORAGE_KEYS.AUTH_STATE);
        return { isLoggedIn: false, token: null, user: null };
      }
    }
    return {
      isLoggedIn: !!saved?.token,
      token: saved?.token || null,
      user: saved?.user || null,
    };
  });

  const isAuthenticated = authState.isLoggedIn && !!authState.token;
  const currentUser = authState.user || {
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'Super Administrator',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  };

  const logout = useCallback((reason = '') => {
    setAuthState({ isLoggedIn: false, token: null, user: null });
    removeStorageItem(STORAGE_KEYS.AUTH_STATE);
    if (reason === 'expired') {
      toast.warning('Your 1-hour session has expired. Please log in again.');
    } else {
      toast.info('You have been logged out safely.');
    }
  }, [toast]);

  // Periodic check for 1-hour session expiration
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(() => {
      const saved = getStorageItem(STORAGE_KEYS.AUTH_STATE, null);
      if (saved?.loginTime) {
        const elapsed = Date.now() - new Date(saved.loginTime).getTime();
        if (elapsed >= ONE_HOUR_MS) {
          logout('expired');
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isAuthenticated, logout]);

  // Login handler connecting to backend /api/auth/login
  const login = async (email, password, rememberMe = true) => {
    try {
      const response = await apiClient.post(ENDPOINTS.AUTH.LOGIN, {
        email: email.trim(),
        password: password.trim(),
      });

      if (response.success && response.token) {
        const sessionData = {
          isLoggedIn: true,
          token: response.token,
          user: response.user,
          loginTime: new Date().toISOString(),
        };

        setAuthState({
          isLoggedIn: true,
          token: response.token,
          user: response.user,
        });

        if (rememberMe) {
          setStorageItem(STORAGE_KEYS.AUTH_STATE, sessionData);
        }

        toast.success(`Welcome back, ${response.user.name || 'Admin'}!`);
        return { success: true };
      } else {
        throw new Error(response.message || 'Login failed');
      }
    } catch (error) {
      const msg = error.message || 'Invalid email or password';
      toast.error(msg);
      return { success: false, error: msg };
    }
  };

  // Update profile handler connecting to backend /api/auth/profile
  const updateProfile = async (profileData) => {
    try {
      const response = await apiClient.put(ENDPOINTS.AUTH.PROFILE, profileData);
      if (response.success) {
        const updatedUser = response.user;
        const currentSaved = getStorageItem(STORAGE_KEYS.AUTH_STATE, {});
        
        setAuthState((prev) => ({
          ...prev,
          user: updatedUser,
        }));

        setStorageItem(STORAGE_KEYS.AUTH_STATE, {
          ...currentSaved,
          user: updatedUser,
        });

        toast.success('Profile details updated successfully!');
        return true;
      }
    } catch (error) {
      toast.error(error.message || 'Failed to update profile');
      return false;
    }
  };

  // Upload photo file to backend /api/auth/upload-avatar (stores in server/uploads/)
  const uploadAvatarFile = async (file) => {
    try {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await apiClient.post(ENDPOINTS.AUTH.UPLOAD_AVATAR, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.success && response.avatarUrl) {
        setAuthState((prev) => ({
          ...prev,
          user: {
            ...prev.user,
            avatar: response.avatarUrl,
          },
        }));

        const currentSaved = getStorageItem(STORAGE_KEYS.AUTH_STATE, {});
        setStorageItem(STORAGE_KEYS.AUTH_STATE, {
          ...currentSaved,
          user: {
            ...currentSaved.user,
            avatar: response.avatarUrl,
          },
        });

        toast.success('Profile photo uploaded and saved successfully!');
        return response.avatarUrl;
      }
    } catch (error) {
      toast.error(error.message || 'Failed to upload photo');
      throw error;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        currentUser,
        token: authState.token,
        login,
        updateProfile,
        uploadAvatarFile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
