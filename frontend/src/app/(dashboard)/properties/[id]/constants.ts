'use client';

export const PORTALS = [
  { key: 'ZONAPROP', name: 'ZonaProp', color: '#ffc800' },
  { key: 'ARGENPROP', name: 'ArgenProp', color: '#e4002b' },
  { key: 'MERCADOLIBRE', name: 'MercadoLibre', color: '#3483fa' },
];

// Colores por prioridad de reclamo. El texto visible se traduce en el consumidor
// con t('domain:claimPriority.<KEY>'); acá solo vive la presentación.
export const PRIORITY_COLORS: Record<string, string> = {
  HIGH:   'var(--danger)',
  MEDIUM: 'var(--warning)',
  LOW:    'var(--text-muted)',
};

// Transiciones de estado de un reclamo. La etiqueta la traduce el consumidor.
export function nextStatuses(current: string): string[] {
  if (current === 'OPEN')        return ['IN_PROGRESS', 'RESOLVED'];
  if (current === 'IN_PROGRESS') return ['OPEN', 'RESOLVED'];
  return [];
}

export const tabs = ['overview', 'contract', 'tenant', 'payments', 'claims', 'adjustments', 'photos', 'expensas', 'portals'];

export { INDEX_BY_COUNTRY } from '@/lib/constants';
