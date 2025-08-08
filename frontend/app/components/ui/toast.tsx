
'use client';
import { createContext, useContext, useState, ReactNode } from 'react';

type Toast = { id: number; title?: string; description?: string };
type ToastContextType = {
  show: (t: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextType>({ show: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = (t: Omit<Toast, 'id'>) => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, ...t }]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== id)), 4000);
  };

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-4 right-4 space-y-2 z-50">
        {toasts.map(t => (
          <div key={t.id} className="bg-gray-900 text-white rounded px-4 py-3 shadow-lg min-w-[260px]">
            {t.title && <div className="font-semibold">{t.title}</div>}
            {t.description && <div className="text-sm mt-1">{t.description}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
