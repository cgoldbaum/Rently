import { View, Text, StyleSheet, Modal, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

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

function fmtMoney(n: number, currency: 'ARS' | 'USD' = 'ARS') {
  const sep = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return currency === 'USD' ? `USD ${sep}` : `$ ${sep}`;
}

function fmtDate(d: string) {
  const x = new Date(d);
  return `${String(x.getDate()).padStart(2, '0')}/${String(x.getMonth() + 1).padStart(2, '0')}/${x.getFullYear()}`;
}

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
  const { data: receipt, isLoading, isError } = useQuery<Receipt>({
    queryKey: ['receipt', endpoint, paymentId],
    queryFn: () => api.get(`${endpoint}/${paymentId}/receipt`).then((r) => r.data.data),
    enabled: visible && !!paymentId,
  });

  const rows: [string, string][] = receipt
    ? [
        ['ID de operación', receipt.mp?.paymentId ?? receipt.receiptNumber.slice(0, 8).toUpperCase()],
        ...(receipt.property ? ([['Propiedad', receipt.property]] as [string, string][]) : []),
        ['Período', receipt.period],
        ['Monto', fmtMoney(receipt.amount, receipt.currency ?? defaultCurrency)],
        ['Método', receipt.method ?? 'Efectivo'],
        ['Fecha de pago', receipt.paidDate ? fmtDate(receipt.paidDate) : '—'],
        ...(receipt.mp?.status !== 'approved'
          ? ([['Estado MP', receipt.mp?.status ?? '—']] as [string, string][])
          : []),
        ...(receipt.mp?.statusDetail && receipt.mp.statusDetail !== 'accredited'
          ? ([['Detalle estado', receipt.mp.statusDetail]] as [string, string][])
          : []),
        ...(receipt.mp?.payerEmail
          ? ([['Pagado por', receipt.mp.payerEmail]] as [string, string][])
          : []),
        ...(receipt.mp?.dateApproved
          ? ([['Fecha de acreditación', fmtDate(receipt.mp.dateApproved)]] as [string, string][])
          : []),
      ]
    : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.header}>
            <Text style={styles.check}>✓</Text>
            <Text style={styles.title}>Comprobante de pago</Text>
          </View>
          <View style={styles.body}>
            {isLoading ? (
              <ActivityIndicator color="#6b5b45" />
            ) : isError ? (
              <Text style={styles.error}>No se pudo cargar el comprobante.</Text>
            ) : (
              rows.map(([k, v]) => (
                <View key={k} style={styles.row}>
                  <Text style={styles.key}>{k}</Text>
                  <Text style={styles.value}>{v}</Text>
                </View>
              ))
            )}
            <TouchableOpacity style={styles.close} onPress={onClose}>
              <Text style={styles.closeText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, overflow: 'hidden' },
  header: { backgroundColor: '#5f835f', padding: 18, alignItems: 'center' },
  check: { fontSize: 30, color: '#fff' },
  title: { fontSize: 17, fontWeight: '700', color: '#fff', marginTop: 2 },
  body: { padding: 18, backgroundColor: '#f9f7f3' },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e0d8',
  },
  key: { fontSize: 13, color: '#7b7468', fontWeight: '600' },
  value: { fontSize: 13, color: '#2f2b26', fontWeight: '700', flexShrink: 1, textAlign: 'right' },
  error: { fontSize: 14, color: '#dc2626', textAlign: 'center' },
  close: {
    marginTop: 16,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#e5ded3',
    alignItems: 'center',
  },
  closeText: { color: '#2f2b26', fontSize: 15, fontWeight: '700' },
});
