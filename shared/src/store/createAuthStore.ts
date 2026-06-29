import { create } from 'zustand';
import type { User } from '../types';

export interface SyncStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

export type ActiveView = 'owner' | 'tenant';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  /** Vista en la que está operando el usuario (propietario o inquilino). */
  activeView: ActiveView;
  /** Alquiler (perfil de inquilino) activo cuando la vista es 'tenant'. */
  activeTenantId: string | null;
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  setUser: (user: User) => void;
  clearAuth: () => void;
  initFromStorage: () => void;
  setActiveView: (view: ActiveView) => void;
  setActiveTenantId: (tenantId: string | null) => void;
}

/** Vista por defecto según las capacidades del usuario. */
function defaultView(user: User): ActiveView {
  return user.canOwner === false && user.canTenant ? 'tenant' : 'owner';
}

/** Indica si el usuario puede operar en la vista dada según sus capacidades. */
function canUseView(user: User, view: ActiveView): boolean {
  if (view === 'tenant') {
    return Boolean(user.canTenant) || (user.tenantIds?.length ?? 0) > 0 || Boolean(user.tenantId);
  }
  return user.canOwner !== false;
}

/** Normaliza una vista persistida: cae a la vista por defecto si es inválida o no permitida. */
function resolveView(user: User, stored: string | null): ActiveView {
  if ((stored === 'owner' || stored === 'tenant') && canUseView(user, stored)) {
    return stored;
  }
  return defaultView(user);
}

/** Resuelve el alquiler activo para una vista: null en owner, un id válido en tenant. */
function resolveTenantId(user: User, view: ActiveView, stored: string | null): string | null {
  if (view !== 'tenant') return null;
  const belongs = stored && (user.tenantIds ? user.tenantIds.includes(stored) : stored === user.tenantId);
  if (belongs) return stored;
  return user.tenantId ?? user.tenantIds?.[0] ?? null;
}

export function createAuthStore(storage: SyncStorage) {
  return create<AuthState>((set) => ({
    user: null,
    accessToken: null,
    activeView: 'owner',
    activeTenantId: null,
    setAuth: (user, accessToken, refreshToken) => {
      storage.setItem('accessToken', accessToken);
      storage.setItem('user', JSON.stringify(user));
      if (refreshToken) {
        storage.setItem('refreshToken', refreshToken);
      }
      const activeView = defaultView(user);
      const activeTenantId = resolveTenantId(user, activeView, null);
      storage.setItem('activeView', activeView);
      if (activeTenantId) {
        storage.setItem('activeTenantId', activeTenantId);
      } else {
        storage.removeItem('activeTenantId');
      }
      set({ user, accessToken, activeView, activeTenantId });
    },
    setUser: (user) => {
      storage.setItem('user', JSON.stringify(user));
      set({ user });
    },
    clearAuth: () => {
      storage.removeItem('accessToken');
      storage.removeItem('user');
      storage.removeItem('refreshToken');
      storage.removeItem('activeView');
      storage.removeItem('activeTenantId');
      set({ user: null, accessToken: null, activeView: 'owner', activeTenantId: null });
    },
    initFromStorage: () => {
      const token = storage.getItem('accessToken');
      const userRaw = storage.getItem('user');
      if (token && userRaw) {
        try {
          const user = JSON.parse(userRaw) as User;
          // Valida lo persistido contra las capacidades actuales del usuario para no
          // quedar atrapado en una vista inválida (p. ej. canTenant pasó a false) ni
          // arrastrar un alquiler que ya no pertenece al usuario.
          const activeView = resolveView(user, storage.getItem('activeView'));
          const activeTenantId = resolveTenantId(user, activeView, storage.getItem('activeTenantId'));
          storage.setItem('activeView', activeView);
          if (activeTenantId) {
            storage.setItem('activeTenantId', activeTenantId);
          } else {
            storage.removeItem('activeTenantId');
          }
          set({ user, accessToken: token, activeView, activeTenantId });
        } catch {
          storage.removeItem('accessToken');
          storage.removeItem('user');
        }
      }
    },
    setActiveView: (view) => {
      storage.setItem('activeView', view);
      // En vista propietario no debe quedar un alquiler activo: evita que se envíe
      // el header X-Tenant-Id en rutas de owner y mantiene estado/almacenamiento consistentes.
      if (view === 'owner') {
        storage.removeItem('activeTenantId');
        set({ activeView: view, activeTenantId: null });
      } else {
        set({ activeView: view });
      }
    },
    setActiveTenantId: (tenantId) => {
      if (tenantId) {
        storage.setItem('activeTenantId', tenantId);
      } else {
        storage.removeItem('activeTenantId');
      }
      set({ activeTenantId: tenantId });
    },
  }));
}
