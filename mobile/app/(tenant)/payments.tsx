import { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, RefreshControl, Linking, Alert } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Clipboard from 'expo-clipboard';
import { api } from '../../src/lib/api';
import { formatMoney, formatDate } from '@rently/shared';
import { ReceiptModal } from '../../src/components/ReceiptModal';
import { SkeletonScreen } from '../../src/components/ui/Skeleton';
import { EmptyState } from '../../src/components/ui/EmptyState';
import {
  styles,
  FILTERS,
  PaymentCard,
  CashModal,
  TransferModal,
  type Payment,
  type UpcomingPayment,
  type Contract,
} from '../../src/components/tenant-payments';

export default function TenantPayments() {
  const { t } = useTranslation('payments');
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(1);
  const [cashPayment, setCashPayment] = useState<Payment | null>(null);
  const [cashNote, setCashNote] = useState('');
  const [transferPayment, setTransferPayment] = useState<Payment | null>(null);
  const [transferNote, setTransferNote] = useState('');
  const [receiptId, setReceiptId] = useState<string | null>(null);

  const { data: paymentsData, isLoading, isRefetching, refetch } = useQuery<{
    data: Payment[];
    total: number;
  }>({
    queryKey: ['tenant-payments', filter, page],
    queryFn: () =>
      api
        .get('/tenant/payments', { params: { status: filter || undefined, page } })
        .then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: upcoming = [] } = useQuery<UpcomingPayment[]>({
    queryKey: ['tenant-upcoming'],
    queryFn: () => api.get('/tenant/payments/upcoming').then((r) => r.data.data),
    refetchInterval: 30000,
  });

  const { data: contract } = useQuery<Contract>({
    queryKey: ['tenant-contract'],
    queryFn: () => api.get('/tenant/contract').then((r) => r.data.data).catch(() => null),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['tenant-payments'] });
    qc.invalidateQueries({ queryKey: ['tenant-upcoming'] });
  };

  const mpMutation = useMutation({
    mutationFn: (paymentId: string) =>
      api.post(`/tenant/payments/${paymentId}/mercadopago`).then((r) => r.data.data),
    onSuccess: (data: { initPoint: string }) => {
      if (data?.initPoint) Linking.openURL(data.initPoint);
    },
    onError: () => Alert.alert(t('common:error'), t('mp.error')),
  });

  const cashMutation = useMutation({
    mutationFn: (vars: { paymentId: string; note?: string; method?: string }) =>
      api.post('/tenant/payments/cash', vars),
    onSuccess: () => {
      invalidate();
      setCashPayment(null);
      setCashNote('');
      setTransferPayment(null);
      setTransferNote('');
    },
    onError: () => Alert.alert(t('common:error'), t('tenant.payNotifyError')),
  });

  const payments = paymentsData?.data ?? [];
  const total = paymentsData?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    Alert.alert(t('tenant.copiedTitle'), t('tenant.copiedDetail'));
  };

  if (isLoading) {
    return <SkeletonScreen count={5} />;
  }

  const filterLabel = (key: string) =>
    key === '' ? t('filters.all') : t(`domain:paymentStatus.${key}`);

  const header = (
    <View>
      <Text style={styles.title}>{t('tenant.title')}</Text>

      {upcoming.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('tenant.upcomingTitle')}</Text>
          {upcoming.map((p, i) => (
            <View key={p.id} style={[styles.upRow, i === 0 && styles.upRowFirst]}>
              <View>
                <Text style={styles.upMonth}>{p.month}</Text>
                <Text style={styles.upDue}>{t('tenant.dueDate', { date: formatDate(p.dueDate) })}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.upAmount}>
                  {formatMoney(p.amount, p.currency ?? contract?.currency ?? 'ARS')}
                </Text>
                {p.hasAdjustment ? (
                  <Text style={styles.upAdjust}>{t('tenant.adjustment', { pct: p.adjustmentPct })}</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>{t('tenant.historyTitle')}</Text>
      <View style={styles.filterRow}>
        {FILTERS.map((key) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, filter === key && styles.chipActive]}
            onPress={() => {
              setFilter(key);
              setPage(1);
            }}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>{filterLabel(key)}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const footer =
    totalPages > 1 ? (
      <View style={styles.pagination}>
        <TouchableOpacity
          style={[styles.pageBtn, page === 1 && styles.pageBtnDisabled]}
          disabled={page === 1}
          onPress={() => setPage((p) => Math.max(1, p - 1))}
        >
          <Text style={styles.pageBtnText}>{t('tenant.previous')}</Text>
        </TouchableOpacity>
        <Text style={styles.pageInfo}>
          {t('tenant.pageOf', { page, total: totalPages })}
        </Text>
        <TouchableOpacity
          style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
          disabled={page === totalPages}
          onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          <Text style={styles.pageBtnText}>{t('tenant.next')}</Text>
        </TouchableOpacity>
      </View>
    ) : null;

  return (
    <View style={styles.container}>
      <FlatList
        data={payments}
        keyExtractor={(p) => p.id}
        ListHeaderComponent={header}
        ListFooterComponent={footer}
        contentContainerStyle={[styles.list, { paddingTop: insets.top }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6b5b45" colors={['#6b5b45']} />
        }
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        windowSize={7}
        ListEmptyComponent={
          <EmptyState emoji="💸" title={t('tenant.noPayments')} description={t('tenant.emptyDescription')} />
        }
        renderItem={({ item, index }) => (
          <PaymentCard
            item={item}
            index={index}
            mpPending={mpMutation.isPending}
            onPressReceipt={setReceiptId}
            onMercadoPago={mpMutation.mutate}
            onTransfer={(p) => {
              setTransferPayment(p);
              setTransferNote('');
            }}
            onCash={(p) => {
              setCashPayment(p);
              setCashNote('');
            }}
          />
        )}
      />

      <CashModal
        payment={cashPayment}
        note={cashNote}
        onNoteChange={setCashNote}
        onCancel={() => setCashPayment(null)}
        onConfirm={() =>
          cashPayment &&
          cashMutation.mutate({ paymentId: cashPayment.id, note: cashNote || undefined })
        }
        saving={cashMutation.isPending}
      />

      <TransferModal
        payment={transferPayment}
        contract={contract ?? null}
        note={transferNote}
        onNoteChange={setTransferNote}
        onCopy={copy}
        onCancel={() => setTransferPayment(null)}
        onConfirm={() =>
          transferPayment &&
          cashMutation.mutate({
            paymentId: transferPayment.id,
            note: transferNote || undefined,
            method: 'Transferencia',
          })
        }
        saving={cashMutation.isPending}
      />

      <ReceiptModal
        visible={!!receiptId}
        paymentId={receiptId}
        endpoint="/tenant/payments"
        defaultCurrency="ARS"
        onClose={() => setReceiptId(null)}
      />
    </View>
  );
}
