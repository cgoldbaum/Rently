import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useThemeColors } from '../../theme/useThemeColors';
import type { ThemeColors } from '../../theme/colors';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.text,
      paddingHorizontal: 20,
      marginBottom: 12,
    },

    filtersScroll: {
      flexGrow: 0,
      flexShrink: 0,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      marginBottom: 8,
    },
    filters: {
      paddingHorizontal: 16,
      gap: 8,
      paddingBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
    },
    filterBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    filterBtnActive: { borderColor: '#6b5b45', backgroundColor: '#f5f1eb' },
    filterText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    filterTextActive: { color: '#6b5b45' },
    filterCount: {
      backgroundColor: colors.backgroundElevated,
      borderRadius: 999,
      paddingHorizontal: 6,
      paddingVertical: 1,
    },
    filterCountActive: { backgroundColor: '#e0d8cc' },
    filterCountText: { fontSize: 11, fontWeight: '700', color: colors.textMuted },
    filterCountTextActive: { color: '#6b5b45' },

    empty: { textAlign: 'center', color: colors.textMuted, marginTop: 40, fontSize: 14 },
    list: { paddingHorizontal: 20, gap: 12, paddingBottom: 20, paddingTop: 8 },

    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    cardTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
    },
    claimTitle: { fontSize: 15, fontWeight: '700', color: colors.text, flex: 1 },
    property: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    description: { fontSize: 13, color: colors.textSecondary, marginTop: 8, lineHeight: 18 },
    priorityTag: {
      alignSelf: 'flex-start',
      borderRadius: 20,
      paddingHorizontal: 10,
      paddingVertical: 3,
      marginTop: 10,
    },
    priorityText: { fontSize: 11, fontWeight: '700' },

    badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },

    modal: { flex: 1, backgroundColor: colors.background },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      paddingHorizontal: 20,
      paddingTop: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
      backgroundColor: colors.card,
    },
    modalTitle: { fontSize: 17, fontWeight: '700', color: colors.text },
    modalSub: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
    closeBtn: { padding: 8 },
    closeBtnText: { fontSize: 18, color: colors.textMuted },
    modalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

    sectionLabel: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
      marginTop: 16,
    },
    descriptionFull: { fontSize: 14, color: colors.textSecondary, lineHeight: 22 },
    dateText: { fontSize: 12, color: colors.textMuted, marginTop: 8 },

    historyItem: {
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 12,
      marginBottom: 8,
      shadowColor: '#000',
      shadowOpacity: 0.04,
      shadowRadius: 4,
      elevation: 1,
    },
    historyTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 4,
    },
    historyStatus: { fontSize: 13, fontWeight: '700' },
    historyDate: { fontSize: 12, color: colors.textMuted },
    historyComment: { fontSize: 13, color: colors.textSecondary, lineHeight: 18, marginTop: 4 },
    historyPhoto: { width: '100%', height: 160, borderRadius: 8, marginTop: 8 },

    resolveBtn: {
      backgroundColor: '#6b5b45',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 20,
    },
    resolveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    resolveForm: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      marginTop: 20,
      gap: 12,
    },
    resolveFormTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
    inputLabel: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    textInput: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      minHeight: 80,
      backgroundColor: colors.card,
    },
    photoPickerBtn: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderStyle: 'dashed',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.backgroundElevated,
    },
    photoPickerText: { fontSize: 14, color: colors.textMuted, fontWeight: '600' },
    photoPreview: { width: '100%', height: 160, borderRadius: 8, marginTop: 8 },
    formActions: { flexDirection: 'row', gap: 10 },
    confirmBtn: {
      flex: 1,
      backgroundColor: '#6b5b45',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    disabledBtn: { opacity: 0.5 },
    confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
    cancelBtn: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
      backgroundColor: colors.card,
    },
    cancelBtnText: { color: '#6b5b45', fontWeight: '700', fontSize: 14 },
  });
}

export function useOwnerClaimsStyles() {
  const colors = useThemeColors();
  return useMemo(() => createStyles(colors), [colors]);
}
