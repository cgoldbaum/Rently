'use client';
import { useEffect } from 'react';
import Icon from './Icon';

export default function Toast({ message, onClose }: { message: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3000);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className="toast">
      <Icon name="check" size={18} color="var(--accent)" />
      {message}
    </div>
  );
}
