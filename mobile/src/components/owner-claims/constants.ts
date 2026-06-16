import type { Claim } from './types';

export const CAT_LABELS: Record<string, string> = {
  PLUMBING: 'Plomería',
  ELECTRICITY: 'Electricidad',
  STRUCTURE: 'Estructura',
  OTHER: 'Otro',
};

export const PRIORITY_STYLE: Record<string, { label: string; color: string }> = {
  HIGH: { label: 'Urgente', color: '#dc2626' },
  MEDIUM: { label: 'Media', color: '#d97706' },
  LOW: { label: 'Baja', color: '#6b7280' },
};

export const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'OPEN', label: 'Abiertos' },
  { key: 'IN_PROGRESS', label: 'En curso' },
  { key: 'RESOLVED', label: 'Resueltos' },
];

export function claimLabel(c: Claim) {
  return c.title ?? CAT_LABELS[c.category] ?? c.category;
}
