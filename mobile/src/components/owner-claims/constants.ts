import type { TFunction } from 'i18next';
import type { Claim } from './types';

// `label` guarda la CLAVE del enum (domain:claimPriority.*); el componente traduce
// al renderizar con `t('domain:claimPriority.<priority>')`. Aquí sólo importa el color.
export const PRIORITY_STYLE: Record<string, { label: string; color: string }> = {
  HIGH: { label: 'HIGH', color: '#dc2626' },
  MEDIUM: { label: 'MEDIUM', color: '#d97706' },
  LOW: { label: 'LOW', color: '#6b7280' },
};

// Sin `title`, el título visible es la categoría traducida (domain:claimCategory.*).
export function claimLabel(c: Claim, t: TFunction) {
  return c.title ?? t(`domain:claimCategory.${c.category}`);
}
