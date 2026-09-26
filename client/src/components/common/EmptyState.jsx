import React from 'react';
import { FolderOpen, SearchX, Inbox } from 'lucide-react';
import { Button } from './Button';

export const EmptyState = ({
  icon: Icon = Inbox,
  title = 'No data found',
  description = 'There are no records to display at this moment.',
  actionLabel,
  onAction,
  actionIcon,
  actionDisabled = false,
  className = '',
}) => {
  return (
    <div className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-white rounded-xl ${className}`}>
      <div className="w-12 h-12 rounded-full bg-red-50 text-[#E53935] flex items-center justify-center mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-base font-semibold text-[#1F2937]">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm mt-1 mb-6 leading-relaxed">{description}</p>
      {actionLabel && onAction && (
        <Button
          variant="primary"
          size="sm"
          icon={actionIcon}
          onClick={onAction}
          disabled={actionDisabled}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
};
