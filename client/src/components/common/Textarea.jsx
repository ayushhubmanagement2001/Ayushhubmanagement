import React from 'react';

export const Textarea = ({
  label,
  name,
  value,
  onChange,
  placeholder = '',
  rows = 3,
  error = '',
  helperText = '',
  disabled = false,
  required = false,
  className = '',
  textareaClassName = '',
  ...props
}) => {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={name} className="text-xs font-semibold text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        required={required}
        className={`
          w-full bg-white text-sm text-[#1F2937] placeholder-gray-400 rounded-lg border p-3 transition-all duration-150
          focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935] resize-y
          ${error ? 'border-red-400 focus:ring-red-200 focus:border-red-500 bg-red-50/20' : 'border-[#E5E7EB] hover:border-gray-400'}
          ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : ''}
          ${textareaClassName}
        `}
        {...props}
      />
      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
      {helperText && !error && <span className="text-xs text-gray-500">{helperText}</span>}
    </div>
  );
};
