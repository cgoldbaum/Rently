import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  Linking,
  Alert,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { api } from '../../src/lib/api';
import { ReceiptModal } from '../../src/components/ReceiptModal';

type Payment = {
  id: string;
  period: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  dueDate: string;
  paidDate?: string;
  status: string;
  method?: string;
  cashNote?: string;
};

type UpcomingPayment = {
  id: string;
  month: string;
  dueDate: string;
  amount: number;
  currency?: 'ARS' | 'USD';
  hasAdjustment: boolean;
  adjustmentPct: number | null;
};

type Contract = {
  currency?: 'ARS' | 'USD';
  ownerPaymentInfo: {
    alias: string;
    cbu: string;
    email: string;
    whatsapp: string;
    ownerName: string;
  };
} | null;

const FILTERS: [string, string][] = [
  ['', 'Todos'],
  ['PAID', 'Pagados'],
  ['PENDING', 'Pendientes'],
  ['LATE', 'Vencidos'],
  ['PENDING_CONFIRMATION', 'En confirmación'],
];

const STATUS: Record<string, { label: string; color: string; bg: string }> = {
  PAID: { label: 'Pagado', color: '#16a34a', bg: '#dcfce7' },
  PENDING: { label: 'Pendiente', color: '#b45309', bg: '#fef3c7' },
  LATE: { label: 'Vencido', color: '#dc2626', bg: '#fee2e2' },
  PENDING_CONFIRMATION: { label: 'Pend. confirmación', color: '#c2410c', bg: '#ffedd5' },
};

function fmtMoney(n: number, currency: 'ARS' | 'USD' = 'ARS') {
  const sep = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return currency === 'USD' ? `USD ${sep}` : `$ ${sep}`;
}

function fmtDate(d: string) {
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
}

