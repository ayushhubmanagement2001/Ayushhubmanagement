import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const lastToastRef = useRef({ message: '', time: 0 });

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback((message, type = 'info', duration = 3500) => {
    // Prevent duplicate rapid triggers (e.g. React StrictMode double invocation)
    const now = Date.now();
    if (
      lastToastRef.current.message === message &&
      now - lastToastRef.current.time < 500
    ) {
      return;
    }
    lastToastRef.current = { message, time: now };

    const id = now + Math.random().toString(36).substring(2, 7);
    const newToast = { id, message, type, duration };

    // Show single latest toast at the top (no multiple stacked toasts)
    setToasts([newToast]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  const toastMethods = {
    success: (msg, dur) => showToast(msg, 'success', dur),
    error: (msg, dur) => showToast(msg, 'error', dur),
    warning: (msg, dur) => showToast(msg, 'warning', dur),
    info: (msg, dur) => showToast(msg, 'info', dur),
    showToast,
    removeToast,
  };

  // Self-referential property so both `const { toast } = useToast()` and `const toast = useToast()` work seamlessly!
  toastMethods.toast = toastMethods;

  const getToastStyles = (type) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-white border-green-200 shadow-xl shadow-green-900/10',
          icon: <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />,
        };
      case 'error':
        return {
          bg: 'bg-white border-red-200 shadow-xl shadow-red-900/10',
          icon: <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />,
        };
      case 'warning':
        return {
          bg: 'bg-white border-amber-200 shadow-xl shadow-amber-900/10',
          icon: <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0" />,
        };
      case 'info':
      default:
        return {
          bg: 'bg-white border-gray-200 shadow-xl shadow-gray-900/10',
          icon: <Info className="w-5 h-5 text-[#E53935] shrink-0" />,
        };
    }
  };

  return (
    <ToastContext.Provider value={toastMethods}>
      {children}

      {/* TOP-CENTER FIXED CONTAINER AT TOP-3 */}
      <div 
        className="fixed top-3 z-99999 flex flex-col items-center pointer-events-none w-full max-w-md px-4"
        style={{
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 99999,
        }}
      >
        {toasts.map((t) => {
          const styles = getToastStyles(t.type);
          return (
            <div
              key={t.id}
              className={`pointer-events-auto w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 animate-toast-in ${styles.bg}`}
              role="alert"
            >
              <div className="flex items-center gap-3">
                {styles.icon}
                <span className="text-[#1F2937] text-xs sm:text-sm leading-tight font-semibold">
                  {t.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors cursor-pointer"
                aria-label="Close notification"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
