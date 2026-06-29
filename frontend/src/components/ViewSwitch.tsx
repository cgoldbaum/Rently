'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth';
import Icon from '@/components/Icon';
import type { ActiveView } from '@rently/shared';

/**
 * Botón para alternar entre la vista de propietario y la de inquilino.
 * Sólo se muestra si la cuenta tiene ambas capacidades.
 */
export default function ViewSwitch() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeView = useAuthStore((s) => s.activeView);
  const setActiveView = useAuthStore((s) => s.setActiveView);
  const setActiveTenantId = useAuthStore((s) => s.setActiveTenantId);

  if (!user?.canOwner || !user?.canTenant) return null;

  const target: ActiveView = activeView === 'owner' ? 'tenant' : 'owner';

  function switchTo(view: ActiveView) {
    if (view === activeView) return;
    setActiveView(view);
    if (view === 'tenant') {
      setActiveTenantId(user!.tenantId ?? user!.tenantIds?.[0] ?? null);
      router.push('/tenant');
    } else {
      router.push('/');
    }
  }

  return (
    <button
      className="nav-item"
      style={{ marginTop: 4 }}
      onClick={() => switchTo(target)}
    >
      <Icon name="users" size={16} />
      {target === 'tenant' ? 'Cambiar a inquilino' : 'Cambiar a propietario'}
    </button>
  );
}
