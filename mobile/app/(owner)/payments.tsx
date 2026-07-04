import { useState, useMemo } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Alert, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '../../src/lib/api';
import { dmyToYmd } from '../../src/lib/dates';
import { formatMoney } from '@rently/shared';
import { ReceiptModal } from '../../src/components/ReceiptModal';
import { SkeletonScreen } from '../../src/components/ui/Skeleton';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { syncStorage } from '../../src/storage';
import {
  useOwnerPaymentsStyles,
  FILTERS,
  PaymentCard,
  MarkPaidModal,
  SplitModal,
  type Payment,
} from '../../src/components/owner-payments';

export default function OwnerPayments() {
  const { t } = useTranslation('payments');
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const styles = useOwnerPaymentsStyles();
  const [filter, setFilter] = useState('all');
  const [markPayment, setMarkPayment] = useState<Payment | null>(null);
  const [method, setMethod] = useState('Transferencia');
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [splitPayment, setSplitPayment] = useState<Payment | null>(null);
  const [splitCount, setSplitCount] = useState(2);
  const [splitDates, setSplitDates] = useState<string[]>(['', '']);

  const downloadPdf = useMutation({
    mutationFn: async () => {
      const baseUrl = api.defaults.baseURL;
      if (!baseUrl) throw new Error('No API URL');

      const token = syncStorage.getItem('accessToken');
      const filename = `reporte-cobros-${new Date().toISOString().slice(0, 10)}.pdf`;
      const fileUri = `${FileSystem.cacheDirectory}${filename}`;

      const result = await FileSystem.downloadAsync(
        `${baseUrl}/owner/reports/payments/export`,
        fileUri,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(result.uri, {
          mimeType: 'application/pdf',
          dialogTitle: t('page.reportTitle'),
        });
        return;
      }

      await Linking.openURL(result.uri);
    },
    onError: () => Alert.alert(t('common:error'), t('toast.pdfError')),
  });

  const { data: payments = [], isLoading, isRefetching, refetch } = useQuery<Payment[]>({
    queryKey: ['owner-payments'],
    queryFn: () => api.get('/payments').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const markPaid = useMutation({
    mutationFn: (vars: { id: string; method: string }) =>
      api.patch(`/payments/${vars.id}`, {
        status: 'PAID',
        paidDate: new Date().toISOString(),
        method: vars.method,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-payments'] });
      setMarkPayment(null);
    },
  });

  const splitMutation = useMutation({
    mutationFn: (vars: { id: string; installmentCount: number; dueDates: string[] }) =>
      api.post(`/payments/${vars.id}/split`, {
        installmentCount: vars.installmentCount,
        dueDates: vars.dueDates.map((d) => new Date(`${d}T12:00:00`).toISOString()),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['owner-payments'] });
      setSplitPayment(null);
    },
    onError: (e: any) =>
      Alert.alert(t('common:error'), e?.response?.data?.message ?? t('common:couldNotSplitPayment')),
  });

  function openSplitModal(payment: Payment) {
    setSplitPayment(payment);
    setSplitCount(2);
    setSplitDates(['', '']);
  }

  function handleSplitCountChange(count: number) {
    setSplitCount(count);
    setSplitDates(Array(count).fill(''));
  }

  function handleSplitDateChange(index: number, value: string) {
    setSplitDates((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function handleSplit() {
    if (splitDates.some((d) => !d.match(/^\d{2}\/\d{2}\/\d{4}$/))) {
      Alert.alert(t('common:error'), t('common:fillAllDatesFormat'));
      return;
    }
    // Validar que las fechas estén en orden
    for (let i = 1; i < splitDates.length; i++) {
      if (splitDates[i] <= splitDates[i - 1]) {
        Alert.alert(t('common:error'), t('common:datesMustBeAscending'));
        return;
      }
    }
    if (!splitPayment) return;
    const dueDatesIso = splitDates.map(dmyToYmd);
    splitMutation.mutate({ id: splitPayment.id, installmentCount: splitCount, dueDates: dueDatesIso });
  }

  const filtered = filter === 'all' ? payments : payments.filter((p) => p.status === filter);

  const [viewCurrency, setViewCurrency] = useState<'USD' | 'ARS'>('USD');

  const { totalPaidUsd, totalPaidArs, lateUsd, lateArs, lateCount } = useMemo(() => {
    let paidUsd = 0, paidArs = 0, lUsd = 0, lArs = 0, lCount = 0;
    for (const p of payments) {
      const cur = p.currency ?? 'USD';
      if (p.status === 'PAID') {
        if (cur === 'USD') paidUsd += p.amount;
        else paidArs += p.amount;
      } else if (p.status === 'LATE') {
        lCount++;
        if (cur === 'USD') lUsd += p.amount;
        else lArs += p.amount;
      }
    }
    return { totalPaidUsd: paidUsd, totalPaidArs: paidArs, lateUsd: lUsd, lateArs: lArs, lateCount: lCount };
  }, [payments]);

  if (isLoading) {
    return <SkeletonScreen count={5} />;
  }

  const header = (
    <View>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('page.title')}</Text>
        <TouchableOpacity
          style={[styles.downloadBtn, downloadPdf.isPending && styles.downloadBtnDisabled]}
          onPress={() => downloadPdf.mutate()}
          disabled={downloadPdf.isPending}
        >
          <Text style={styles.downloadBtnText}>
            {downloadPdf.isPending ? t('common:generating') : t('common:downloadPdf')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <Text style={styles.statLabel}>{t('stats.totalCollected')}</Text>
            <View style={{ flexDirection: 'row', backgroundColor: '#f0ede6', borderRadius: 999, padding: 2 }}>
              {(['USD', 'ARS'] as const).map((c) => (
                <TouchableOpacity key={c} onPress={() => setViewCurrency(c)} style={{ paddingHorizontal: 10, paddingVertical: 3, borderRadius: 999, backgroundColor: viewCurrency === c ? '#fff' : 'transparent' }}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: viewCurrency === c ? '#2d2d2d' : '#aaa' }}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <Text style={styles.statValue}>
            {viewCurrency === 'USD' ? formatMoney(totalPaidUsd, 'USD') : formatMoney(totalPaidArs, 'ARS')}
          </Text>
          {viewCurrency === 'USD' ? (
            totalPaidArs > 0 && <Text style={styles.statSub}>{formatMoney(totalPaidArs, 'ARS')}</Text>
          ) : (
            totalPaidUsd > 0 && <Text style={styles.statSub}>{formatMoney(totalPaidUsd, 'USD')}</Text>
          )}
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, (lateUsd + lateArs) > 0 && { color: '#dc2626' }]}>
            {viewCurrency === 'USD' ? formatMoney(lateUsd, 'USD') : formatMoney(lateArs, 'ARS')}
          </Text>
          <Text style={styles.statLabel}>{t('payments:filters.overdue')}</Text>
          {viewCurrency === 'USD' ? (
            lateArs > 0 && <Text style={styles.statSub}>{formatMoney(lateArs, 'ARS')}</Text>
          ) : (
            lateUsd > 0 && <Text style={styles.statSub}>{formatMoney(lateUsd, 'USD')}</Text>
          )}
          {lateCount > 0 && <Text style={[styles.statSub, { color: '#dc2626' }]}>{lateCount} {t('stats.overdue')}</Text>}
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, filter === key && styles.chipActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>
              {key === 'all' ? t('filters.all') : t(`domain:paymentStatus.${key}`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filtered}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        contentContainerStyle={[styles.list, { paddingTop: insets.top }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6b5b45" colors={['#6b5b45']} />
        }
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        windowSize={7}
        ListEmptyComponent={
          <EmptyState
            emoji="💰"
            title={filter === 'all' ? t('common:emptyPaymentsTitle') : t('common:nothingInStatus')}
            description={
              filter === 'all'
                ? t('common:paymentsWillAppear')
                : t('common:tryAnotherFilter')
            }
          />
        }
        renderItem={({ item, index }) => (
          <PaymentCard
            item={item}
            index={index}
            onPressReceipt={setReceiptId}
            onMarkPaid={(p) => {
              setMarkPayment(p);
              setMethod(p.method || 'Transferencia');
            }}
            onSplit={openSplitModal}
          />
        )}
      />

      <MarkPaidModal
        payment={markPayment}
        method={method}
        onSelectMethod={setMethod}
        onCancel={() => setMarkPayment(null)}
        onConfirm={() => markPayment && markPaid.mutate({ id: markPayment.id, method })}
        saving={markPaid.isPending}
      />

      <ReceiptModal
        visible={!!receiptId}
        paymentId={receiptId}
        endpoint="/payments"
        defaultCurrency="USD"
        onClose={() => setReceiptId(null)}
      />

      <SplitModal
        payment={splitPayment}
        splitCount={splitCount}
        splitDates={splitDates}
        onCountChange={handleSplitCountChange}
        onDateChange={handleSplitDateChange}
        onCancel={() => setSplitPayment(null)}
        onConfirm={handleSplit}
        saving={splitMutation.isPending}
      />
    </View>
  );
}
