// Claves de filtro; la etiqueta se traduce en el componente:
// 'all' → t('filters.all'), el resto → t('domain:paymentStatus.<key>').
export const FILTERS: string[] = ['all', 'PAID', 'PENDING', 'LATE'];

// `label` guarda la CLAVE del enum de dominio (domain:paymentStatus.*); el
// componente que renderiza traduce con `t('domain:paymentStatus.<status>')`.
export const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PAID: { label: 'PAID', color: '#16a34a', bg: '#dcfce7' },
  PENDING: { label: 'PENDING', color: '#b45309', bg: '#fef3c7' },
  LATE: { label: 'LATE', color: '#dc2626', bg: '#fee2e2' },
  PENDING_CONFIRMATION: { label: 'PENDING_CONFIRMATION', color: '#c2410c', bg: '#ffedd5' },
};

// Valores de método persistidos/comparados (no son texto visible): se muestran
// traduciendo con `t('domain:paymentMethod.<key>')` vía METHOD_CONFIG.label.
export const METHODS = ['Efectivo', 'Mercado Pago', 'Transferencia'];

export const METHOD_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Efectivo: { label: 'CASH', color: '#166534', bg: '#dcfce7' },
  'Mercado Pago': { label: 'MERCADO_PAGO', color: '#1d4ed8', bg: '#dbeafe' },
  Transferencia: { label: 'TRANSFER', color: '#374151', bg: '#f3f4f6' },
};

export const INSTALLMENT_COUNTS = [2, 3, 4, 6];
