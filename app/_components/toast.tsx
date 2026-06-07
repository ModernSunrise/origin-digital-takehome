'use client';

import { createContext, useCallback, useContext, useState } from 'react';

type Variant = 'info' | 'success' | 'error';
type Toast = { id: number; message: string; variant: Variant };
type Push = (message: string, variant?: Variant) => void;

const Ctx = createContext<Push | null>(null);
let seq = 0;

const VARIANT: Record<Variant, { cls: string; glyph: string }> = {
  info: { cls: 'border-edge text-muted', glyph: '›' },
  success: { cls: 'border-accent/45 text-accent', glyph: '✓' },
  error: { cls: 'border-danger/45 text-danger', glyph: '✗' },
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
      {/* Live region: every save/release and business-rule rejection is announced to AT. */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="pointer-events-none fixed bottom-5 right-5 z-50 flex w-80 max-w-[calc(100vw-2.5rem)] flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`fade-up pointer-events-auto rounded-md border bg-panel/95 px-3.5 py-2.5 font-mono text-xs shadow-xl shadow-black/40 ${VARIANT[t.variant].cls}`}
          >
            <span className="mr-1.5 opacity-70" aria-hidden>
              {VARIANT[t.variant].glyph}
            </span>
            {t.message}
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
