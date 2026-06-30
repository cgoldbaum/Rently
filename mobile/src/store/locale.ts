import { createLocaleStore } from '@rently/shared';
import { syncStorage } from '../storage';
import { i18n, systemLanguage } from '../lib/i18n';

export const useLocaleStore = createLocaleStore(syncStorage, systemLanguage, (language) => {
  i18n.changeLanguage(language);
});
