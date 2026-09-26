import React, { useEffect } from 'react';
import { AlertTriangle, Trash2, Info, X } from 'lucide-react';

/**
 * Top-Center Toast-Style Confirmation Modal
 * Pops up smoothly at the top-center (like toast notifications) with backdrop blur
 */
export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed? This cannot be undone.',
  confirmLabel = 'Yes, Delete',
  cancelLabel = 'Cancel',
  variant = 'danger', // 'danger' | 'warning' | 'primary'
  loading = false,
  icon: CustomIcon,
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const iconConfig = {
    danger: {
      bg: 'bg-red-50 text-[#E53935] border-red-200',
      icon: CustomIcon || Trash2,
      confirmBtn: 'bg-[#E53935] hover:bg-red-700 text-white font-bold',
    },
    warning: {
      bg: 'bg-amber-50 text-amber-600 border-amber-200',
      icon: CustomIcon || AlertTriangle,
      confirmBtn: 'bg-amber-600 hover:bg-amber-700 text-white font-bold',
    },
    primary: {
      bg: 'bg-indigo-50 text-indigo-600 border-indigo-200',
      icon: CustomIcon || Info,
      confirmBtn: 'bg-indigo-600 hover:bg-indigo-700 text-white font-bold',
    },
  };

  const currentConfig = iconConfig[variant] || iconConfig.danger;
  const IconComponent = currentConfig.icon;

  return (
    <div className="fixed inset-0 z-99999 flex items-start justify-center p-3 pt-2 sm:pt-3 overflow-y-auto">
      {/* Dimmed backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Top-Center Toast-Style Dialog Box (Top 0/2) */}
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl border border-gray-200/90 p-4 sm:p-5 z-10 mt-1 sm:mt-2 animate-toast-in transform transition-all duration-200"
      >
        <div className="flex items-start gap-3.5">
          <div className={`p-2.5 rounded-xl shrink-0 border ${currentConfig.bg}`}>
            <IconComponent className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm sm:text-base font-bold text-gray-900 leading-snug">{title}</h3>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors cursor-pointer -mr-1 -mt-1"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{message}</p>

            <div className="mt-4 pt-3 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="px-3 py-1.5 text-xs font-bold rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-2xs cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={loading}
                className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all shadow-xs cursor-pointer ${currentConfig.confirmBtn}`}
              >
                {loading ? 'Processing...' : confirmLabel}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
