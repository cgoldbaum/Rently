import { create } from 'zustand';
import type { SyncStorage } from './createAuthStore';

export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'themePreference';

interface ThemeState {
  /** Preferencia elegida por el usuario: 'system' | 'light' | 'dark'. */
  preference: ThemePreference;
  /** Tema efectivo resuelto (siempre concreto). */
  theme: Theme;
  /** Cambia la preferencia y recalcula el tema efectivo. */
  setPreference: (preference: ThemePreference) => void;
  /**
   * Relee la preferencia desde el storage y reaplica el tema. Necesario en
   * plataformas donde el storage se hidrata de forma asíncrona (mobile), donde
   * el valor no está disponible al crear el store.
   */
  hydrate: () => void;
}

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function resolveTheme(preference: ThemePreference, getSystemTheme: () => Theme | null | undefined): Theme {
  if (preference === 'system') return getSystemTheme() === 'dark' ? 'dark' : 'light';
  return preference;
}

/**
 * Store de preferencia de tema. Por defecto es 'light' (no sigue al sistema
 * salvo que el usuario elija explícitamente la opción 'system'). Recibe el
 * `SyncStorage` de cada plataforma y una función para leer el tema del
 * sistema operativo. `onChange` se dispara cuando cambia el tema efectivo.
 */
export function createThemeStore(
  storage: SyncStorage,
  getSystemTheme: () => Theme | null | undefined,
  onChange?: (theme: Theme) => void,
) {
  const stored = storage.getItem(STORAGE_KEY);
  const preference: ThemePreference = isPreference(stored) ? stored : 'light';
  const theme = resolveTheme(preference, getSystemTheme);

  return create<ThemeState>((set) => ({
    preference,
    theme,
    setPreference: (next) => {
      storage.setItem(STORAGE_KEY, next);
      const resolved = resolveTheme(next, getSystemTheme);
      set({ preference: next, theme: resolved });
      onChange?.(resolved);
    },
    hydrate: () => {
      const raw = storage.getItem(STORAGE_KEY);
      const pref: ThemePreference = isPreference(raw) ? raw : 'light';
      const resolved = resolveTheme(pref, getSystemTheme);
      set({ preference: pref, theme: resolved });
      onChange?.(resolved);
    },
  }));
}
