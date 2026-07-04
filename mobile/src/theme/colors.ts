/**
 * Colores estructurales (fondo, superficies, texto, bordes) para modo claro y
 * oscuro. Los colores de marca/semánticos (primary, danger, success, badges
 * de estado, etc.) se mantienen iguales en ambos temas y siguen escritos como
 * literales en cada componente: son botones/insignias autocontenidos y ya
 * funcionan sobre cualquier fondo.
 */
export const lightColors = {
  background: '#faf8f5',
  backgroundElevated: '#f0ede6',
  card: '#ffffff',
  cardMuted: '#f3f0ea',
  border: '#e0dbd4',
  borderLight: '#f0ebe4',
  text: '#2d2d2d',
  textSecondary: '#555555',
  textMuted: '#888888',
  placeholder: '#aaaaaa',
  overlay: 'rgba(0,0,0,0.45)',
};

export const darkColors: Record<keyof typeof lightColors, string> = {
  background: '#1b140d',
  backgroundElevated: '#2c2116',
  card: '#241b12',
  cardMuted: '#2c2116',
  border: '#3d3020',
  borderLight: '#332a1c',
  text: '#f2e9dc',
  textSecondary: '#c4b29b',
  textMuted: '#8c7b65',
  placeholder: '#8c7b65',
  overlay: 'rgba(0,0,0,0.65)',
};

export type ThemeColors = typeof lightColors;
