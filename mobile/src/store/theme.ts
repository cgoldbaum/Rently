import { create } from 'zustand';
import { Appearance } from 'react-native';
import { syncStorage } from '../storage';

export type ThemePreference = 'system' | 'light' | 'dark';
export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'themePreference';

function isPreference(value: string | null): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

function systemTheme(): Theme {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

function resolveTheme(preference: ThemePreference): Theme {
  return preference === 'system' ? systemTheme() : preference;
}

interface ThemeState {
  /** Preferencia elegida por el usuario: 'system' | 'light' | 'dark'. */
  preference: ThemePreference;
  /** Tema efectivo resuelto (siempre concreto). */
  theme: Theme;
  /** Cambia la preferencia, la persiste en storage y recalcula el tema efectivo. */
  setPreference: (preference: ThemePreference) => void;
  /** Relee la preferencia persistida (llamar después de hydrateStorage). */
  hydrate: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  preference: 'system',
  theme: resolveTheme('system'),
  setPreference: (preference) => {
    syncStorage.setItem(STORAGE_KEY, preference);
    set({ preference, theme: resolveTheme(preference) });
  },
  hydrate: () => {
    const raw = syncStorage.getItem(STORAGE_KEY);
    const preference = isPreference(raw) ? raw : 'system';
    set({ preference, theme: resolveTheme(preference) });
  },
}));

// Si la preferencia es 'system', sigue los cambios de tema del SO en vivo.
Appearance.addChangeListener(() => {
  const { preference } = useThemeStore.getState();
  if (preference === 'system') {
    useThemeStore.setState({ theme: resolveTheme('system') });
  }
});
