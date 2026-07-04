'use client';

import { memo } from 'react';
import { useTranslation } from 'react-i18next';

const colors: Record<string, { bg: string; text: string }> = {
  TRANSFER: { bg: 'var(--purple-bg)', text: 'var(--purple)' },
  CASH: { bg: 'var(--accent-bg)', text: 'var(--accent)' },
  MERCADO_PAGO: { bg: 'var(--info-bg)', text: 'var(--info)' },
};

const MethodBadge = memo(function MethodBadge({ method }: { method?: string | null }) {
  const { t } = useTranslation('domain');
  const key = method?.toUpperCase().replace(/\s+/g, '_') ?? '';
  const label = key ? t(`paymentMethod.${key}`, { defaultValue: method ?? '—' }) : (method ?? '—');
  const color = colors[key] ?? { bg: 'var(--bg-elevated)', text: 'var(--text-muted)' };
  return (
    <span
      style={{
        fontSize: 12,
        fontWeight: 600,
        color: color.text,
        background: color.bg,
        padding: '2px 8px',
        borderRadius: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
  );
});

export default MethodBadge;
