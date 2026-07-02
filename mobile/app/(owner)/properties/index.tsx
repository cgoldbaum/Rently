import { useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Alert, Linking } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { router } from 'expo-router';
import { formatMoney, formatDate } from '@rently/shared';
import type { SubscriptionSummary } from '@rently/shared';
import { api } from '../../../src/lib/api';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PropertyFormModal } from '../../../src/components/PropertyFormModal';
import { SkeletonCard } from '../../../src/components/ui/Skeleton';
import { EmptyState } from '../../../src/components/ui/EmptyState';
import { PressableScale } from '../../../src/components/ui/PressableScale';

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
    tenants?: { name: string }[];
  };
  parentProperty?: { id: string; name?: string | null; address: string } | null;
};

const STATUS_STYLE: Record<string, { color: string; bg: string }> = {
  OCCUPIED:      { color: '#16a34a', bg: '#dcfce7' },
  VACANT:        { color: '#4a7a9b', bg: '#dbeafe' },
  EXPIRING_SOON: { color: '#7c3aed', bg: '#f5f3ff' },
  IN_ARREARS:    { color: '#dc2626', bg: '#fee2e2' },
};

// key de filtro (valor de status API o 'all') -> subclave en properties.filters
const FILTERS: [string, string][] = [
  ['all', 'all'],
  ['OCCUPIED', 'occupied'],
  ['VACANT', 'vacant'],
  ['IN_ARREARS', 'inArrears'],
  ['EXPIRING_SOON', 'expiringSoon'],
];

export default function PropertiesScreen() {
  const { t } = useTranslation('properties');
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const { data, isLoading } = useQuery<Property[]>({
    queryKey: ['properties', filter],
    queryFn: () =>
      api.get('/properties', { params: filter !== 'all' ? { status: filter } : {} })
        .then((r) => r.data.data),
  });

  const { data: subscription } = useQuery<SubscriptionSummary>({
    queryKey: ['owner-subscription-summary'],
    queryFn: () => api.get('/owner/subscription').then((r) => r.data.data),
    staleTime: 30000,
  });

  async function openSubscriptionCheckout(planCode: 'STARTER' | 'PRO' | 'AGENCY') {
    try {
      const { data: res } = await api.post('/owner/subscription/checkout', { planCode });
      const initPoint = res.data?.initPoint;
      if (initPoint) {
        await Linking.openURL(initPoint);
        return;
      }
      Alert.alert(t('common:error'), t('checkout.noPayLink'));
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })?.response?.data?.error?.message;
      Alert.alert(t('common:error'), msg ?? t('checkout.checkoutFailed'));
    }
  }

  function handleNewProperty() {
    if (subscription && !subscription.usage.canCreateProperty) {
      const reason = subscription.usage.blockingReason;
      if (reason === 'PROPERTY_LIMIT_REACHED') {
        Alert.alert(
          t('limits.limitReachedTitle'),
          t('limits.limitReachedMsg', { count: subscription.usage.properties }),
          [
            { text: t('limits.cancel'), style: 'cancel' },
            { text: t('limits.changePlan'), onPress: () => openSubscriptionCheckout('PRO') },
          ],
        );
      } else {
        Alert.alert(
          t('limits.subRequiredTitle'),
          subscription.usage.blockingReason === 'SUBSCRIPTION_PENDING'
            ? t('limits.subPending')
            : t('limits.needPlan'),
          [
            { text: t('limits.cancel'), style: 'cancel' },
            {
              text: t('limits.viewPlans'),
              onPress: () => {
                Alert.alert(t('limits.choosePlan'), '', [
                  { text: t('limits.cancel'), style: 'cancel' },
                  { text: t('limits.planPro'), onPress: () => openSubscriptionCheckout('PRO') },
                  { text: t('limits.planAgency'), onPress: () => openSubscriptionCheckout('AGENCY') },
                ]);
              },
            },
          ],
        );
      }
      return;
    }
    setShowCreate(true);
  }

  const filtered = filter === 'all' ? data : data?.filter((p) => p.status === filter);

  const header = (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{t('page.title')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={handleNewProperty}>
          <Text style={styles.addBtnText}>{t('page.addShort')}</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.filterRow}>
        {FILTERS.map(([key, labelKey]) => (
          <TouchableOpacity
            key={key}
            style={[styles.chip, filter === key && styles.chipActive]}
            onPress={() => setFilter(key)}
          >
            <Text style={[styles.chipText, filter === key && styles.chipTextActive]}>
              {t(`filters.${labelKey}`)}
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
            <View style={styles.skeletonWrap}>
              {Array.from({ length: 4 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </View>
          ) : (
            <EmptyState
              emoji="🏘️"
              title={filter === 'all' ? t('list.emptyAllTitle') : t('list.emptyFilterTitle')}
              description={filter === 'all' ? t('list.emptyAllDesc') : t('list.emptyFilterDesc')}
            />
          )
        }
        renderItem={({ item, index }) => (
          <PressableScale
            entering={FadeInDown.duration(280).delay(Math.min(index, 6) * 40)}
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
                {item.parentProperty && (
                  <Text style={styles.cardAddress} numberOfLines={1}>
                    {t('card.unitOf', { address: item.parentProperty.name ?? item.parentProperty.address })}
                  </Text>
                )}
              </View>
              <View style={[styles.badge, { backgroundColor: (STATUS_STYLE[item.status] ?? { bg: '#f3f4f6' }).bg }]}>
                <Text style={[styles.badgeText, { color: (STATUS_STYLE[item.status] ?? { color: '#6b7280' }).color }]}>
                  {t(`domain:propertyStatus.${item.status}`, item.status)}
                </Text>
              </View>
            </View>

            {item.contract && (
              <View style={styles.contractInfo}>
                <Text style={styles.tenant}>
                  {item.contract.tenants?.map((tn) => tn.name).join(', ') || t('card.noTenantShort')}
                </Text>
                <View style={styles.contractDetails}>
                  <Text style={styles.amount}>
                    {formatMoney(item.contract.currentAmount, item.contract.currency ?? 'ARS')}
                  </Text>
                  <Text style={styles.due}>
                    {t('card.dueShort', { date: formatDate(item.contract.endDate) })}
                  </Text>
                </View>
              </View>
            )}

            {item.openClaims ? (
              <View style={styles.claimsRow}>
                <Text style={styles.claimsText}>
                  {t('card.openClaimsOpen', { count: item.openClaims })}
                </Text>
              </View>
            ) : null}
          </PressableScale>
        )}
      />

      <PropertyFormModal
        visible={showCreate}
        property={null}
        onClose={() => setShowCreate(false)}
        onSaved={() => qc.invalidateQueries({ queryKey: ['properties'] })}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  header: { paddingHorizontal: 20, marginBottom: 16 },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#2d2d2d' },
  addBtn: {
    backgroundColor: '#6b5b45',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

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
  skeletonWrap: { gap: 12 },
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
  badgeText: { fontSize: 11, fontWeight: '700' },

  contractInfo: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#f0ede6' },
  tenant: { fontSize: 13, color: '#666', fontWeight: '600', marginBottom: 6 },
  contractDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  amount: { fontSize: 16, fontWeight: '800', color: '#6b5b45' },
  due: { fontSize: 12, color: '#aaa' },

  claimsRow: { marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f0ede6' },
  claimsText: { fontSize: 12, color: '#dc2626', fontWeight: '600' },
});

