import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../src/store/auth';
import { api } from '../../src/lib/api';

export default function OwnerDashboard() {
  const user = useAuthStore((s) => s.user);
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data.data),
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.greeting}>Hola, {user?.name}</Text>
      <Text style={styles.subtitle}>Panel del propietario</Text>

      {isLoading ? (
        <Text style={styles.loading}>Cargando...</Text>
      ) : (
        <View style={styles.grid}>
          <StatCard label="Propiedades" value={data?.totalProperties ?? 0} />
          <StatCard label="Ocupadas" value={data?.occupiedProperties ?? 0} />
          <StatCard label="Vacantes" value={data?.vacantProperties ?? 0} />
          <StatCard label="Reclamos" value={data?.pendingClaims ?? 0} />
        </View>
      )}
    </ScrollView>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardValue}>{value}</Text>
      <Text style={styles.cardLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  content: { padding: 20, paddingTop: 60 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#2d2d2d' },
  subtitle: { fontSize: 14, color: '#888', marginBottom: 24 },
  loading: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 20,
    width: '47%',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardValue: { fontSize: 30, fontWeight: '800', color: '#6b5b45' },
  cardLabel: { fontSize: 13, color: '#888', marginTop: 4 },
});
