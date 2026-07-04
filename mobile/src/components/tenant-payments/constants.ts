// Valores de filtro (claves de estado); la etiqueta la resuelve el componente
// con `filterLabel(key)` (t('filters.all') / t('domain:paymentStatus.<key>')).
export const FILTERS: string[] = ['', 'PAID', 'PENDING', 'LATE', 'PENDING_CONFIRMATION'];

// `label` guarda la CLAVE del enum de dominio (domain:paymentStatus.*); el
// componente que renderiza traduce con `t('domain:paymentStatus.<status>')`.
export const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PAID: { label: 'PAID', color: '#16a34a', bg: '#dcfce7' },
  PENDING: { label: 'PENDING', color: '#b45309', bg: '#fef3c7' },
  LATE: { label: 'LATE', color: '#dc2626', bg: '#fee2e2' },
  PENDING_CONFIRMATION: { label: 'PENDING_CONFIRMATION', color: '#c2410c', bg: '#ffedd5' },
};
