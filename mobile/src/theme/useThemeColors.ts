import { useThemeStore } from '../store/theme';
import { lightColors, darkColors, type ThemeColors } from './colors';

/** Devuelve la paleta de colores estructurales del tema activo (claro u oscuro). */
export function useThemeColors(): ThemeColors {
  const theme = useThemeStore((s) => s.theme);
  return theme === 'dark' ? darkColors : lightColors;
}
