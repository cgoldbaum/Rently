import { createAuthStore } from '@rently/shared';
import type { SyncStorage } from '@rently/shared';

const storageAdapter: SyncStorage = {
  getItem: (key) => (typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null),
  setItem: (key, value) => window.sessionStorage.setItem(key, value),
  removeItem: (key) => window.sessionStorage.removeItem(key),
};

export const useAuthStore = createAuthStore(storageAdapter);
