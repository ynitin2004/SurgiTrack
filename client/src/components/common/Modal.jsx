import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

// Accessible dialog: ESC / backdrop close, focus moves into the dialog and
// returns to the previously focused element on close.
export default function Modal({ open, onClose, title, children, size = 'md', bare = false, labelledBy }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    const t = setTimeout(() => ref.current?.querySelector('input,select,textarea,button')?.focus(), 30);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  const width = { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl' }[size];

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={onClose} aria-hidden />
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy || (title ? 'modal-title' : undefined)}
        className={`pop-in relative w-full ${width} overflow-hidden rounded-2xl bg-surface shadow-2xl`}
      >
        {!bare && (
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 id="modal-title" className="text-base font-bold text-ink">
              {title}
            </h2>
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-ink" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>,
    document.body
  );
}
