import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/auth';
import { api } from '../../src/lib/api';

export default function TenantDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['tenant-dashboard'],
    queryFn: () => api.get('/tenant/payments/upcoming').then((r) => r.data.data),
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hola, {user?.name}</Text>
      <Text style={styles.subtitle}>Panel del inquilino</Text>

      <Text style={styles.sectionTitle}>Próximos pagos</Text>
      {isLoading ? (
        <Text style={styles.loading}>Cargando...</Text>
      ) : !data?.length ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Sin pagos próximos</Text>
        </View>
      ) : (
        data.map((payment: { id: string; period: string; amount: number; currency: string; dueDate: string }) => (
          <View key={payment.id} style={styles.paymentCard}>
            <Text style={styles.paymentPeriod}>{payment.period}</Text>
            <Text style={styles.paymentAmount}>
              {payment.currency} {payment.amount.toLocaleString('es-AR')}
            </Text>
            <Text style={styles.paymentDue}>Vence: {payment.dueDate}</Text>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  content: { padding: 20, paddingTop: 60 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#2d2d2d' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#2d2d2d', marginBottom: 12 },
  loading: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 14, padding: 20, alignItems: 'center' },
  emptyText: { color: '#aaa', fontSize: 14 },
  paymentCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  paymentPeriod: { fontSize: 15, fontWeight: '700', color: '#2d2d2d' },
  paymentAmount: { fontSize: 22, fontWeight: '800', color: '#6b5b45', marginTop: 4 },
  paymentDue: { fontSize: 13, color: '#888', marginTop: 4 },
});
