import { create } from 'zustand';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'OWNER' | 'TENANT';
  tenantId?: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string) => void;
  clearAuth: () => void;
  initFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  setAuth: (user, accessToken) => {
    sessionStorage.setItem('accessToken', accessToken);
    sessionStorage.setItem('user', JSON.stringify(user));
    set({ user, accessToken });
  },
  clearAuth: () => {
    sessionStorage.removeItem('accessToken');
    sessionStorage.removeItem('user');
    set({ user: null, accessToken: null });
  },
  initFromStorage: () => {
    const token = sessionStorage.getItem('accessToken');
    const userRaw = sessionStorage.getItem('user');
    if (token && userRaw) {
      try {
        const user = JSON.parse(userRaw) as User;
        set({ user, accessToken: token });
      } catch {
        sessionStorage.removeItem('accessToken');
        sessionStorage.removeItem('user');
      }
    }
  },
}));
