import { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Alert,
  Linking,
  TextInput,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { api } from '../../src/lib/api';
import { ReceiptModal } from '../../src/components/ReceiptModal';
import { syncStorage } from '../../src/storage';

type Payment = {
  id: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  period: string;
  dueDate: string;
  paidDate?: string;
  status: string;
  method?: string;
  installmentGroupId?: string;
  installmentNumber?: number;
  installmentCount?: number;
  contract: {
    property: { name?: string; address: string };
    tenant?: { name: string };
  };
};

const FILTERS: [string, string][] = [
  ['all', 'Todos'],
  ['PAID', 'Pagados'],
  ['PENDING', 'Pendientes'],
  ['PENDING_CONFIRMATION', 'A confirmar'],
  ['LATE', 'En mora'],
];

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PAID: { label: 'Pagado', color: '#16a34a', bg: '#dcfce7' },
  PENDING: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7' },
  LATE: { label: 'En mora', color: '#dc2626', bg: '#fee2e2' },
  PENDING_CONFIRMATION: { label: 'A confirmar', color: '#c2410c', bg: '#ffedd5' },
};

const METHODS = ['Efectivo', 'Mercado Pago', 'Transferencia'];
const METHOD_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Efectivo: { label: 'Efectivo', color: '#166534', bg: '#dcfce7' },
  'Mercado Pago': { label: 'Mercado Pago', color: '#1d4ed8', bg: '#dbeafe' },
  Transferencia: { label: 'Transferencia', color: '#374151', bg: '#f3f4f6' },
};

function fmtMoney(n: number, currency: 'ARS' | 'USD' = 'USD') {
  const sep = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return currency === 'USD' ? `USD ${sep}` : `$ ${sep}`;
}

function fmtDate(d: string) {
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
}

