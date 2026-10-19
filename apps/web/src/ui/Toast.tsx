import { useEffect, useState } from 'react';
import type { Toast as ToastData } from '../game/GameController';

export function Toast({ toast }: { toast: ToastData | null }) {
  const [visibleId, setVisibleId] = useState<number | null>(null);
  useEffect(() => {
    if (!toast) return;
    setVisibleId(toast.id);
    const t = window.setTimeout(() => setVisibleId(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);
  const show = toast !== null && visibleId === toast.id;
  return (
    <div
      className={`toast ${toast?.tone ?? ''}${show ? ' show' : ''}`}
      role="status"
      aria-live="polite"
    >
      {toast?.text}
    </div>
  );
}
