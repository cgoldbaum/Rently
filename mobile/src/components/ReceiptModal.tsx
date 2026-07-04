import { useMemo } from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { formatMoney, formatDate } from '@rently/shared';
import { api } from '../lib/api';
import { useThemeColors } from '../theme/useThemeColors';
import type { ThemeColors } from '../theme/colors';

type Receipt = {
  receiptNumber: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  period: string;
  paidDate?: string;
  method?: string;
  property?: string;
  mp?: {
    paymentId: string;
    status: string;
    statusDetail?: string;
    payerEmail?: string;
    dateApproved?: string;
  } | null;
};

/**
 * Payment receipt modal. `endpoint` is the base path used to fetch the receipt:
 * "/payments" for owners, "/tenant/payments" for tenants.
 */
export function ReceiptModal({
  visible,
  paymentId,
  endpoint,
  defaultCurrency = 'ARS',
  onClose,
}: {
  visible: boolean;
  paymentId: string | null;
  endpoint: string;
  defaultCurrency?: 'ARS' | 'USD';
  onClose: () => void;
}) {
  const { t } = useTranslation('payments');
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { data: receipt, isLoading, isError } = useQuery<Receipt>({
    queryKey: ['receipt', endpoint, paymentId],
    queryFn: () => api.get(`${endpoint}/${paymentId}/receipt`).then((r) => r.data.data),
    enabled: visible && !!paymentId,
  });

  const rows: [string, string][] = receipt
    ? [
        [t('receipt.operationId'), receipt.mp?.paymentId ?? receipt.receiptNumber.slice(0, 8).toUpperCase()],
        ...(receipt.property ? ([[t('receipt.property'), receipt.property]] as [string, string][]) : []),
        [t('receipt.period'), receipt.period],
        [t('receipt.amount'), formatMoney(receipt.amount, receipt.currency ?? defaultCurrency)],
        [t('receipt.method'), receipt.method ?? t('markPaid.methodCash')],
        [t('receipt.paymentDate'), receipt.paidDate ? formatDate(receipt.paidDate) : '—'],
        ...(receipt.mp?.status !== 'approved'
          ? ([[t('receipt.mpStatus'), receipt.mp?.status ?? '—']] as [string, string][])
          : []),
        ...(receipt.mp?.statusDetail && receipt.mp.statusDetail !== 'accredited'
          ? ([[t('receipt.mpDetail'), receipt.mp.statusDetail]] as [string, string][])
          : []),
        ...(receipt.mp?.payerEmail
          ? ([[t('receipt.paidBy'), receipt.mp.payerEmail]] as [string, string][])
          : []),
        ...(receipt.mp?.dateApproved
          ? ([[t('receipt.accreditationDate'), formatDate(receipt.mp.dateApproved)]] as [string, string][])
          : []),
      ]
    : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.title}>{t('receipt.title')}</Text>
          </View>
          <View style={styles.body}>
            {isLoading ? (
              <ActivityIndicator color="#6b5b45" />
            ) : isError ? (
              <Text style={styles.error}>{t('receipt.noReceipt')}</Text>
            ) : (
              rows.map(([k, v]) => (
                <View key={k} style={styles.row}>
                  <Text style={styles.key}>{k}</Text>
                  <Text style={styles.value}>{v}</Text>
                </View>
              ))
            )}
            <TouchableOpacity style={styles.close} onPress={onClose}>
              <Text style={styles.closeText}>{t('actions.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'center', padding: 24 },
    card: { backgroundColor: colors.card, borderRadius: 16, overflow: 'hidden' },
    header: { backgroundColor: '#5f835f', padding: 18, alignItems: 'center' },
    check: { fontSize: 30, color: '#fff' },
    title: { fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 2 },
    body: { padding: 18, backgroundColor: colors.background },
    row: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    key: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
    value: { fontSize: 13, color: colors.text, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
    error: { fontSize: 14, color: '#dc2626', textAlign: 'center' },
    close: {
      marginTop: 16,
      paddingVertical: 13,
      borderRadius: 10,
      backgroundColor: colors.backgroundElevated,
      alignItems: 'center',
    },
    closeText: { color: colors.text, fontSize: 15, fontWeight: '700' },
  });
}
