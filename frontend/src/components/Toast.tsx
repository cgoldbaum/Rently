'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

const DURATION = 3000;
const EXIT_MS = 250;

export default function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  const [visible, setVisible] = useState(false);
  const remaining = useRef(DURATION);
  const startedAt = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Entrada: montamos oculto y activamos en el siguiente frame para que corra la transición.
  useEffect(() => {
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  // Auto-cierre: reproduce la salida y recién ahí desmonta. El timer se pausa
  // cuando la pestaña está oculta, así el toast no se "gasta" en segundo plano.
  useEffect(() => {
    const dismiss = () => {
      setVisible(false);
      setTimeout(onClose, EXIT_MS);
    };
    const start = () => {
      startedAt.current = Date.now();
      timer.current = setTimeout(dismiss, remaining.current);
    };
    const pause = () => {
      clearTimeout(timer.current);
      remaining.current -= Date.now() - startedAt.current;
    };
    const onVisibility = () => (document.hidden ? pause() : start());

    start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      clearTimeout(timer.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [onClose]);

  return (
    <div className="toast" data-visible={visible} role="status" aria-live="polite">
      <Icon name="check" size={18} color="var(--accent)" />
      {message}
    </div>
  );
}
