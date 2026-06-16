export const FILTERS: [string, string][] = [
  ['', 'Todos'],
  ['PAID', 'Pagados'],
  ['PENDING', 'Pendientes'],
  ['LATE', 'Vencidos'],
  ['PENDING_CONFIRMATION', 'En confirmación'],
];

export const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PAID: { label: 'Pagado', color: '#16a34a', bg: '#dcfce7' },
  PENDING: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7' },
  LATE: { label: 'Vencido', color: '#dc2626', bg: '#fee2e2' },
  PENDING_CONFIRMATION: { label: 'Pend. confirmación', color: '#c2410c', bg: '#ffedd5' },
};
