/**
 * Estilos canónicos de estado de reclamo (enum ClaimStatus: OPEN / IN_PROGRESS /
 * RESOLVED). Se usa en las vistas de inquilino y propietario para que el mismo
 * estado se vea igual en ambos roles.
 */
// `label` guarda la CLAVE del enum (domain:claimStatus.*); los componentes
// traducen al renderizar con `t('domain:claimStatus.<status>')`.
export const CLAIM_STATUS: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'OPEN', color: '#dc2626', bg: '#fef2f2' },
  IN_PROGRESS: { label: 'IN_PROGRESS', color: '#d97706', bg: '#fffbeb' },
  RESOLVED: { label: 'RESOLVED', color: '#16a34a', bg: '#f0fdf4' },
};

export function claimStatusStyle(status: string) {
  return CLAIM_STATUS[status] ?? { label: status, color: '#6b7280', bg: '#f3f4f6' };
}
