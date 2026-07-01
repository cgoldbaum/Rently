import { createLocaleStore, type SyncStorage } from '@rently/shared';
import { i18n, systemLanguage } from '@/lib/i18n';

let canReadClientLocale = false;

export function enableLocaleHydration() {
  canReadClientLocale = true;
}

const storage: SyncStorage = {
  getItem: (key) => (typeof window !== 'undefined' && canReadClientLocale ? window.localStorage.getItem(key) : null),
  setItem: (key, value) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  },
};

export const useLocaleStore = createLocaleStore(
  storage,
  () => (canReadClientLocale ? systemLanguage() : undefined),
  (language) => {
    i18n.changeLanguage(language);
  },
);
