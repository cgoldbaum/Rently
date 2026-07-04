import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useThemeColors } from '../../theme/useThemeColors';
import type { ThemeColors } from '../../theme/colors';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    list: { padding: 20, paddingBottom: 32, gap: 10 },
    title: { fontSize: 26, fontWeight: '800', color: colors.text },
    titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 },
    downloadBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 9,
      backgroundColor: colors.backgroundElevated,
    },
    downloadBtnDisabled: { opacity: 0.6 },
    downloadBtnText: { fontSize: 12, fontWeight: '700', color: '#6b5b45' },

    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
    statCard: {
      flex: 1,
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 14,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    statValue: { fontSize: 19, fontWeight: '800', color: colors.text },
    statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    statSub: { fontSize: 11, color: colors.textMuted, marginTop: 1 },

    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 6 },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    chipActive: { borderColor: '#6b5b45', backgroundColor: colors.backgroundElevated },
    chipText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    chipTextActive: { color: '#6b5b45' },

    empty: { textAlign: 'center', color: colors.textMuted, fontSize: 14, marginTop: 30 },

    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    cardProperty: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
    cardTenant: { fontSize: 13, color: colors.textMuted, marginTop: 3 },
    cardBottom: { marginTop: 8 },
    cardMetaRow: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    cardAmount: { fontSize: 19, fontWeight: '800', color: '#6b5b45' },
    cardDue: { fontSize: 12, color: colors.textMuted },
    methodBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
    methodBadgeText: { fontSize: 11, fontWeight: '700' },
    methodMissing: { fontSize: 12, color: colors.textMuted },
    badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    actionBtn: {
      marginTop: 12,
      backgroundColor: '#6b5b45',
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
    },
    actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    receiptHint: { marginTop: 10, fontSize: 12, color: colors.textMuted, fontWeight: '600' },
    actionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    splitBtn: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 1.5,
      borderColor: '#6b5b45',
      alignItems: 'center',
      justifyContent: 'center',
    },
    splitBtnText: { color: '#6b5b45', fontSize: 12, fontWeight: '700' },
    installmentBadge: { marginTop: 6, backgroundColor: '#f5f3ff', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
    installmentBadgeText: { fontSize: 11, fontWeight: '700', color: '#7c3aed' },
    splitAmountHint: { fontSize: 12, color: colors.textMuted, marginTop: 4, marginBottom: 4 },
    dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    dateInputLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, width: 60 },
    dateInput: { flex: 1, borderWidth: 1.5, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: colors.text, backgroundColor: colors.background },

    modalOverlay: {
      flex: 1,
      backgroundColor: colors.overlay,
      justifyContent: 'center',
      padding: 24,
    },
    modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 22 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 12 },
    modalSub: { fontSize: 13, color: colors.textMuted },
    modalAmount: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 4 },
    modalPeriod: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    modalLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 16, marginBottom: 8 },
    methodRow: { flexDirection: 'row', gap: 8 },
    methodBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 10,
      borderWidth: 2,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: 'center',
    },
    methodBtnActive: { borderColor: '#6b5b45', backgroundColor: colors.backgroundElevated },
    methodText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
    methodTextActive: { color: '#6b5b45' },
    modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
    modalCancel: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 10,
      backgroundColor: colors.backgroundElevated,
      alignItems: 'center',
    },
    modalCancelText: { color: colors.textMuted, fontSize: 14, fontWeight: '700' },
    modalConfirm: {
      flex: 1,
      paddingVertical: 13,
      borderRadius: 10,
      backgroundColor: '#6b5b45',
      alignItems: 'center',
    },
    modalConfirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  });
}

export function useOwnerPaymentsStyles() {
  const colors = useThemeColors();
  return useMemo(() => createStyles(colors), [colors]);
}
