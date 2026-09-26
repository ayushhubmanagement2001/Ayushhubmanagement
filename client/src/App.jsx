import React, { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { ToastProvider } from './context/ToastContext';
import { RefreshProvider } from './context/RefreshContext';
import { LockProvider } from './context/LockContext';
import { AuthProvider } from './context/AuthContext';
import { CompanyProvider } from './context/CompanyContext';
import { CategoryProvider } from './context/CategoryContext';
import { RiderProvider } from './context/RiderContext';
import { ExpenseProvider } from './context/ExpenseContext';
import { PaymentProvider } from './context/PaymentContext';
import { AppRoutes } from './routes/AppRoutes';
import { SplashScreen } from './components/common/SplashScreen';

export default function App() {
  const [showSplash, setShowSplash] = useState(() => {
    // Only show splash screen once per browser session; do not repeat on page refresh
    return !sessionStorage.getItem('hasSeenSplash');
  });

  const handleFinishSplash = () => {
    sessionStorage.setItem('hasSeenSplash', 'true');
    setShowSplash(false);
  };

  return (
    <>
      {showSplash && (
        <SplashScreen onFinish={handleFinishSplash} duration={5000} />
      )}
      <BrowserRouter>
        <ToastProvider>
          <RefreshProvider>
            <LockProvider>
              <AuthProvider>
                <CompanyProvider>
                  <CategoryProvider>
                    <RiderProvider>
                      <ExpenseProvider>
                        <PaymentProvider>
                          <AppRoutes />
                        </PaymentProvider>
                      </ExpenseProvider>
                    </RiderProvider>
                  </CategoryProvider>
                </CompanyProvider>
              </AuthProvider>
            </LockProvider>
          </RefreshProvider>
        </ToastProvider>
      </BrowserRouter>
    </>
  );
}
