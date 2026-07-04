import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useThemeColors } from '../theme/useThemeColors';
import type { ThemeColors } from '../theme/colors';

function createChipStyles(colors: ThemeColors) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 16,
      backgroundColor: colors.backgroundElevated,
    },
    chipActive: {
      backgroundColor: '#6b5b45',
    },
    chipText: {
      fontSize: 13,
      color: colors.textSecondary,
      fontWeight: '600' as const,
    },
    chipTextActive: {
      color: '#fff',
    },
  });
}

/** Estilos de chips de filtro (fondo/texto se adaptan al tema activo). */
export function useChipStyles() {
  const colors = useThemeColors();
  return useMemo(() => createChipStyles(colors), [colors]);
}

/** Sombra pura (shadowColor se mantiene igual en ambos temas): no depende del tema. */
export const shadowStyles = StyleSheet.create({
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardLight: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
});

function createBorderedChipStyles(colors: ThemeColors) {
  return StyleSheet.create({
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    chipActive: { borderColor: '#6b5b45', backgroundColor: colors.backgroundElevated },
    chipText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' as const },
    chipTextActive: { color: '#6b5b45' },
  });
}

/** Estilos de chip con borde (usado en formularios bottom-sheet). */
export function useBorderedChipStyles() {
  const colors = useThemeColors();
  return useMemo(() => createBorderedChipStyles(colors), [colors]);
}

function createModalFormStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      backgroundColor: colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 22,
      maxHeight: '90%',
    },
    scroll: { marginBottom: 8 },
    title: { fontSize: 20, fontWeight: '800' as const, color: colors.text, marginBottom: 14 },
    label: { fontSize: 13, fontWeight: '600' as const, color: colors.textSecondary, marginBottom: 6, marginTop: 12 },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 13,
      fontSize: 15,
      color: colors.text,
      backgroundColor: colors.card,
    },
    inputError: { borderColor: '#ef4444' },
    err: { fontSize: 12, color: '#ef4444', marginTop: 4 },
    actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
    cancel: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: colors.backgroundElevated,
      alignItems: 'center',
    },
    cancelText: { color: colors.textMuted, fontSize: 15, fontWeight: '700' as const },
    confirm: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 12,
      backgroundColor: '#6b5b45',
      alignItems: 'center',
    },
    confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' as const },
    disabled: { opacity: 0.5 },
  });
}

/** Estilos compartidos para bottom-sheet modal de formulario. */
export function useModalFormStyles() {
  const colors = useThemeColors();
  return useMemo(() => createModalFormStyles(colors), [colors]);
}
