import { View, Text, FlatList, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../src/lib/api';

type Claim = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  propertyName: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  IN_PROGRESS: '#3b82f6',
  RESOLVED: '#22c55e',
};

const PRIORITY_COLORS: Record<string, string> = {
  HIGH: '#ef4444',
  MEDIUM: '#f59e0b',
  LOW: '#6b7280',
};

export default function ClaimsScreen() {
  const { data, isLoading } = useQuery<Claim[]>({
    queryKey: ['claims'],
    queryFn: () => api.get('/claims').then((r) => r.data.data),
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reclamos</Text>
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
                <Text style={styles.claimTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] ?? '#aaa' }]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.property}>{item.propertyName}</Text>
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
              <View style={[styles.priorityTag, { backgroundColor: PRIORITY_COLORS[item.priority] ?? '#aaa' }]}>
                <Text style={styles.badgeText}>{item.priority}</Text>
              </View>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  claimTitle: { fontSize: 15, fontWeight: '700', color: '#2d2d2d', flex: 1 },
  property: { fontSize: 13, color: '#888', marginTop: 4 },
  description: { fontSize: 13, color: '#555', marginTop: 8, lineHeight: 18 },
  priorityTag: { alignSelf: 'flex-start', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 10 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
