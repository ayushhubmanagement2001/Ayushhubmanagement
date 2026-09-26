import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppLayout } from '../components/layout/AppLayout';
import { Login } from '../pages/Login';
import { Dashboard } from '../pages/Dashboard';
import { Payments } from '../pages/Payments';
import { Categories } from '../pages/Categories';
import { LossDetails } from '../pages/LossDetails';
import { Expenses } from '../pages/Expenses';
import { SettingsHub } from '../pages/SettingsHub';
import { PaymentPayout } from '../pages/PaymentPayout';
import { Advanced } from '../pages/Advanced';
import { Profile } from '../pages/Profile';
import { Companies } from '../pages/Companies';
import { CompanyDetails } from '../pages/CompanyDetails';
import { Reports } from '../pages/Reports';
import { Notepad } from '../pages/Notepad';

// Protected route wrapper
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

// Public route wrapper for login
const PublicOnlyRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  return children;
};

export const AppRoutes = () => {
  return (
    <Routes>
      {/* Public Login Route */}
      <Route
        path="/login"
        element={
          <PublicOnlyRoute>
            <Login />
          </PublicOnlyRoute>
        }
      />

      {/* Protected Portal Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        
        {/* Franchise Payments (Formerly My Payment) */}
        <Route path="my-payment" element={<PaymentPayout />} />
        <Route path="franchise-payments" element={<Navigate to="/my-payment" replace />} />
        <Route path="payment-payout" element={<Navigate to="/my-payment" replace />} />

        {/* Rider Payout (Formerly Payout Details) */}
        <Route path="payout-details" element={<Categories />} />
        <Route path="rider-payout" element={<Navigate to="/payout-details" replace />} />

        {/* Rider Advances (Formerly Advanced) */}
        <Route path="advanced" element={<Advanced />} />
        <Route path="rider-advances" element={<Navigate to="/advanced" replace />} />

        {/* Loss & Recovery (Formerly Loss Details) */}
        <Route path="loss-details" element={<LossDetails />} />
        <Route path="loss-and-recovery" element={<Navigate to="/loss-details" replace />} />

        {/* Hub Expenses */}
        <Route path="hub-expenses" element={<Expenses />} />
        <Route path="expenses" element={<Navigate to="/hub-expenses" replace />} />
        <Route path="hub" element={<Navigate to="/hub-expenses" replace />} />

        {/* Transaction Ledger */}
        <Route path="transactions" element={<Payments />} />
        <Route path="transaction-ledger" element={<Navigate to="/transactions" replace />} />

        {/* Reports & Financial Analytics */}
        <Route path="reports" element={<Reports />} />

        {/* Smart Advanced Notepad */}
        <Route path="notepad" element={<Notepad />} />

        {/* Settings & Profile */}
        <Route path="settings" element={<SettingsHub />} />
        <Route path="profile" element={<Profile />} />

        {/* Companies Management */}
        <Route path="companies" element={<Companies />} />
        <Route path="companies/:companyId" element={<CompanyDetails />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
};
