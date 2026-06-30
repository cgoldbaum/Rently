import { createI18n, resolveLanguage, type LanguagePreference } from '@rently/shared';
import { initReactI18next } from 'react-i18next';
import type { i18n as I18n } from 'i18next';

const STORAGE_KEY = 'languagePreference';

/** Idioma del sistema (navegador). `undefined` durante SSR. */
export function systemLanguage(): string | undefined {
  return typeof navigator !== 'undefined' ? navigator.language : undefined;
}

/** Preferencia persistida en localStorage. `'system'` durante SSR o si no hay valor. */
export function storedPreference(): LanguagePreference {
  if (typeof window === 'undefined') return 'system';
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === 'es' || v === 'en' || v === 'system' ? v : 'system';
}

// Instancia única de i18n para la app web (no el singleton global de i18next).
// Se re-tipa con el i18next local porque shared resuelve su propia copia.
export const i18n = createI18n(
  resolveLanguage(storedPreference(), systemLanguage()),
  [initReactI18next],
) as unknown as I18n;
