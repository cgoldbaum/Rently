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
      const activeTenantId = user.tenantId ?? user.tenantIds?.[0] ?? null;
      storage.setItem('activeView', activeView);
      if (activeView === 'tenant' && activeTenantId) {
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
          const storedView = storage.getItem('activeView') as ActiveView | null;
          const activeView = storedView ?? defaultView(user);
          const activeTenantId = storage.getItem('activeTenantId') ?? user.tenantId ?? null;
          set({ user, accessToken: token, activeView, activeTenantId });
        } catch {
          storage.removeItem('accessToken');
          storage.removeItem('user');
        }
      }
    },
    setActiveView: (view) => {
      storage.setItem('activeView', view);
      set({ activeView: view });
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
