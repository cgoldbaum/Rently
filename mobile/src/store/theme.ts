import { Appearance } from 'react-native';
import { createThemeStore } from '@rently/shared';
import { syncStorage } from '../storage';

function systemTheme(): 'light' | 'dark' {
  return Appearance.getColorScheme() === 'dark' ? 'dark' : 'light';
}

export const useThemeStore = createThemeStore(syncStorage, systemTheme, (theme) => {
  Appearance.setColorScheme(theme);
});
