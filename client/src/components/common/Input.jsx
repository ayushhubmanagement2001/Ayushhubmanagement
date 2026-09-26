import React from 'react';

export const Input = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  placeholder = '',
  error = '',
  helperText = '',
  disabled = false,
  required = false,
  icon: Icon,
  rightElement,
  className = '',
  inputClassName = '',
  ...props
}) => {
  const handleChange = (e) => {
    if (!onChange) return;
    if (type === 'number') {
      let raw = e.target.value;
      if (raw && /^0+[0-9]+/.test(raw)) {
        e.target.value = raw.replace(/^0+/, '');
      }
    }
    onChange(e);
  };

  const handleFocus = (e) => {
    if (type === 'number') {
      e.target.select();
    }
    if (props.onFocus) {
      props.onFocus(e);
    }
  };

  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      {label && (
        <label htmlFor={name} className="text-xs font-semibold text-gray-700 flex items-center justify-between">
          <span>
            {label} {required && <span className="text-red-500">*</span>}
          </span>
        </label>
      )}
      <div className="relative flex items-center">
        {Icon && (
          <div className="absolute left-3 text-gray-400 pointer-events-none flex items-center">
            <Icon className="w-4 h-4" />
          </div>
        )}
        <input
          id={name}
          name={name}
          type={type}
          value={type === 'number' && (value === 0 || value === '0') ? '' : (value ?? '')}
          onChange={handleChange}
          onFocus={handleFocus}
          placeholder={placeholder || (type === 'number' ? '0' : '')}
          disabled={disabled}
          required={required}
          className={`
            w-full bg-white text-sm text-[#1F2937] placeholder-gray-400 rounded-lg border transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-[#E53935]/20 focus:border-[#E53935]
            ${Icon ? 'pl-9' : 'pl-3.5'}
            ${rightElement ? 'pr-10' : 'pr-3.5'}
            py-2.5
            ${error ? 'border-red-400 focus:ring-red-200 focus:border-red-500 bg-red-50/20' : 'border-[#E5E7EB] hover:border-gray-400'}
            ${disabled ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' : ''}
            ${inputClassName}
          `}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error && <span className="text-xs text-red-600 font-medium">{error}</span>}
      {helperText && !error && <span className="text-xs text-gray-500">{helperText}</span>}
    </div>
  );
};
