import React from 'react';
import { useLock } from '../../context/LockContext';

export const ProtectedAction = ({
  children,
  actionName = 'perform this action',
  customFallback,
  showToastOnBlockedClick = true,
  disabled: externalDisabled = false,
  className = '',
}) => {
  const { canEdit, notifyLocked } = useLock();

  const handleBlockedClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (showToastOnBlockedClick) {
      notifyLocked(actionName);
    }
  };

  if (!canEdit) {
    if (customFallback) {
      return customFallback;
    }

    // Clone child element to inject disabled and title attributes, or wrap in a container
    if (React.isValidElement(children)) {
      return (
        <div
          className={`inline-block relative cursor-not-allowed ${className}`}
          onClickCapture={handleBlockedClick}
          title="Dashboard is locked. Turn on Edit Mode to make changes."
        >
          {React.cloneElement(children, {
            disabled: true,
            'aria-disabled': true,
            className: `${children.props.className || ''} pointer-events-none opacity-60`,
          })}
        </div>
      );
    }

    return (
      <div
        className={`inline-block cursor-not-allowed opacity-60 ${className}`}
        onClick={handleBlockedClick}
        title="Dashboard is locked. Turn on Edit Mode to make changes."
      >
        {children}
      </div>
    );
  }

  return children;
};
