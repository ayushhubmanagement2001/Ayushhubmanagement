import React, { useRef } from 'react';
import { Search, X } from 'lucide-react';

export const SearchInput = ({
  value,
  onChange,
  placeholder = 'Search...',
  onClear,
  size = 'md',
  className = '',
  disabled = false,
  autoFocus = false,
  ...props
}) => {
  const inputRef = useRef(null);

  const handleClear = () => {
    if (onClear) {
      onClear();
    } else if (onChange) {
      onChange({ target: { value: '' } });
    }
    inputRef.current?.focus();
  };

  const sizeClasses = {
    sm: 'py-1.5 pl-8 pr-7 text-xs',
    md: 'py-2 pl-9 pr-8 text-sm',
    lg: 'py-2.5 pl-10 pr-9 text-base',
  };

  const iconSizes = {
    sm: 'w-3.5 h-3.5 left-2.5',
    md: 'w-4 h-4 left-3',
    lg: 'w-4.5 h-4.5 left-3.5',
  };

  return (
    <div className={`relative flex items-center ${className}`}>
      <div className={`absolute text-gray-400 pointer-events-none flex items-center ${iconSizes[size] || iconSizes.md}`}>
        <Search className="w-full h-full" />
      </div>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        autoFocus={autoFocus}
        className={`
          w-full bg-white text-[#1F2937] placeholder-gray-400 rounded-lg border border-[#E5E7EB] transition-all duration-150
          hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935]
          ${sizeClasses[size] || sizeClasses.md}
          ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : ''}
        `}
        {...props}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-2.5 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          title="Clear search"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
