import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useThemeColors } from '../../theme/useThemeColors';
import type { ThemeColors } from '../../theme/colors';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
    list: { padding: 20, paddingBottom: 32, gap: 10 },
    title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 10 },

    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 12 },

    upRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 12,
      borderRadius: 10,
      backgroundColor: colors.backgroundElevated,
      marginBottom: 8,
    },
    upRowFirst: { backgroundColor: colors.backgroundElevated, borderWidth: 1, borderColor: colors.border },
    upMonth: { fontSize: 13, fontWeight: '600', color: colors.text, textTransform: 'capitalize' },
    upDue: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
    upAmount: { fontSize: 15, fontWeight: '700', color: colors.text },
    upAdjust: { fontSize: 11, color: '#b45309', fontWeight: '600', marginTop: 1 },

    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
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

    empty: { textAlign: 'center', color: colors.textMuted, fontSize: 14, marginTop: 20 },

    payTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    payPeriod: { fontSize: 15, fontWeight: '700', color: colors.text, textTransform: 'capitalize' },
    payMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    payNote: { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginTop: 2 },
    payAmount: { fontSize: 19, fontWeight: '800', color: '#6b5b45', marginTop: 6 },
    payButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
    payBtn: {
      paddingHorizontal: 12,
      paddingVertical: 9,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    payBtnText: { fontSize: 12, fontWeight: '700', color: '#6b5b45' },
    payBtnMp: { backgroundColor: '#009ee3', borderColor: '#009ee3' },
    payBtnMpText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    badgeText: { fontSize: 11, fontWeight: '700' },
    waitHint: { fontSize: 11, color: colors.textMuted, marginTop: 8 },

    pagination: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: 12,
      marginTop: 8,
    },
    pageBtn: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    pageBtnDisabled: { opacity: 0.4 },
    pageBtnText: { fontSize: 13, color: '#6b5b45', fontWeight: '600' },
    pageInfo: { fontSize: 13, color: colors.textMuted },

    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
    modalCard: { backgroundColor: colors.card, borderRadius: 16, padding: 22 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
    modalSub: { fontSize: 13, color: colors.textMuted, marginTop: 4 },
    modalLabel: { fontSize: 13, fontWeight: '600', color: colors.textSecondary, marginTop: 16, marginBottom: 6 },
    textarea: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      padding: 12,
      fontSize: 14,
      color: colors.text,
      minHeight: 70,
      textAlignVertical: 'top',
      backgroundColor: colors.background,
    },
    transferData: { marginTop: 14 },
    transferRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    transferLabel: { fontSize: 11, color: colors.textMuted },
    transferValue: { fontSize: 14, fontWeight: '700', color: colors.text },
    copyBtn: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 8,
      backgroundColor: colors.backgroundElevated,
    },
    copyBtnText: { fontSize: 12, fontWeight: '700', color: '#6b5b45' },
    contactRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
    contactBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 8,
      backgroundColor: colors.backgroundElevated,
      alignItems: 'center',
    },
    contactBtnText: { fontSize: 13, fontWeight: '700', color: '#6b5b45' },
    contactBtnWa: { backgroundColor: '#25d366' },
    contactBtnWaText: { fontSize: 13, fontWeight: '700', color: '#fff' },
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

export function useTenantPaymentsStyles() {
  const colors = useThemeColors();
  return useMemo(() => createStyles(colors), [colors]);
}
