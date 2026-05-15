import { create } from 'zustand';
import type { User } from '../types';

export interface SyncStorage {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  setAuth: (user: User, token: string, refreshToken?: string) => void;
  clearAuth: () => void;
  initFromStorage: () => void;
}

export function createAuthStore(storage: SyncStorage) {
  return create<AuthState>((set) => ({
    user: null,
    accessToken: null,
    setAuth: (user, accessToken, refreshToken) => {
      storage.setItem('accessToken', accessToken);
      storage.setItem('user', JSON.stringify(user));
      if (refreshToken) {
        storage.setItem('refreshToken', refreshToken);
      }
      set({ user, accessToken });
    },
    clearAuth: () => {
      storage.removeItem('accessToken');
      storage.removeItem('user');
      storage.removeItem('refreshToken');
      set({ user: null, accessToken: null });
    },
    initFromStorage: () => {
      const token = storage.getItem('accessToken');
      const userRaw = storage.getItem('user');
      if (token && userRaw) {
        try {
          const user = JSON.parse(userRaw) as User;
          set({ user, accessToken: token });
        } catch {
          storage.removeItem('accessToken');
          storage.removeItem('user');
        }
      }
    },
  }));
}
