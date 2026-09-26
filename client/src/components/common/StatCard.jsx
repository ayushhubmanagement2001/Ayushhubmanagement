import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';

export const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  iconColor = 'text-[#E53935]',
  iconBg = 'bg-[#FFEBEE]',
  trend, // { value: '+12.5%', isPositive: true, label: 'vs last month' }
  className = '',
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`
        bg-white rounded-xl border border-[#E5E7EB] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]
        transition-all duration-150 hover:border-gray-300
        ${onClick ? 'cursor-pointer hover:shadow-sm' : ''}
        ${className}
      `}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <span className="text-xs font-medium text-gray-500 tracking-wide uppercase">{title}</span>
          <div className="text-2xl font-bold text-[#1F2937] tracking-tight">{value}</div>
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${iconBg} ${iconColor} shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>

      {(trend || description) && (
        <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
          {trend && (
            <div className="flex items-center gap-1.5 font-medium">
              <span
                className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[11px] font-semibold ${
                  trend.isPositive
                    ? 'bg-green-50 text-green-700'
                    : trend.isNeutral
                    ? 'bg-gray-100 text-gray-600'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {trend.isPositive ? (
                  <ArrowUpRight className="w-3 h-3" />
                ) : trend.isNeutral ? (
                  <Minus className="w-3 h-3" />
                ) : (
                  <ArrowDownRight className="w-3 h-3" />
                )}
                {trend.value}
              </span>
              {trend.label && <span className="text-gray-500 text-[11px]">{trend.label}</span>}
            </div>
          )}
          {description && !trend && (
            <span className="text-gray-500 text-xs truncate">{description}</span>
          )}
        </div>
      )}
    </div>
  );
};
