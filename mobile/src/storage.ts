import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SyncStorage } from '@rently/shared';

// In-memory cache enables synchronous reads (needed by Zustand + Axios interceptors).
// Values are loaded from AsyncStorage at app start via hydrateStorage().
const memCache: Record<string, string> = {};

export const syncStorage: SyncStorage = {
  getItem: (key) => memCache[key] ?? null,
  setItem: (key, value) => {
    memCache[key] = value;
    AsyncStorage.setItem(key, value);
  },
  removeItem: (key) => {
    delete memCache[key];
    AsyncStorage.removeItem(key);
  },
};

export async function hydrateStorage(): Promise<void> {
  const keys = ['accessToken', 'refreshToken', 'user'];
  await Promise.all(
    keys.map(async (key) => {
      const val = await AsyncStorage.getItem(key);
      if (val !== null) memCache[key] = val;
    })
  );
}
