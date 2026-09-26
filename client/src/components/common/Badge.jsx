import React from 'react';

export const Badge = ({
  children,
  variant = 'neutral',
  size = 'md',
  dot = false,
  className = '',
  onClick,
}) => {
  const sizeStyles = {
    sm: 'text-[11px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
  };

  const variantStyles = {
    primary: 'bg-[#FFEBEE] text-[#E53935] border border-[#FFCDD2]',
    success: 'bg-[#DCFCE7] text-[#15803D] border border-[#BBF7D0]',
    warning: 'bg-[#FEF3C7] text-[#B45309] border border-[#FDE68A]',
    danger: 'bg-[#FEE2E2] text-[#B91C1C] border border-[#FECACA]',
    neutral: 'bg-gray-100 text-gray-700 border border-gray-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
  };

  const dotColors = {
    primary: 'bg-[#E53935]',
    success: 'bg-[#16A34A]',
    warning: 'bg-[#F59E0B]',
    danger: 'bg-[#DC2626]',
    neutral: 'bg-gray-500',
    info: 'bg-blue-600',
  };

  // Helper mapping for common status values
  const normalizedVariant = (() => {
    if (variantStyles[variant]) return variant;
    const lower = String(variant).toLowerCase();
    if (lower === 'paid' || lower === 'active' || lower === 'approved') return 'success';
    if (lower === 'pending' || lower === 'hold' || lower === 'review') return 'warning';
    if (lower === 'inactive' || lower === 'rejected' || lower === 'danger') return 'danger';
    return 'neutral';
  })();

  return (
    <span
      onClick={onClick}
      className={`
        inline-flex items-center font-medium rounded-full transition-colors whitespace-nowrap
        ${sizeStyles[size] || sizeStyles.md}
        ${variantStyles[normalizedVariant] || variantStyles.neutral}
        ${onClick ? 'cursor-pointer hover:opacity-80' : ''}
        ${className}
      `}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColors[normalizedVariant] || 'bg-gray-400'}`}
        />
      )}
      {children}
    </span>
  );
};
