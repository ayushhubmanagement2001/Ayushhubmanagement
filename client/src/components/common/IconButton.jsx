import React from 'react';

export const IconButton = ({
  icon: Icon,
  variant = 'ghost',
  size = 'md',
  disabled = false,
  title = '',
  className = '',
  onClick,
  ...props
}) => {
  const sizeStyles = {
    xs: 'p-1 rounded',
    sm: 'p-1.5 rounded-md',
    md: 'p-2 rounded-lg',
    lg: 'p-2.5 rounded-lg',
  };

  const iconSizes = {
    xs: 'w-3.5 h-3.5',
    sm: 'w-4 h-4',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
  };

  const variantStyles = {
    ghost: 'text-gray-500 hover:text-gray-900 hover:bg-gray-100',
    primary: 'bg-[#E53935] text-white hover:bg-[#D32F2F]',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
    danger: 'text-red-600 hover:bg-red-50',
  };

  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`
        inline-flex items-center justify-center transition-colors focus:outline-none cursor-pointer
        ${sizeStyles[size] || sizeStyles.md}
        ${variantStyles[variant] || variantStyles.ghost}
        ${disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''}
        ${className}
      `}
      {...props}
    >
      {Icon && <Icon className={iconSizes[size] || 'w-4 h-4'} />}
    </button>
  );
};
