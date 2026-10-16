import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react';

const ToastContext = createContext(() => {});

const STYLES = {
  success: { icon: CheckCircle2, cls: 'text-good-ink bg-good-wash' },
  error: { icon: TriangleAlert, cls: 'text-critical bg-critical-wash' },
  info: { icon: Info, cls: 'text-brand-ink bg-brand-wash' },
};

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);
  const toast = useCallback(
    (message, type = 'info') => {
      const id = Math.random().toString(36).slice(2);
      setToasts((t) => [...t.slice(-3), { id, message, type }]);
      setTimeout(() => dismiss(id), 5000);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(92vw,380px)] flex-col gap-2" aria-live="polite">
        {toasts.map((t) => {
          const { icon: Icon, cls } = STYLES[t.type] || STYLES.info;
          return (
            <div key={t.id} className="pop-in pointer-events-auto flex items-start gap-3 rounded-xl border border-line bg-surface p-3 shadow-card">
              <span className={`rounded-lg p-1.5 ${cls}`}>
                <Icon size={16} aria-hidden />
              </span>
              <p className="flex-1 pt-0.5 text-sm text-ink">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="rounded p-1 text-muted hover:text-ink" aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
