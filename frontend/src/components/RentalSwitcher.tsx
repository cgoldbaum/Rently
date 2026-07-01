'use client';

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';

type Rental = {
  tenantId: string;
  propertyId: string;
  propertyName: string;
  propertyAddress: string;
  propertyType: string;
  contractEndDate: string;
};

/**
 * Selector de alquiler para inquilinos con más de un alquiler. Cambia el perfil de
 * inquilino activo (header X-Tenant-Id) y refresca los datos del portal.
 */
export default function RentalSwitcher() {
  const { t } = useTranslation('dashboard');
  const queryClient = useQueryClient();
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const setActiveTenantId = useAuthStore((s) => s.setActiveTenantId);

  const { data: rentals = [] } = useQuery<Rental[]>({
    queryKey: ['tenant-rentals'],
    queryFn: async () => (await api.get('/tenant/rentals')).data.data,
    enabled: typeof window !== 'undefined' && !!sessionStorage.getItem('accessToken'),
  });

  // Si no hay alquiler activo todavía, usar el primero.
  useEffect(() => {
    if (rentals.length > 0 && !activeTenantId) {
      setActiveTenantId(rentals[0].tenantId);
    }
  }, [rentals, activeTenantId, setActiveTenantId]);

  if (rentals.length <= 1) return null;

  const current = activeTenantId ?? rentals[0].tenantId;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setActiveTenantId(e.target.value);
    // Refrescar todos los datos del portal con el nuevo alquiler activo.
    queryClient.invalidateQueries();
  }

  return (
    <select
      value={current}
      onChange={onChange}
      aria-label={t('tenant.pageTitle')}
      style={{
        padding: '8px 12px',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        fontSize: 13,
        maxWidth: 220,
      }}
    >
      {rentals.map((r) => (
        <option key={r.tenantId} value={r.tenantId}>
          {r.propertyName}
        </option>
      ))}
    </select>
  );
}
