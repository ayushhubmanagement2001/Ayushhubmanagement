import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';

/**
 * Common Reusable Modal Component
 * Used across the entire application for forms, detail views, and popups.
 */
export const Modal = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  footer,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  confirmVariant = 'primary',
  confirmLoading = false,
  confirmDisabled = false,
  maxWidth = 'max-w-lg', // max-w-sm, max-w-md, max-w-lg, max-w-xl, max-w-2xl
  position = 'center', // 'center' | 'top'
  showClose = true,
  closeOnBackdrop = true,
}) => {
  const modalRef = useRef(null);

  // Close on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
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

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto flex p-4 sm:p-6 animate-fadeIn ${
        position === 'top' ? 'items-start justify-center pt-8 sm:pt-12' : 'items-center justify-center'
      }`}
    >
      {/* Backdrop with soft blur */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={() => closeOnBackdrop && onClose()}
      />

      {/* Modal Dialog */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        className={`
          relative w-full ${maxWidth} bg-white rounded-2xl shadow-2xl border border-gray-100
          overflow-hidden transform transition-all duration-200 z-10 my-4 sm:my-8 animate-in fade-in zoom-in-95
        `}
      >
        {/* Header */}
        {(title || showClose) && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-white">
            <div>
              {title && <h3 className="text-base sm:text-lg font-bold text-gray-900">{title}</h3>}
              {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
            </div>
            {showClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div className="px-6 py-5 max-h-[calc(85vh-140px)] overflow-y-auto">{children}</div>

        {/* Footer */}
        {footer !== undefined ? (
          footer
        ) : confirmLabel ? (
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-gray-50 border-t border-[#E5E7EB]">
            {cancelLabel && (
              <button
                type="button"
                onClick={onClose}
                disabled={confirmLoading}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition-colors shadow-2xs cursor-pointer"
              >
                {cancelLabel}
              </button>
            )}
            <button
              type="button"
              onClick={onConfirm}
              disabled={confirmLoading || confirmDisabled}
              className="px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer bg-[#FFEBEE] text-[#E53935] border border-[#FFCDD2] hover:bg-red-100"
            >
              {confirmLoading ? 'Processing...' : confirmLabel}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
