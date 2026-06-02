'use client';

import { memo } from 'react';

const labels: Record<string, string> = {
  TRANSFER: 'Transferencia',
  CASH: 'Efectivo',
  MERCADO_PAGO: 'Mercado Pago',
};

const colors: Record<string, { bg: string; text: string }> = {
  TRANSFER: { bg: '#eef2ff', text: '#4338ca' },
  CASH: { bg: '#f0fdf4', text: '#16a34a' },
  MERCADO_PAGO: { bg: '#f0f9ff', text: '#0284c7' },
};

const MethodBadge = memo(function MethodBadge({ method }: { method?: string | null }) {
  const key = method?.toUpperCase().replace(/\s+/g, '_') ?? '';
  const label = labels[key] ?? method ?? '—';
  const color = colors[key] ?? { bg: '#f3f4f6', text: '#6b7280' };
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
