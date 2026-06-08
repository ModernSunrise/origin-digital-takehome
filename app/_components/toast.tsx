'use client';

import { createContext, useCallback, useContext, useState } from 'react';
import { AlertCircle, CheckCircle, X } from 'lucide-react';

type Variant = 'info' | 'success' | 'error';
type Toast = { id: number; message: string; variant: Variant };
type Push = (message: string, variant?: Variant) => void;

const Ctx = createContext<Push | null>(null);
let seq = 0;

const ICON: Record<Variant, React.ReactNode> = {
  success: <CheckCircle size={16} strokeWidth={2.2} />,
  error: <X size={16} strokeWidth={2.2} />,
  info: <AlertCircle size={16} strokeWidth={2.2} />,
};

export function ToastProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback<Push>((message, variant = 'info') => {
    const id = (seq += 1);
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  return (
    <Ctx.Provider value={push}>
      {children}
      <div
        aria-live="polite"
        role="status"
        className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[340px] max-w-[calc(100vw-40px)] flex-col gap-2.5"
      >
        {toasts.map((t) => (
          <div key={t.id} className={`dh-toast dh-toast--${t.variant} pointer-events-auto`}>
            <span className="dh-toast__icon" aria-hidden>
              {ICON[t.variant]}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast(): Push {
  const value = useContext(Ctx);
  if (!value) throw new Error('useToast must be used within ToastProvider');
  return value;
}
