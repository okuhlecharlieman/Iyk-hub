import React, { createContext, useCallback, useContext, useState } from 'react';
import Toast from './Toast';

const ToastContext = createContext(() => {});

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((type, message, duration = 3500) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
    setToasts((t) => [...t, { id, type, message }]);
    setTimeout(() => setToasts((t) => t.filter(x => x.id !== id)), duration);
  }, []);

  const dismiss = useCallback((id) => setToasts((t) => t.filter(x => x.id !== id)), []);

  return (
    <ToastContext.Provider value={notify}>
      {children}
      <div aria-live="polite" className="fixed top-6 right-6 z-50 space-y-2 w-full max-w-sm">
        {toasts.map((t) => (
          <div key={t.id}>
            <Toast type={t.type} message={t.message} onClose={() => dismiss(t.id)} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
