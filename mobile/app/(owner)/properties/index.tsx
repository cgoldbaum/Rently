import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '../../../src/lib/api';

type Property = {
  id: string;
  name: string;
  address: string;
  status: string;
  type?: string;
  surface?: number;
  openClaims?: number;
  contract?: {
    currentAmount: number;
    currency?: 'ARS' | 'USD';
    endDate: string;
    tenant?: { name: string };
  };
};

const STATUS_COLORS: Record<string, string> = {
  OCCUPIED: '#22c55e',
  VACANT: '#6b7280',
  EXPIRING: '#f59e0b',
  ARREARS: '#ef4444',
};

const STATUS_LABELS: Record<string, string> = {
  OCCUPIED: 'Ocupada',
  VACANT: 'Vacante',
  EXPIRING: 'Por vencer',
  ARREARS: 'En mora',
};

const FILTERS: [string, string][] = [
  ['all', 'Todas'],
  ['OCCUPIED', 'Ocupadas'],
  ['VACANT', 'Vacantes'],
  ['ARREARS', 'En mora'],
  ['EXPIRING', 'Por vencer'],
];

function fmtMoney(n: number, currency: 'ARS' | 'USD' = 'ARS') {
  const sep = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return currency === 'USD' ? `USD ${sep}` : `$ ${sep}`;
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export default function PropertiesScreen() {
  const [filter, setFilter] = useState('all');
  const { data, isLoading } = useQuery<Property[]>({
    queryKey: ['properties', filter],
    queryFn: () =>
      api.get('/properties', { params: filter !== 'all' ? { status: filter } : {} })
        .then((r) => r.data.data),
  });

  const filtered = filter === 'all' ? data : data;

  const header = (
    <View style={styles.header}>
      <Text style={styles.title}>Propiedades</Text>
      <View style={styles.filterRow}>
        {FILTERS.map(([key, label]) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, filter === key && styles.chipActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>
              {label}
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
        keyExtractor={(item) => item.id}
        ListHeaderComponent={header}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLoading ? (
            <ActivityIndicator color="#6b5b45" size="large" />
          ) : (
            <Text style={styles.empty}>No hay propiedades</Text>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/(owner)/properties/${item.id}`)}
          >
            <View style={styles.cardHeader}>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName} numberOfLines={1}>
                  {item.name || item.address}
                </Text>
                <Text style={styles.cardAddress} numberOfLines={1}>
                  {item.address}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] ?? '#aaa' }]}>
                <Text style={styles.badgeText}>
                  {STATUS_LABELS[item.status] || item.status}
                </Text>
              </View>
            </View>

            {item.contract && (
              <View style={styles.contractInfo}>
                <Text style={styles.tenant}>
                  {item.contract.tenant?.name || 'Sin inquilino'}
                </Text>
                <View style={styles.contractDetails}>
                  <Text style={styles.amount}>
                    {fmtMoney(item.contract.currentAmount, item.contract.currency ?? 'ARS')}
                  </Text>
                  <Text style={styles.due}>
                    Vto. {fmtDate(item.contract.endDate)}
                  </Text>
                </View>
              </View>
            )}

            {item.openClaims ? (
              <View style={styles.claimsRow}>
                <Text style={styles.claimsText}>
                  ⚠ {item.openClaims} reclamo{item.openClaims !== 1 ? 's' : ''} abierto{item.openClaims !== 1 ? 's' : ''}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  header: { paddingTop: 60, paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#2d2d2d', marginBottom: 16 },

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

  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 20 },
  empty: { textAlign: 'center', color: '#aaa', marginTop: 40 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#2d2d2d' },
  cardAddress: { fontSize: 13, color: '#888', marginTop: 2 },

  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },

  contractInfo: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0ede6' },
  tenant: { fontSize: 13, color: '#666', fontWeight: '600', marginBottom: 6 },
  contractDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  amount: { fontSize: 16, fontWeight: '800', color: '#6b5b45' },
  due: { fontSize: 12, color: '#aaa' },

  claimsRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0ede6' },
  claimsText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
});

