import React from 'react';
import { Sparkles, X, AlertTriangle, AlertCircle, Info } from 'lucide-react';

export interface ToastProps {
  message: string;
  type?: 'success' | 'warning' | 'error' | 'info';
  onDismiss: () => void;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'success',
  onDismiss,
}) => {
  const getIcon = () => {
    switch (type) {
      case 'warning':
        return <AlertTriangle size={16} className="toast-icon-warning" />;
      case 'error':
        return <AlertCircle size={16} className="toast-icon-error" />;
      case 'info':
        return <Info size={16} className="toast-icon-info" />;
      default:
        return <Sparkles size={16} className="toast-icon-success" />;
    }
  };

  return (
    <div className={`toast-notification toast-${type}`} role="status" aria-live="polite">
      <div className="toast-icon">{getIcon()}</div>
      <span className="toast-message">{message}</span>
      <button
        type="button"
        className="toast-close"
        onClick={onDismiss}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
};
