import * as Localization from 'expo-localization';
import { createI18n, resolveLanguage, type LanguagePreference } from '@rently/shared';
import { initReactI18next } from 'react-i18next';
import type { i18n as I18n } from 'i18next';
import { syncStorage } from '../storage';

const STORAGE_KEY = 'languagePreference';

/** Idioma del sistema según la configuración del dispositivo. */
export function systemLanguage(): string | undefined {
  return Localization.getLocales()[0]?.languageTag;
}

/** Preferencia persistida (del cache sincrónico de AsyncStorage). */
export function storedPreference(): LanguagePreference {
  const v = syncStorage.getItem(STORAGE_KEY);
  return v === 'es' || v === 'en' || v === 'system' ? v : 'system';
}

// Instancia única de i18n para la app mobile. Se re-tipa con el i18next local
// porque shared resuelve su propia copia de i18next (tipos físicamente distintos).
export const i18n = createI18n(
  resolveLanguage(storedPreference(), systemLanguage()),
  [initReactI18next],
) as unknown as I18n;
