import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';

type TenantPayment = {
  id: string;
  period: string;
  amount: number;
  currency: string;
  dueDate: string;
  status: string;
};

const STATUS_COLORS: Record<string, string> = {
  PAID: '#22c55e',
  PENDING: '#f59e0b',
  OVERDUE: '#ef4444',
};

export default function TenantPaymentsScreen() {
  const { data, isLoading } = useQuery<TenantPayment[]>({
    queryKey: ['tenant-payments'],
    queryFn: () => api.get('/tenant/payments').then((r) => r.data.data),
  });

  const handleMercadoPago = async (paymentId: string) => {
    try {
      const { data: res } = await api.post(`/tenant/payments/${paymentId}/mercadopago`);
      if (res.data?.initPoint) {
        await Linking.openURL(res.data.initPoint);
      }
    } catch {
      Alert.alert('Error', 'No se pudo iniciar el pago con MercadoPago.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mis Pagos</Text>
      {isLoading ? (
        <Text style={styles.loading}>Cargando...</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.period}>{item.period}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] ?? '#aaa' }]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.amount}>
                {item.currency} {item.amount.toLocaleString('es-AR')}
              </Text>
              <Text style={styles.due}>Vence: {item.dueDate}</Text>
              {item.status === 'PENDING' && (
                <TouchableOpacity
                  style={styles.payButton}
                  onPress={() => handleMercadoPago(item.id)}
                >
                  <Text style={styles.payButtonText}>Pagar con MercadoPago</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5', paddingTop: 60 },
  title: { fontSize: 26, fontWeight: '800', color: '#2d2d2d', paddingHorizontal: 20, marginBottom: 16 },
  loading: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  period: { fontSize: 15, fontWeight: '700', color: '#2d2d2d' },
  amount: { fontSize: 22, fontWeight: '800', color: '#6b5b45', marginTop: 8 },
  due: { fontSize: 13, color: '#888', marginTop: 4 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  payButton: {
    backgroundColor: '#009ee3',
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  payButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
});
