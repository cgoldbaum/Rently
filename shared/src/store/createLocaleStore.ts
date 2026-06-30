import { create } from 'zustand';
import type { SyncStorage } from './createAuthStore';
import {
  resolveLanguage,
  type Language,
  type LanguagePreference,
} from '../i18n';

const STORAGE_KEY = 'languagePreference';

interface LocaleState {
  /** Preferencia elegida por el usuario: 'system' | 'es' | 'en'. */
  preference: LanguagePreference;
  /** Idioma efectivo resuelto (siempre concreto). */
  language: Language;
  /** Cambia la preferencia y recalcula el idioma efectivo. */
  setPreference: (preference: LanguagePreference) => void;
  /**
   * Relee la preferencia desde el storage y reaplica el idioma. Necesario en
   * plataformas donde el storage se hidrata de forma asíncrona (mobile), donde
   * el valor no está disponible al crear el store.
   */
  hydrate: () => void;
}

function isPreference(value: string | null): value is LanguagePreference {
  return value === 'system' || value === 'es' || value === 'en';
}

/**
 * Store de preferencia de idioma. Recibe el `SyncStorage` de cada plataforma
 * (localStorage en web, AsyncStorage cacheado en mobile) y una función para
 * leer el idioma del sistema. `onChange` se dispara cuando cambia el idioma
 * efectivo, para que la app actualice la instancia de i18n.
 */
export function createLocaleStore(
  storage: SyncStorage,
  getSystemLanguage: () => string | null | undefined,
  onChange?: (language: Language) => void,
) {
  const stored = storage.getItem(STORAGE_KEY);
  const preference: LanguagePreference = isPreference(stored) ? stored : 'system';
  const language = resolveLanguage(preference, getSystemLanguage());

  return create<LocaleState>((set) => ({
    preference,
    language,
    setPreference: (next) => {
      storage.setItem(STORAGE_KEY, next);
      const resolved = resolveLanguage(next, getSystemLanguage());
      set({ preference: next, language: resolved });
      onChange?.(resolved);
    },
    hydrate: () => {
      const raw = storage.getItem(STORAGE_KEY);
      const pref: LanguagePreference = isPreference(raw) ? raw : 'system';
      const resolved = resolveLanguage(pref, getSystemLanguage());
      set({ preference: pref, language: resolved });
      onChange?.(resolved);
    },
  }));
}