function MethodBadge({ method }: { method?: string }) {
  if (!method) return <Text style={styles.methodMissing}>—</Text>;
  const cfg = METHOD_CONFIG[method] ?? { label: method, color: '#374151', bg: '#f3f4f6' };
  return (
    <View style={[styles.methodBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.methodBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}

const INSTALLMENT_COUNTS = [2, 3, 4, 6];

export default function OwnerPayments() {
  const qc = useQueryClient();
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
          dialogTitle: 'Reporte de cobros',
        });
        return;
      }

      await Linking.openURL(result.uri);
    },
    onError: () => Alert.alert('Error', 'No se pudo generar el PDF.'),
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
      Alert.alert('Error', e?.response?.data?.message ?? 'No se pudo dividir el pago'),
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

  function handleSplit() {
    if (splitDates.some((d) => !d.match(/^\d{2}\/\d{2}\/\d{4}$/))) {
      Alert.alert('Error', 'Completá todas las fechas en formato DD/MM/AAAA');
      return;
    }
    // Validar que las fechas estén en orden
    for (let i = 1; i < splitDates.length; i++) {
      if (splitDates[i] <= splitDates[i - 1]) {
        Alert.alert('Error', 'Las fechas deben estar en orden ascendente');
        return;
      }
    }
    if (!splitPayment) return;
    const dueDatesIso = splitDates.map(d => { const [dd, mm, yyyy] = d.split('/'); return `${yyyy}-${mm}-${dd}`; });
    splitMutation.mutate({ id: splitPayment.id, installmentCount: splitCount, dueDates: dueDatesIso });
  }

  const filtered = filter === 'all' ? payments : payments.filter((p) => p.status === filter);

  const { totalPaidUsd, totalPaidArs, pendingUsd, pendingArs, paidCount, lateCount } = useMemo(() => {
    let paidUsd = 0, paidArs = 0, pendUsd = 0, pendArs = 0, pCount = 0, lCount = 0;
    for (const p of payments) {
      const cur = p.currency ?? 'USD';
      if (p.status === 'PAID') {
        pCount++;
        if (cur === 'USD') paidUsd += p.amount;
        else paidArs += p.amount;
      } else {
        if (p.status === 'LATE') lCount++;
        if (cur === 'USD') pendUsd += p.amount;
        else pendArs += p.amount;
      }
    }
    return { totalPaidUsd: paidUsd, totalPaidArs: paidArs, pendingUsd: pendUsd, pendingArs: pendArs, paidCount: pCount, lateCount: lCount };
  }, [payments]);

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6b5b45" size="large" />
      </View>
    );
  }

  const header = (
    <View>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Cobros</Text>
        <TouchableOpacity
          style={[styles.downloadBtn, downloadPdf.isPending && styles.downloadBtnDisabled]}
          onPress={() => downloadPdf.mutate()}
          disabled={downloadPdf.isPending}
        >
          <Text style={styles.downloadBtnText}>
            {downloadPdf.isPending ? 'Generando...' : 'Descargar PDF'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{fmtMoney(totalPaidUsd, 'USD')}</Text>
          <Text style={styles.statLabel}>Total cobrado USD</Text>
          {totalPaidArs > 0 && <Text style={styles.statSub}>{fmtMoney(totalPaidArs, 'ARS')}</Text>}
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, (pendingUsd + pendingArs) > 0 && { color: '#dc2626' }]}>
            {fmtMoney(pendingUsd, 'USD')}
          </Text>
          <Text style={styles.statLabel}>Pendiente USD</Text>
          {pendingArs > 0 && <Text style={styles.statSub}>{fmtMoney(pendingArs, 'ARS')}</Text>}
        </View>
      </View>
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{payments.length}</Text>
          <Text style={styles.statLabel}>Cobros totales</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statValue, { color: '#16a34a' }]}>{paidCount}</Text>
          <Text style={styles.statLabel}>Pagados</Text>
          {lateCount > 0 && <Text style={[styles.statSub, { color: '#dc2626' }]}>{lateCount} en mora</Text>}
        </View>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, filter === key && styles.chipActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>{label}</Text>
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
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        initialNumToRender={8}
        maxToRenderPerBatch={5}
        windowSize={7}
        removeClippedSubviews
        ListEmptyComponent={
          <Text style={styles.empty}>No hay cobros{filter !== 'all' ? ' en este estado' : ''}.</Text>
        }
        renderItem={({ item }) => {
          const st = STATUS[item.status] ?? STATUS.PENDING;
          const canMark =
            item.status === 'PENDING' ||
            item.status === 'LATE' ||
            item.status === 'PENDING_CONFIRMATION';
          return (
            <TouchableOpacity
              activeOpacity={item.status === 'PAID' ? 0.7 : 1}
              onPress={() => item.status === 'PAID' && setReceiptId(item.id)}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <Text style={styles.cardProperty} numberOfLines={1}>
                  {item.contract.property.name ?? item.contract.property.address}
                </Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
              <Text style={styles.cardTenant}>
                {item.contract.tenant?.name ?? 'Sin inquilino'} · {item.period}
              </Text>
              <View style={styles.cardBottom}>
                <Text style={styles.cardAmount}>{fmtMoney(item.amount, item.currency ?? 'USD')}</Text>
              </View>
              <View style={styles.cardMetaRow}>
                <Text style={styles.cardDue}>Vence {fmtDate(item.dueDate)}</Text>
                <MethodBadge method={item.method} />
              </View>
              {(item.installmentCount ?? 1) > 1 && (
                <View style={styles.installmentBadge}>
                  <Text style={styles.installmentBadgeText}>
                    Cuota {item.installmentNumber}/{item.installmentCount}
                  </Text>
                </View>
              )}
              {canMark ? (
                <View style={styles.actionRow}>
                  <TouchableOpacity
                    style={[styles.actionBtn, { flex: 1 }]}
                    onPress={() => {
                      setMarkPayment(item);
                      setMethod(item.method || 'Transferencia');
                    }}
                  >
                    <Text style={styles.actionBtnText}>
                      {item.status === 'PENDING_CONFIRMATION' ? 'Confirmar pago' : 'Marcar pagado'}
                    </Text>
                  </TouchableOpacity>
                  {(item.installmentCount ?? 1) === 1 && item.status !== 'PENDING_CONFIRMATION' && (
                    <TouchableOpacity
                      style={styles.splitBtn}
                      onPress={() => openSplitModal(item)}
                    >
                      <Text style={styles.splitBtnText}>En cuotas</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <Text style={styles.receiptHint}>Ver comprobante →</Text>
              )}
            </TouchableOpacity>
          );
        }}
      />

      {/* Mark paid modal */}
      <Modal
        visible={!!markPayment}
        transparent
        animationType="fade"
        onRequestClose={() => setMarkPayment(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Registrar pago</Text>
            {markPayment ? (
              <>
                <Text style={styles.modalSub}>
                  {markPayment.contract.property.name ?? markPayment.contract.property.address}
                </Text>
                <Text style={styles.modalAmount}>
                  {fmtMoney(markPayment.amount, markPayment.currency ?? 'USD')}
                </Text>
                <Text style={styles.modalPeriod}>Período {markPayment.period}</Text>

                <Text style={styles.modalLabel}>Método de pago</Text>
                <View style={styles.methodRow}>
                  {METHODS.map((m) => (
                    <TouchableOpacity
                      key={m}
                      style={[styles.methodBtn, method === m && styles.methodBtnActive]}
                      onPress={() => setMethod(m)}
                    >
                      <Text style={[styles.methodText, method === m && styles.methodTextActive]}>
                        {m}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.modalCancel}
                    onPress={() => setMarkPayment(null)}
                  >
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirm}
                    onPress={() => markPaid.mutate({ id: markPayment.id, method })}
                    disabled={markPaid.isPending}
                  >
                    <Text style={styles.modalConfirmText}>
                      {markPaid.isPending ? 'Guardando...' : 'Confirmar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Receipt modal */}
      <ReceiptModal
        visible={!!receiptId}
        paymentId={receiptId}
        endpoint="/payments"
        defaultCurrency="USD"
        onClose={() => setReceiptId(null)}
      />

      {/* Split installments modal */}
      <Modal
        visible={!!splitPayment}
        transparent
        animationType="slide"
        onRequestClose={() => setSplitPayment(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pago en cuotas</Text>
            {splitPayment ? (
              <>
                <Text style={styles.modalSub}>
                  {splitPayment.contract.property.name ?? splitPayment.contract.property.address}
                </Text>
                <Text style={styles.modalAmount}>
                  {fmtMoney(splitPayment.amount, splitPayment.currency ?? 'USD')}
                </Text>
                <Text style={styles.modalPeriod}>Período {splitPayment.period}</Text>

                <Text style={styles.modalLabel}>Número de cuotas</Text>
                <View style={styles.methodRow}>
                  {INSTALLMENT_COUNTS.map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.methodBtn, splitCount === n && styles.methodBtnActive]}
                      onPress={() => handleSplitCountChange(n)}
                    >
                      <Text style={[styles.methodText, splitCount === n && styles.methodTextActive]}>
                        {n}x
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.splitAmountHint}>
                  {fmtMoney(Math.round(splitPayment.amount / splitCount * 100) / 100, splitPayment.currency ?? 'USD')} por cuota
                </Text>

                <Text style={styles.modalLabel}>Fechas de vencimiento</Text>
                {Array.from({ length: splitCount }).map((_, i) => (
                  <View key={i} style={styles.dateInputRow}>
                    <Text style={styles.dateInputLabel}>Cuota {i + 1}</Text>
                    <TextInput
                      style={[styles.dateInput]}
                      value={splitDates[i] ?? ''}
                      onChangeText={(v) => {
                        const next = [...splitDates];
                        next[i] = v;
                        setSplitDates(next);
                      }}
                      placeholder="DD/MM/AAAA"
                      keyboardType="numbers-and-punctuation"
                    />
                  </View>
                ))}

                <View style={styles.modalActions}>
                  <TouchableOpacity style={styles.modalCancel} onPress={() => setSplitPayment(null)}>
                    <Text style={styles.modalCancelText}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalConfirm}
                    onPress={handleSplit}
                    disabled={splitMutation.isPending}
                  >
                    <Text style={styles.modalConfirmText}>
                      {splitMutation.isPending ? 'Guardando...' : 'Confirmar'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf8f5' },
  list: { padding: 20, paddingTop: 60, paddingBottom: 32, gap: 10 },
  title: { fontSize: 26, fontWeight: '800', color: '#2d2d2d' },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 16 },
  downloadBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
    backgroundColor: '#f0ede6',
  },
  downloadBtnDisabled: { opacity: 0.6 },
  downloadBtnText: { fontSize: 12, fontWeight: '700', color: '#6b5b45' },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  statValue: { fontSize: 19, fontWeight: '800', color: '#2d2d2d' },
  statLabel: { fontSize: 12, color: '#888', marginTop: 2 },
  statSub: { fontSize: 11, color: '#aaa', marginTop: 1 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 6, marginBottom: 6 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e0dbd4',
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#6b5b45', backgroundColor: '#f0ede6' },
  chipText: { fontSize: 12, color: '#888', fontWeight: '600' },
  chipTextActive: { color: '#6b5b45' },

  empty: { textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: 30 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardProperty: { flex: 1, fontSize: 15, fontWeight: '700', color: '#2d2d2d' },
  cardTenant: { fontSize: 13, color: '#888', marginTop: 3 },
  cardBottom: { marginTop: 8 },
  cardMetaRow: { marginTop: 6, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  cardAmount: { fontSize: 19, fontWeight: '800', color: '#6b5b45' },
  cardDue: { fontSize: 12, color: '#aaa' },
  methodBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  methodBadgeText: { fontSize: 11, fontWeight: '700' },
  methodMissing: { fontSize: 12, color: '#aaa' },
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
  receiptHint: { marginTop: 10, fontSize: 12, color: '#aaa', fontWeight: '600' },
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
  splitAmountHint: { fontSize: 12, color: '#888', marginTop: 4, marginBottom: 4 },
  dateInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  dateInputLabel: { fontSize: 13, fontWeight: '600', color: '#555', width: 60 },
  dateInput: { flex: 1, borderWidth: 1.5, borderColor: '#e0dbd4', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, fontSize: 14, color: '#2d2d2d', backgroundColor: '#faf8f5' },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 22 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#2d2d2d', marginBottom: 12 },
  modalSub: { fontSize: 13, color: '#888' },
  modalAmount: { fontSize: 24, fontWeight: '800', color: '#2d2d2d', marginTop: 4 },
  modalPeriod: { fontSize: 12, color: '#aaa', marginTop: 2 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 16, marginBottom: 8 },
  methodRow: { flexDirection: 'row', gap: 8 },
  methodBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#e0dbd4',
    backgroundColor: '#faf8f5',
    alignItems: 'center',
  },
  methodBtnActive: { borderColor: '#6b5b45', backgroundColor: '#f0ede6' },
  methodText: { fontSize: 12, fontWeight: '600', color: '#888' },
  methodTextActive: { color: '#6b5b45' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#f0ede6',
    alignItems: 'center',
  },
  modalCancelText: { color: '#888', fontSize: 14, fontWeight: '700' },
  modalConfirm: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#6b5b45',
    alignItems: 'center',
  },
  modalConfirmText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
