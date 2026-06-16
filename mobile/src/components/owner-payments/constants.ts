export const FILTERS: [string, string][] = [
  ['all', 'Todos'],
  ['PAID', 'Pagados'],
  ['PENDING', 'Pendientes'],
  ['PENDING_CONFIRMATION', 'A confirmar'],
  ['LATE', 'En mora'],
];

export const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PAID: { label: 'Pagado', color: '#16a34a', bg: '#dcfce7' },
  PENDING: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7' },
  LATE: { label: 'En mora', color: '#dc2626', bg: '#fee2e2' },
  PENDING_CONFIRMATION: { label: 'A confirmar', color: '#c2410c', bg: '#ffedd5' },
};

export const METHODS = ['Efectivo', 'Mercado Pago', 'Transferencia'];

export const METHOD_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Efectivo: { label: 'Efectivo', color: '#166534', bg: '#dcfce7' },
  'Mercado Pago': { label: 'Mercado Pago', color: '#1d4ed8', bg: '#dbeafe' },
  Transferencia: { label: 'Transferencia', color: '#374151', bg: '#f3f4f6' },
};

export const INSTALLMENT_COUNTS = [2, 3, 4, 6];
