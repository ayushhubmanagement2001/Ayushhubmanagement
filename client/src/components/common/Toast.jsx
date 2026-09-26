import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export const Toast = ({
  type = 'info',
  message,
  onClose,
  className = '',
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-[#F59E0B] shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 text-[#E53935] shrink-0" />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case 'success':
        return 'border-green-200';
      case 'error':
        return 'border-red-200';
      case 'warning':
        return 'border-amber-200';
      default:
        return 'border-gray-200';
    }
  };

  return (
    <div
      className={`
        flex items-center justify-between gap-3 px-4 py-3 bg-white rounded-lg border shadow-lg
        text-sm font-medium ${getBorderColor()} ${className}
      `}
      role="alert"
    >
      <div className="flex items-center gap-3">
        {getIcon()}
        <span className="text-[#1F2937] leading-tight">{message}</span>
      </div>
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};
