import type { TabKey } from './types';

// Claves de tab; la etiqueta visible la resuelve el componente con `t('tabs.<key>')`.
export const TABS: TabKey[] = [
  'overview',
  'contract',
  'tenant',
  'payments',
  'claims',
  'adjustments',
  'photos',
  'expensas',
  'portals',
];

export const STATUS_LABELS: Record<string, string> = {
  OCCUPIED: 'Ocupada',
  VACANT: 'Vacante',
  EXPIRING: 'Por vencer',
  ARREARS: 'En mora',
};

export const STATUS_COLORS: Record<string, string> = {
  OCCUPIED: '#22c55e',
  VACANT: '#6b7280',
  EXPIRING: '#f59e0b',
  ARREARS: '#ef4444',
};

export const INDEX_LABELS: Record<string, string> = { IPC: 'IPC', ICL: 'ICL', MANUAL: 'Manual' };

// `label` guarda la CLAVE del enum de dominio; el componente traduce al renderizar
// (t('domain:paymentStatus.*') / t('domain:claimStatus.*')).
export const PAY_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PAID: { label: 'PAID', color: '#16a34a', bg: '#dcfce7' },
  PENDING: { label: 'PENDING', color: '#b45309', bg: '#fef3c7' },
  LATE: { label: 'LATE', color: '#dc2626', bg: '#fee2e2' },
  PENDING_CONFIRMATION: { label: 'PENDING_CONFIRMATION', color: '#c2410c', bg: '#ffedd5' },
};

export const CLAIM_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'OPEN', color: '#b45309', bg: '#fef3c7' },
  IN_PROGRESS: { label: 'IN_PROGRESS', color: '#1d4ed8', bg: '#dbeafe' },
  RESOLVED: { label: 'RESOLVED', color: '#16a34a', bg: '#dcfce7' },
};

export function periodLabel(period: string) {
  const [y, m] = period.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
}
