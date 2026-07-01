import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/auth';
import { useTranslation } from 'react-i18next';
import { api } from '../../src/lib/api';
import { formatMoney } from '@rently/shared';
import { NotificationBell } from '../../src/components/NotificationBell';
import { SkeletonScreen } from '../../src/components/ui/Skeleton';
import { EmptyState } from '../../src/components/ui/EmptyState';
import { PressableScale } from '../../src/components/ui/PressableScale';
import { useCountUp } from '../../src/components/ui/useCountUp';

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
  contract?: { currentAmount: number; currency?: 'ARS' | 'USD'; tenants?: { name: string }[] };
};

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  OCCUPIED: { label: 'Ocupada',    color: '#16a34a', bg: '#dcfce7' },
  VACANT:   { label: 'Vacante',    color: '#4a7a9b', bg: '#dbeafe' },
  EXPIRING: { label: 'Por vencer', color: '#7c3aed', bg: '#f5f3ff' },
  ARREARS:  { label: 'En mora',    color: '#dc2626', bg: '#fee2e2' },
};

export default function OwnerDashboard() {
  const { t } = useTranslation('dashboard');
  const insets = useSafeAreaInsets();
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

  // Contadores animados (suben desde 0 al cargar los datos).
  const occupiedCount = useCountUp(stats?.occupiedProperties ?? 0);
  const vacantCount = useCountUp(stats?.vacantProperties ?? 0);
  const claimsCount = useCountUp(stats?.openClaims ?? 0);

  const onRefresh = () => {
    statsQuery.refetch();
    propsQuery.refetch();
  };

  if (loading) {
    return <SkeletonScreen count={5} />;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top }]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6b5b45" colors={['#6b5b45']} />
      }
    >
      <View style={styles.topRow}>
        <View style={styles.topRowText}>
          <TouchableOpacity
            style={styles.settingsBtn}
            onPress={() => router.push('/(owner)/settings')}
            accessibilityLabel={t('nav.settings')}
          >
            <Ionicons name="settings-outline" size={19} color="#6b5b45" />
          </TouchableOpacity>
          <Text style={styles.greeting} numberOfLines={1}>
            {t('greeting', { name: user?.name })}
          </Text>
        </View>
        <View style={styles.topRowActions}>
          <TouchableOpacity
            style={styles.aiBtn}
            onPress={() => router.push('/(owner)/ai-chat')}
            accessibilityLabel={t('nav.aiChat')}
          >
            <Text style={styles.aiBtnText}>IA</Text>
          </TouchableOpacity>
          <NotificationBell />
        </View>
      </View>

      {/* Hero: ingreso mensual estimado */}
      <Animated.View entering={FadeInDown.duration(350)} style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <Text style={styles.heroLabel}>{t('stats.monthlyIncome')}</Text>
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
      </Animated.View>

      {/* Stat cards */}
      <Animated.View entering={FadeInDown.duration(350).delay(60)} style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>
            {occupiedCount}
            <Text style={styles.statValueMuted}>/{stats?.totalProperties ?? 0}</Text>
          </Text>
          <Text style={styles.statLabel}>{t('stats.properties')}</Text>
          <Text style={styles.statSub}>{t('stats.occupied')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text
            style={[styles.statValue, (stats?.vacantProperties ?? 0) > 0 && { color: '#ef4444' }]}
          >
            {vacantCount}
          </Text>
          <Text style={styles.statLabel}>{t('stats.vacant')}</Text>
          <Text style={styles.statSub}>
            {(stats?.vacantProperties ?? 0) > 0 ? t('stats.vacantCount') : t('stats.allOccupied')}
          </Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{claimsCount}</Text>
          <Text style={styles.statLabel}>{t('stats.claims')}</Text>
          <Text style={styles.statSub}>{t('stats.claimsAttention')}</Text>
        </View>
      </Animated.View>

      {/* Resumen */}
      <Animated.View entering={FadeInDown.duration(350).delay(120)} style={styles.card}>
        <Text style={styles.cardTitle}>{t('summary.title')}</Text>
        {[
          {
            text: t('summary.occupiedProperties'),
            sub: t('summary.occupiedCount', { count: stats?.occupiedProperties ?? 0, total: stats?.totalProperties ?? 0 }),
            color: '#6b5b45',
          },
          {
            text: t('summary.expiringContracts'),
            sub: t('summary.expiringCount', { count: stats?.expiringProperties ?? 0 }),
            color: '#a855f7',
          },
          {
            text: t('summary.openClaims'),
            sub: t('summary.openClaimsCount', { count: stats?.openClaims ?? 0 }),
            color: '#f59e0b',
          },
          {
            text: t('summary.vacantProperties'),
            sub: t('summary.vacantCount', { count: stats?.vacantProperties ?? 0 }),
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
      </Animated.View>

      {/* Mis propiedades */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{t('quickView.myProperties')}</Text>
        <TouchableOpacity onPress={() => router.push('/(owner)/properties')}>
          <Text style={styles.sectionLink}>{t('quickView.viewAll')}</Text>
        </TouchableOpacity>
      </View>

      {properties.length === 0 ? (
        <View style={styles.card}>
          <EmptyState emoji="🏘️" title={t('quickView.noProperties')} description="Cargá tu primera propiedad para empezar a gestionar tus alquileres." />
        </View>
      ) : (
        properties.slice(0, 3).map((p, i) => (
          <PressableScale
            key={p.id}
            entering={FadeInDown.duration(300).delay(180 + i * 60)}
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
                  { backgroundColor: STATUS_LABELS[p.status]?.bg ?? '#f3f4f6' },
                ]}
              >
                <Text style={[styles.badgeText, { color: STATUS_LABELS[p.status]?.color ?? '#6b7280' }]}>
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
                {p.contract?.tenants?.map((tt) => tt.name).join(', ') || t('quickView.noTenant')}
              </Text>
            </View>
            <View style={styles.propDetails}>
              <Text style={styles.propDetail}>{p.type}</Text>
              <Text style={styles.propDetail}>{p.surface} m²</Text>
              {p.openClaims > 0 ? (
                <Text style={[styles.propDetail, { color: '#f59e0b' }]}>
                  {p.openClaims} {t('stats.claims').toLowerCase()}
                </Text>
              ) : null}
            </View>
          </PressableScale>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#faf8f5' },
  content: { padding: 20, paddingBottom: 32 },
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
  topRowActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  aiBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#6b5b45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
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
  badgeText: { fontSize: 11, fontWeight: '700' },
});
