import type { TabKey } from './types';

export const TABS: [TabKey, string][] = [
  ['overview', 'General'],
  ['contract', 'Contrato'],
  ['tenant', 'Inquilino'],
  ['payments', 'Pagos'],
  ['claims', 'Reclamos'],
  ['adjustments', 'Ajustes'],
  ['photos', 'Fotos'],
  ['expensas', 'Expensas'],
  ['portals', 'Portales'],
];

export const TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Departamento',
  HOUSE: 'Casa',
  COMMERCIAL: 'Comercial',
  PH: 'PH',
  GARAGE: 'Cochera',
  DUPLEX: 'Dúplex',
};

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

export const PAY_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PAID: { label: 'Pagado', color: '#16a34a', bg: '#dcfce7' },
  PENDING: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7' },
  LATE: { label: 'Vencido', color: '#dc2626', bg: '#fee2e2' },
  PENDING_CONFIRMATION: { label: 'A confirmar', color: '#c2410c', bg: '#ffedd5' },
};

export const CLAIM_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Abierto', color: '#b45309', bg: '#fef3c7' },
  IN_PROGRESS: { label: 'En curso', color: '#1d4ed8', bg: '#dbeafe' },
  RESOLVED: { label: 'Resuelto', color: '#16a34a', bg: '#dcfce7' },
};

export const CAT_LABELS: Record<string, string> = {
  PLUMBING: 'Plomería',
  ELECTRICITY: 'Electricidad',
  STRUCTURE: 'Estructura',
  OTHER: 'Otro',
};

export function periodLabel(period: string) {
  const [y, m] = period.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('es-AR', {
    month: 'long',
    year: 'numeric',
  });
}
