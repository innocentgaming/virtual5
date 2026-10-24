import React, { useState, useCallback } from 'react';
import { ToastContext, type ToastItem, type ToastType } from './ToastContext';

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 3500) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((prev) => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div
        className="ui-toast-container"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            className={`ui-toast toast-notification ui-toast--${toast.type || 'info'}`}
          >
            <span className="ui-toast__message">{toast.message}</span>
            <button
              type="button"
              className="ui-toast__close toast-close"
              onClick={() => removeToast(toast.id)}
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// Standalone Toast component for simple inline/portal rendering
export interface StandaloneToastProps {
  message: string;
  type?: ToastType;
  onClose?: () => void;
  onDismiss?: () => void;
}

export const Toast: React.FC<StandaloneToastProps> = ({ message, type = 'info', onClose, onDismiss }) => {
  const handleDismiss = onClose || onDismiss;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`ui-toast toast-notification ui-toast--${type} ui-toast--standalone`}
    >
      <span className="ui-toast__message">{message}</span>
      {handleDismiss && (
        <button
          type="button"
          className="ui-toast__close toast-close"
          onClick={handleDismiss}
          aria-label="Dismiss notification"
        >
          ×
        </button>
      )}
    </div>
  );
};
