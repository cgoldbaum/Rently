import { create } from 'zustand';

export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'themePreference';

let canReadClientTheme = false;

export function enableThemeHydration() {
  canReadClientTheme = true;
}

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function systemTheme(): Theme {
  if (typeof window === 'undefined' || !window.matchMedia) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(preference: ThemePreference): Theme {
  if (preference === 'system') return canReadClientTheme ? systemTheme() : 'light';
  return preference;
}

function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined' || !canReadClientTheme) return 'light';
  return isPreference(window.localStorage.getItem(STORAGE_KEY)) ? (window.localStorage.getItem(STORAGE_KEY) as ThemePreference) : 'light';
}

interface ThemeState {
  /** Preferencia elegida por el usuario: 'system' | 'light' | 'dark'. */
  preference: ThemePreference;
  /** Tema efectivo resuelto (siempre concreto). */
  theme: Theme;
  /** Cambia la preferencia, la persiste en localStorage y recalcula el tema efectivo. */
  setPreference: (preference: ThemePreference) => void;
  /** Relee la preferencia desde localStorage. Evita mismatch de hidratación SSR/CSR. */
  hydrate: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'light',
  theme: 'light',
  setPreference: (preference) => {
    if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, preference);
    set({ preference, theme: resolveTheme(preference) });
  },
  hydrate: () => {
    const preference = readStoredPreference();
    set({ preference, theme: resolveTheme(preference) });
  },
}));