export default function TenantPayments() {
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
    refetchInterval: 10000,
  });

  const { data: upcoming = [] } = useQuery<UpcomingPayment[]>({
    queryKey: ['tenant-upcoming'],
    queryFn: () => api.get('/tenant/payments/upcoming').then((r) => r.data.data),
    refetchInterval: 10000,
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
    onError: () => Alert.alert('Error', 'No se pudo iniciar el pago con Mercado Pago.'),
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
    onError: () => Alert.alert('Error', 'No se pudo registrar el aviso de pago.'),
  });

  const payments = paymentsData?.data ?? [];
  const total = paymentsData?.total ?? 0;
  const totalPages = Math.ceil(total / 20);

  const copy = async (value: string) => {
    await Clipboard.setStringAsync(value);
    Alert.alert('Copiado', 'Se copió al portapapeles.');
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6b5b45" size="large" />
      </View>
    );
  }

  const header = (
    <View>
      <Text style={styles.title}>Mis pagos</Text>

      {upcoming.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Próximos pagos</Text>
          {upcoming.map((p, i) => (
            <View key={p.id} style={[styles.upRow, i === 0 && styles.upRowFirst]}>
              <View>
                <Text style={styles.upMonth}>{p.month}</Text>
                <Text style={styles.upDue}>Vence {fmtDate(p.dueDate)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.upAmount}>
                  {fmtMoney(p.amount, p.currency ?? contract?.currency ?? 'ARS')}
                </Text>
                {p.hasAdjustment ? (
                  <Text style={styles.upAdjust}>+{p.adjustmentPct}% ajuste</Text>
                ) : null}
              </View>
            </View>
          ))}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Historial de pagos</Text>
      <View style={styles.filterRow}>
        {FILTERS.map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, filter === key && styles.chipActive]}
            onPress={() => {
              setFilter(key);
              setPage(1);
            }}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>{label}</Text>
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
          <Text style={styles.pageBtnText}>← Anterior</Text>
        </TouchableOpacity>
        <Text style={styles.pageInfo}>
          {page} / {totalPages}
        </Text>
        <TouchableOpacity
          style={[styles.pageBtn, page === totalPages && styles.pageBtnDisabled]}
          disabled={page === totalPages}
          onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
        >
          <Text style={styles.pageBtnText}>Siguiente →</Text>
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
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} />}
        ListEmptyComponent={<Text style={styles.empty}>No hay pagos para mostrar.</Text>}
        renderItem={({ item }) => {
          const st = STATUS[item.status] ?? STATUS.PENDING;
          const canPay = item.status === 'PENDING' || item.status === 'LATE';
          return (
            <TouchableOpacity
              activeOpacity={item.status === 'PAID' ? 0.7 : 1}
              onPress={() => item.status === 'PAID' && setReceiptId(item.id)}
              style={styles.card}
            >
              <View style={styles.payTop}>
                <Text style={styles.payPeriod}>{item.period}</Text>
                <View style={[styles.badge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                </View>
              </View>
              <Text style={styles.payMeta}>
                Vto. {fmtDate(item.dueDate)}
                {item.paidDate ? ` · Pagado ${fmtDate(item.paidDate)}` : ''}
                {item.method ? ` · ${item.method}` : ''}
              </Text>
              {item.cashNote ? <Text style={styles.payNote}>"{item.cashNote}"</Text> : null}
              <Text style={styles.payAmount}>
                {fmtMoney(item.amount, item.currency ?? 'ARS')}
              </Text>

              {canPay ? (
                <View style={styles.payButtons}>
                  <TouchableOpacity
                    style={[styles.payBtn, styles.payBtnMp]}
                    onPress={() => mpMutation.mutate(item.id)}
                    disabled={mpMutation.isPending}
                  >
                    <Text style={styles.payBtnMpText}>Mercado Pago</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.payBtn}
                    onPress={() => {
                      setTransferPayment(item);
                      setTransferNote('');
                    }}
                  >
                    <Text style={styles.payBtnText}>Transferencia</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.payBtn}
                    onPress={() => {
                      setCashPayment(item);
                      setCashNote('');
                    }}
                  >
                    <Text style={styles.payBtnText}>Efectivo</Text>
                  </TouchableOpacity>
                </View>
              ) : null}
              {item.status === 'PENDING_CONFIRMATION' ? (
                <Text style={styles.waitHint}>Esperando confirmación del propietario</Text>
              ) : null}
              {item.status === 'PAID' ? (
                <Text style={styles.waitHint}>Ver comprobante →</Text>
              ) : null}
            </TouchableOpacity>
          );
        }}
      />

      {/* Cash modal */}
      <Modal
        visible={!!cashPayment}
        transparent
        animationType="fade"
        onRequestClose={() => setCashPayment(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Registrar pago en efectivo</Text>
            {cashPayment ? (
              <Text style={styles.modalSub}>
                {cashPayment.period} · {fmtMoney(cashPayment.amount, cashPayment.currency ?? 'ARS')}
              </Text>
            ) : null}
            <Text style={styles.modalLabel}>Nota (opcional)</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Ej: Lo coordiné por WhatsApp con el propietario"
              placeholderTextColor="#aaa"
              value={cashNote}
              onChangeText={setCashNote}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCashPayment(null)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                disabled={cashMutation.isPending}
                onPress={() =>
                  cashPayment &&
                  cashMutation.mutate({ paymentId: cashPayment.id, note: cashNote || undefined })
                }
              >
                <Text style={styles.modalConfirmText}>
                  {cashMutation.isPending ? 'Avisando...' : 'Avisar pago'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Transfer modal */}
      <Modal
        visible={!!transferPayment}
        transparent
        animationType="fade"
        onRequestClose={() => setTransferPayment(null)}
      >
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Pagar por transferencia</Text>
            {transferPayment ? (
              <Text style={styles.modalSub}>
                {transferPayment.period} ·{' '}
                {fmtMoney(transferPayment.amount, transferPayment.currency ?? 'ARS')}
              </Text>
            ) : null}

            {contract?.ownerPaymentInfo ? (
              <View style={styles.transferData}>
                {(
                  [
                    ['Alias', contract.ownerPaymentInfo.alias],
                    ['CBU/CVU', contract.ownerPaymentInfo.cbu],
                    ['Titular', contract.ownerPaymentInfo.ownerName],
                  ] as [string, string][]
                ).map(([label, value]) => (
                  <View key={label} style={styles.transferRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.transferLabel}>{label}</Text>
                      <Text style={styles.transferValue}>{value || 'No configurado'}</Text>
                    </View>
                    {value ? (
                      <TouchableOpacity style={styles.copyBtn} onPress={() => copy(value)}>
                        <Text style={styles.copyBtnText}>Copiar</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <Text style={styles.modalLabel}>
                El propietario no cargó sus datos de transferencia.
              </Text>
            )}

            <Text style={styles.modalLabel}>Nota o referencia (opcional)</Text>
            <TextInput
              style={styles.textarea}
              placeholder="Ej: Transferí desde Banco Nación, comprobante 1234"
              placeholderTextColor="#aaa"
              value={transferNote}
              onChangeText={setTransferNote}
              multiline
            />

            {contract?.ownerPaymentInfo && transferPayment ? (
              <View style={styles.contactRow}>
                <TouchableOpacity
                  style={styles.contactBtn}
                  onPress={() =>
                    Linking.openURL(
                      `mailto:${contract.ownerPaymentInfo.email}?subject=${encodeURIComponent(
                        `Comprobante de pago ${transferPayment.period}`
                      )}&body=${encodeURIComponent(
                        `Hola, adjunto/envio el comprobante del pago de ${transferPayment.period} por ${fmtMoney(
                          transferPayment.amount,
                          transferPayment.currency ?? 'ARS'
                        )}.`
                      )}`
                    )
                  }
                >
                  <Text style={styles.contactBtnText}>Mail</Text>
                </TouchableOpacity>
                {contract.ownerPaymentInfo.whatsapp ? (
                  <TouchableOpacity
                    style={[styles.contactBtn, styles.contactBtnWa]}
                    onPress={() =>
                      Linking.openURL(
                        `https://wa.me/${contract.ownerPaymentInfo.whatsapp.replace(
                          /\D/g,
                          ''
                        )}?text=${encodeURIComponent(
                          `Hola, te envio el comprobante del pago de ${transferPayment.period} por ${fmtMoney(
                            transferPayment.amount,
                            transferPayment.currency ?? 'ARS'
                          )}.`
                        )}`
                      )
                    }
                  >
                    <Text style={styles.contactBtnWaText}>WhatsApp</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancel}
                onPress={() => setTransferPayment(null)}
              >
                <Text style={styles.modalCancelText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirm}
                disabled={cashMutation.isPending}
                onPress={() =>
                  transferPayment &&
                  cashMutation.mutate({
                    paymentId: transferPayment.id,
                    note: transferNote || undefined,
                    method: 'Transferencia',
                  })
                }
              >
                <Text style={styles.modalConfirmText}>
                  {cashMutation.isPending ? 'Avisando...' : 'Avisar transferencia'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#faf8f5' },
  list: { padding: 20, paddingTop: 60, paddingBottom: 32, gap: 10 },
  title: { fontSize: 26, fontWeight: '800', color: '#2d2d2d', marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#2d2d2d', marginTop: 8, marginBottom: 10 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#2d2d2d', marginBottom: 12 },

  upRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    backgroundColor: '#f7f4ef',
    marginBottom: 8,
  },
  upRowFirst: { backgroundColor: '#f0ede6', borderWidth: 1, borderColor: '#e0dbd4' },
  upMonth: { fontSize: 13, fontWeight: '600', color: '#2d2d2d', textTransform: 'capitalize' },
  upDue: { fontSize: 12, color: '#aaa', marginTop: 2 },
  upAmount: { fontSize: 15, fontWeight: '700', color: '#2d2d2d' },
  upAdjust: { fontSize: 11, color: '#b45309', fontWeight: '600', marginTop: 1 },

  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
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

  empty: { textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: 20 },

  payTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  payPeriod: { fontSize: 15, fontWeight: '700', color: '#2d2d2d', textTransform: 'capitalize' },
  payMeta: { fontSize: 12, color: '#888', marginTop: 4 },
  payNote: { fontSize: 12, color: '#666', fontStyle: 'italic', marginTop: 2 },
  payAmount: { fontSize: 19, fontWeight: '800', color: '#6b5b45', marginTop: 6 },
  payButtons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  payBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0dbd4',
    backgroundColor: '#fff',
  },
  payBtnText: { fontSize: 12, fontWeight: '700', color: '#6b5b45' },
  payBtnMp: { backgroundColor: '#009ee3', borderColor: '#009ee3' },
  payBtnMpText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  waitHint: { fontSize: 11, color: '#aaa', marginTop: 8 },

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
    borderColor: '#e0dbd4',
    backgroundColor: '#fff',
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageBtnText: { fontSize: 13, color: '#6b5b45', fontWeight: '600' },
  pageInfo: { fontSize: 13, color: '#888' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 22 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#2d2d2d' },
  modalSub: { fontSize: 13, color: '#888', marginTop: 4 },
  modalLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 16, marginBottom: 6 },
  textarea: {
    borderWidth: 1,
    borderColor: '#e0dbd4',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#2d2d2d',
    minHeight: 70,
    textAlignVertical: 'top',
    backgroundColor: '#faf8f5',
  },
  transferData: { marginTop: 14 },
  transferRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ebe4',
  },
  transferLabel: { fontSize: 11, color: '#aaa' },
  transferValue: { fontSize: 14, fontWeight: '700', color: '#2d2d2d' },
  copyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#f0ede6',
  },
  copyBtnText: { fontSize: 12, fontWeight: '700', color: '#6b5b45' },
  contactRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  contactBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#f0ede6',
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
