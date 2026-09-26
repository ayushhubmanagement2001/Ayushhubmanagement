import React from 'react';
import { Loader2 } from 'lucide-react';

export const Button = ({
  children,
  type = 'button',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  onClick,
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 select-none cursor-pointer';

  const sizeStyles = {
    xs: 'text-xs px-2.5 py-1.5 gap-1.5',
    sm: 'text-xs px-3 py-2 gap-2',
    md: 'text-sm px-4 py-2.5 gap-2',
    lg: 'text-base px-5 py-3 gap-2.5',
  };

  const variantStyles = {
    primary:
      'bg-[#E53935] hover:bg-[#D32F2F] text-white shadow-sm focus:ring-[#E53935] active:bg-[#C62828] border border-transparent',
    secondary:
      'bg-white hover:bg-gray-50 text-[#1F2937] border border-[#E5E7EB] shadow-xs focus:ring-gray-300 active:bg-gray-100',
    outline:
      'bg-transparent hover:bg-red-50 text-[#E53935] border border-[#E53935] focus:ring-[#E53935]',
    danger:
      'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm focus:ring-[#DC2626] border border-transparent',
    ghost:
      'bg-transparent hover:bg-gray-100 text-[#4B5563] hover:text-[#1F2937] focus:ring-gray-300 border border-transparent',
    success:
      'bg-[#16A34A] hover:bg-[#15803D] text-white shadow-sm focus:ring-[#16A34A] border border-transparent',
  };

  const disabledStyles = 'opacity-50 cursor-not-allowed pointer-events-none shadow-none';

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`
        ${baseStyles}
        ${sizeStyles[size] || sizeStyles.md}
        ${variantStyles[variant] || variantStyles.primary}
        ${disabled || loading ? disabledStyles : ''}
        ${fullWidth ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          <span>{children}</span>
        </>
      ) : (
        <>
          {Icon && iconPosition === 'left' && <Icon className="w-4 h-4 shrink-0" />}
          <span>{children}</span>
          {Icon && iconPosition === 'right' && <Icon className="w-4 h-4 shrink-0" />}
        </>
      )}
    </button>
  );
};
