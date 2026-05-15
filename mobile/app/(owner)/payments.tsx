import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';

type Payment = {
  id: string;
  period: string;
  amount: number;
  currency: string;
  status: string;
  propertyName: string;
};

const STATUS_COLORS: Record<string, string> = {
  PAID: '#22c55e',
  PENDING: '#f59e0b',
  OVERDUE: '#ef4444',
};

export default function PaymentsScreen() {
  const { data, isLoading } = useQuery<Payment[]>({
    queryKey: ['payments'],
    queryFn: () => api.get('/payments').then((r) => r.data.data),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pagos</Text>
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
              <Text style={styles.property}>{item.propertyName}</Text>
              <Text style={styles.amount}>
                {item.currency} {item.amount.toLocaleString('es-AR')}
              </Text>
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
  property: { fontSize: 13, color: '#888', marginTop: 4 },
  amount: { fontSize: 18, fontWeight: '800', color: '#6b5b45', marginTop: 8 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
