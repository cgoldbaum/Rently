import { createI18n, DEFAULT_LANGUAGE } from '@rently/shared';
import { initReactI18next } from 'react-i18next';
import type { i18n as I18n } from 'i18next';

/** Idioma del sistema (navegador). `undefined` durante SSR. */
export function systemLanguage(): string | undefined {
  return typeof navigator !== 'undefined' ? navigator.language : undefined;
}

// Instancia unica de i18n para la app web (no el singleton global de i18next).
// Se inicializa con un idioma deterministico para que SSR y primer render cliente coincidan.
export const i18n = createI18n(
  DEFAULT_LANGUAGE,
  [initReactI18next],
) as unknown as I18n;
