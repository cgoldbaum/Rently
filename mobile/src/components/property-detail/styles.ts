import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useThemeColors } from '../../theme/useThemeColors';
import type { ThemeColors } from '../../theme/colors';

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { paddingBottom: 32 },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background },
    error: { color: '#dc2626', textAlign: 'center' },

    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingBottom: 16,
    },
    backBtn: { fontSize: 14, color: '#6b5b45', fontWeight: '600' },
    badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
    badgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    title: { fontSize: 26, fontWeight: '800', color: colors.text, paddingHorizontal: 20, marginBottom: 4 },
    address: { fontSize: 14, color: colors.textMuted, paddingHorizontal: 20, marginBottom: 12 },

    exportBtn: {
      marginHorizontal: 20,
      backgroundColor: colors.backgroundElevated,
      borderRadius: 10,
      paddingVertical: 11,
      alignItems: 'center',
      marginBottom: 14,
    },
    exportBtnText: { color: '#6b5b45', fontSize: 14, fontWeight: '700' },
    disabled: { opacity: 0.5 },

    tabsScroll: { borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 18 },
    tabs: { paddingHorizontal: 12 },
    tab: { paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 3, borderBottomColor: 'transparent' },
    tabActive: { borderBottomColor: '#6b5b45' },
    tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
    tabTextActive: { color: '#6b5b45' },

    section: { paddingHorizontal: 20 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 8 },
    description: { fontSize: 14, color: colors.textSecondary, marginBottom: 16, lineHeight: 20 },
    linkText: { fontSize: 13, color: '#6b5b45', fontWeight: '600', marginBottom: 8 },

    infoRow: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 1,
    },
    infoLabel: { fontSize: 12, color: colors.textMuted, fontWeight: '600', marginBottom: 4 },
    infoValue: { fontSize: 15, color: colors.text, fontWeight: '600' },

    emptyBox: { alignItems: 'center', paddingVertical: 10 },
    empty: { textAlign: 'center', color: colors.textMuted, marginTop: 20, fontSize: 14 },
    emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 14, marginBottom: 16, lineHeight: 20 },

    primaryBtn: {
      backgroundColor: '#6b5b45',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 10,
      alignSelf: 'stretch',
    },
    primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    dangerBtn: {
      backgroundColor: '#fee2e2',
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 10,
    },
    dangerBtnText: { color: '#ef4444', fontSize: 15, fontWeight: '700' },
    outlineBtn: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 12,
      paddingVertical: 13,
      alignItems: 'center',
      marginTop: 4,
    },
    outlineBtnText: { color: '#6b5b45', fontSize: 14, fontWeight: '700' },

    docTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 16, marginBottom: 8 },
    docCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
    },
    docName: { fontSize: 13, fontWeight: '600', color: colors.text },
    docDate: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
    docBtn: {
      backgroundColor: colors.backgroundElevated,
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    docBtnText: { fontSize: 12, fontWeight: '700', color: '#6b5b45' },

    rowCard: {
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      marginBottom: 10,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 1,
    },
    rowCardMuted: { opacity: 0.55 },
    rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
    rowTitle: { fontSize: 14, fontWeight: '700', color: colors.text, flexShrink: 1 },
    rowAmount: { fontSize: 17, fontWeight: '800', color: '#6b5b45', marginTop: 6 },
    rowDesc: { fontSize: 13, color: colors.textSecondary, marginTop: 6, lineHeight: 18 },
    rowMeta: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
    miniBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
    miniBadgeText: { fontSize: 11, fontWeight: '700' },
    adjPct: { fontSize: 15, fontWeight: '800', color: '#16a34a' },
    adjAmounts: { fontSize: 13, color: colors.textSecondary, marginTop: 6, fontWeight: '600' },
    adjNotified: { fontSize: 12, color: '#16a34a', marginTop: 6 },
  });
}

export function usePropertyDetailStyles() {
  const colors = useThemeColors();
  return useMemo(() => createStyles(colors), [colors]);
}
