import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { Settings } from 'lucide-react-native';
import { useAuthStore } from '../../src/store/auth';
import { api } from '../../src/lib/api';
import { NotificationBell } from '../../src/components/NotificationBell';

type DashboardStats = {
  totalProperties: number;
  occupiedProperties: number;
  vacantProperties: number;
  expiringProperties: number;
  openClaims: number;
};

type Property = {
  id: string;
  name?: string;
  address: string;
  type: string;
  surface: number;
  status: string;
  openClaims: number;
  contract?: { currentAmount: number; currency?: 'ARS' | 'USD'; tenant?: { name: string } };
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OCCUPIED: { label: 'Ocupada', color: '#22c55e' },
  VACANT: { label: 'Vacante', color: '#6b7280' },
  EXPIRING: { label: 'Por vencer', color: '#f59e0b' },
  ARREARS: { label: 'En mora', color: '#ef4444' },
};

function formatMoney(amount: number, currency: 'ARS' | 'USD') {
  const sep = String(Math.round(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return currency === 'USD' ? `USD ${sep}` : `$ ${sep}`;
}

export default function OwnerDashboard() {
  const user = useAuthStore((s) => s.user);
  const [viewCurrency, setViewCurrency] = useState<'USD' | 'ARS'>('USD');

  const statsQuery = useQuery<DashboardStats>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then((r) => r.data.data),
  });

  const propsQuery = useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: () => api.get('/properties').then((r) => r.data.data),
  });

  const stats = statsQuery.data;
  const properties = propsQuery.data ?? [];
  const loading = statsQuery.isLoading || propsQuery.isLoading;
  const refreshing = statsQuery.isRefetching || propsQuery.isRefetching;

  const totalArs = properties.reduce(
    (s, p) => s + (p.contract?.currency === 'ARS' ? p.contract.currentAmount ?? 0 : 0),
    0
  );
  const totalUsd = properties.reduce(
    (s, p) =>
      s + (p.contract?.currency === 'USD' || !p.contract?.currency ? p.contract?.currentAmount ?? 0 : 0),
    0
  );

  const onRefresh = () => {
    statsQuery.refetch();
    propsQuery.refetch();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6b5b45" size="large" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.topRow}>
        <View style={styles.topRowText}>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push('/(owner)/settings')}
            accessibilityLabel="Configuración"
          >
            <Settings size={19} color="#6b5b45" />
          </TouchableOpacity>
          <Text style={styles.greeting} numberOfLines={1}>
            Hola, {user?.name}
          </Text>
        </View>
        <NotificationBell />
      </View>

      {/* Hero: ingreso mensual estimado */}
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroLabel}>Ingreso mensual estimado</Text>
          <View style={styles.currencyToggle}>
            <TouchableOpacity
              onPress={() => setViewCurrency('USD')}
              style={[styles.currencyBtn, viewCurrency === 'USD' && styles.currencyBtnActive]}
            >
              <Text
                style={[
                  styles.currencyBtnText,
                  viewCurrency === 'USD' && styles.currencyBtnTextActive,
                ]}
              >
                USD
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewCurrency('ARS')}
              style={[styles.currencyBtn, viewCurrency === 'ARS' && styles.currencyBtnActive]}
            >
              <Text
                style={[
                  styles.currencyBtnText,
                  viewCurrency === 'ARS' && styles.currencyBtnTextActive,
                ]}
              >
                ARS
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <Text style={styles.heroValue}>
          {viewCurrency === 'USD' ? formatMoney(totalUsd, 'USD') : formatMoney(totalArs, 'ARS')}
        </Text>
        <Text style={styles.heroSub}>
          {viewCurrency === 'USD'
            ? `${formatMoney(totalArs, 'ARS')} + en pesos`
            : `${formatMoney(totalUsd, 'USD')} + en dólares`}
        </Text>
      </View>

      {/* Stat cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {stats?.occupiedProperties ?? 0}
            <Text style={styles.statValueMuted}>/{stats?.totalProperties ?? 0}</Text>
          </Text>
          <Text style={styles.statLabel}>Propiedades</Text>
          <Text style={styles.statSub}>ocupadas ahora</Text>
        </View>
        <View style={styles.statCard}>
          <Text
            style={[styles.statValue, (stats?.vacantProperties ?? 0) > 0 && { color: '#ef4444' }]}
          >
            {stats?.vacantProperties ?? 0}
          </Text>
          <Text style={styles.statLabel}>Vacantes</Text>
          <Text style={styles.statSub}>
            {(stats?.vacantProperties ?? 0) > 0 ? 'sin inquilino' : 'todo ocupado'}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.openClaims ?? 0}</Text>
          <Text style={styles.statLabel}>Reclamos</Text>
          <Text style={styles.statSub}>abiertos</Text>
        </View>
      </View>

      {/* Resumen */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Resumen</Text>
        {[
          {
            text: 'Propiedades ocupadas',
            sub: `${stats?.occupiedProperties ?? 0} de ${stats?.totalProperties ?? 0}`,
            color: '#6b5b45',
          },
          {
            text: 'Contratos por vencer',
            sub: `${stats?.expiringProperties ?? 0} en los próximos 30 días`,
            color: '#a855f7',
          },
          {
            text: 'Reclamos abiertos',
            sub: `${stats?.openClaims ?? 0} requieren atención`,
            color: '#f59e0b',
          },
          {
            text: 'Propiedades vacantes',
            sub: `${stats?.vacantProperties ?? 0} sin inquilino`,
            color: '#3b82f6',
          },
        ].map((item, i) => (
          <View key={i} style={styles.summaryRow}>
            <View style={[styles.summaryDot, { backgroundColor: item.color }]} />
            <View style={styles.summaryTextWrap}>
              <Text style={styles.summaryText}>{item.text}</Text>
              <Text style={styles.summarySub}>{item.sub}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* Mis propiedades */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Mis propiedades</Text>
        <TouchableOpacity onPress={() => router.push('/(owner)/properties')}>
          <Text style={styles.sectionLink}>Ver todas →</Text>
        </TouchableOpacity>
      </View>

      {properties.length === 0 ? (
        <View style={styles.card}>
          <Text style={styles.emptyText}>No tenés propiedades aún</Text>
        </View>
      ) : (
        properties.slice(0, 3).map((p) => (
          <TouchableOpacity
            key={p.id}
            style={styles.propCard}
            onPress={() => router.push(`/(owner)/properties/${p.id}`)}
          >
            <View style={styles.propHeader}>
              <View style={styles.propHeaderText}>
                <Text style={styles.propName}>{p.name ?? p.address}</Text>
                {p.name ? <Text style={styles.propAddress}>{p.address}</Text> : null}
              </View>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: STATUS_LABELS[p.status]?.color ?? '#aaa' },
                ]}
              >
                <Text style={styles.badgeText}>
                  {STATUS_LABELS[p.status]?.label ?? p.status}
                </Text>
              </View>
            </View>
            <View style={styles.propMoneyRow}>
              <Text style={styles.propAmount}>
                {p.contract?.currentAmount
                  ? formatMoney(p.contract.currentAmount, p.contract.currency ?? 'USD')
                  : '—'}
              </Text>
              <Text style={styles.propTenant}>
                {p.contract?.tenant?.name ?? 'Sin inquilino'}
              </Text>
            </View>
            <View style={styles.propDetails}>
              <Text style={styles.propDetail}>{p.type}</Text>
              <Text style={styles.propDetail}>{p.surface} m²</Text>
              {p.openClaims > 0 ? (
                <Text style={[styles.propDetail, { color: '#f59e0b' }]}>
                  {p.openClaims} reclamo{p.openClaims !== 1 ? 's' : ''}
                </Text>
              ) : null}
            </View>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf8f5' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 32 },
  topRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  topRowText: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  greeting: { fontSize: 26, fontWeight: '800', color: '#2d2d2d', flexShrink: 1 },
  settingsBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f0ede6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  subtitle: { fontSize: 14, color: '#888' },

  heroCard: { backgroundColor: '#3a3226', borderRadius: 16, padding: 20, marginBottom: 12 },
  heroHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  heroLabel: { fontSize: 13, color: 'rgba(255,255,255,0.7)', fontWeight: '600' },
  currencyToggle: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 999, padding: 3 },
  currencyBtn: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  currencyBtnActive: { backgroundColor: '#fff' },
  currencyBtnText: { fontSize: 12, fontWeight: '700', color: 'rgba(255,255,255,0.8)' },
  currencyBtnTextActive: { color: '#2f2619' },
  heroValue: { fontSize: 34, fontWeight: '800', color: '#fff', marginTop: 4 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
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
  statValue: { fontSize: 24, fontWeight: '800', color: '#2d2d2d' },
  statValueMuted: { fontSize: 14, fontWeight: '500', color: '#aaa' },
  statLabel: { fontSize: 13, fontWeight: '600', color: '#555', marginTop: 4 },
  statSub: { fontSize: 11, color: '#aaa', marginTop: 1 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 14 },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, marginBottom: 12 },
  summaryDot: { width: 8, height: 8, borderRadius: 4, marginTop: 5 },
  summaryTextWrap: { flex: 1 },
  summaryText: { fontSize: 13, fontWeight: '600', color: '#2d2d2d' },
  summarySub: { fontSize: 11, color: '#aaa', marginTop: 2 },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: '#2d2d2d' },
  sectionLink: { fontSize: 13, color: '#e2712b', fontWeight: '600' },

  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 14, paddingVertical: 12 },

  propCard: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  propHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  propHeaderText: { flex: 1, marginRight: 8 },
  propName: { fontSize: 16, fontWeight: '700', color: '#2d2d2d' },
  propAddress: { fontSize: 12, color: '#888', marginTop: 2 },
  propMoneyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 12,
  },
  propAmount: { fontSize: 20, fontWeight: '800', color: '#2d2d2d' },
  propTenant: { fontSize: 12, color: '#888', fontWeight: '600' },
  propDetails: { flexDirection: 'row', gap: 14, marginTop: 10 },
  propDetail: { fontSize: 12, color: '#888' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
