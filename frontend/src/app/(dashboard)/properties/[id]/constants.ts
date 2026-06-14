'use client';

export const PORTALS = [
  { key: 'ZONAPROP', name: 'ZonaProp', color: '#ffc800' },
  { key: 'ARGENPROP', name: 'ArgenProp', color: '#e4002b' },
  { key: 'MERCADOLIBRE', name: 'MercadoLibre', color: '#3483fa' },
];

export const TYPE_LABELS: Record<string, string> = {
  APARTMENT: 'Departamento', HOUSE: 'Casa', COMMERCIAL: 'Comercial', PH: 'PH',
};

export const STATUS_LABELS: Record<string, string> = {
  OPEN: 'Abierto', IN_PROGRESS: 'En curso', RESOLVED: 'Resuelto',
};

export const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  HIGH:   { label: 'Alta',  color: '#dc2626' },
  MEDIUM: { label: 'Media', color: '#d97706' },
  LOW:    { label: 'Baja',  color: '#6b7280' },
};

export function nextStatuses(current: string) {
  if (current === 'OPEN')        return [{ value: 'IN_PROGRESS', label: 'En curso' }, { value: 'RESOLVED', label: 'Resuelto' }];
  if (current === 'IN_PROGRESS') return [{ value: 'OPEN', label: 'Reabrir' }, { value: 'RESOLVED', label: 'Resuelto' }];
  return [];
}

export const CAT_LABELS: Record<string, string> = {
  PLUMBING: 'Plomería', ELECTRICITY: 'Electricidad', STRUCTURE: 'Estructura', OTHER: 'Otro',
};

export const tabs = [
  ['overview', 'General'], ['contract', 'Contrato'], ['tenant', 'Inquilino'],
  ['payments', 'Pagos'], ['claims', 'Reclamos'], ['adjustments', 'Ajustes'], ['photos', 'Fotos'],
  ['expensas', 'Expensas'], ['portals', 'Portales'],
];

export { INDEX_BY_COUNTRY } from '@/lib/constants';
