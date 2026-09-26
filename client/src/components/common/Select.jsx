import React from 'react';
import { ChevronDown } from 'lucide-react';

export const Select = ({
  label,
  name,
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  error = '',
  helperText = '',
  disabled = false,
  required = false,
  className = '',
  selectClassName = '',
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={name} className="text-xs font-semibold text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative flex items-center">
        <select
          id={name}
          name={name}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`
            w-full appearance-none bg-white text-sm text-[#1F2937] rounded-lg border py-2.5 pl-3.5 pr-10 transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] cursor-pointer
            ${error ? 'border-red-400 focus:ring-red-200 focus:border-red-500' : 'border-[#E5E7EB] hover:border-gray-400'}
            ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : ''}
            ${selectClassName}
          `}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((opt) => {
            const val = typeof opt === 'object' ? opt.value : opt;
            const lbl = typeof opt === 'object' ? opt.label : opt;
            return (
              <option key={val} value={val}>
                {lbl}
              </option>
            );
          })}
        </select>
        <div className="absolute right-3 pointer-events-none text-gray-400">
          <ChevronDown className="w-4 h-4" />
        </div>
      </div>
      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
      {helperText && !error && <span className="text-xs text-gray-500">{helperText}</span>}
    </div>
  );
};
