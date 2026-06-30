import { createLocaleStore, type SyncStorage } from '@rently/shared';
import { i18n, systemLanguage } from '@/lib/i18n';

const storage: SyncStorage = {
  getItem: (key) => (typeof window !== 'undefined' ? window.localStorage.getItem(key) : null),
  setItem: (key, value) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(key, value);
  },
  removeItem: (key) => {
    if (typeof window !== 'undefined') window.localStorage.removeItem(key);
  },
};

export const useLocaleStore = createLocaleStore(storage, systemLanguage, (language) => {
  i18n.changeLanguage(language);
});
