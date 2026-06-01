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

type UpcomingPayment = {
  id: string;
  month: string;
  dueDate: string;
  amount: number;
  status: string;
  hasAdjustment: boolean;
  adjustmentPct: number | null;
};

type Claim = { id: string; status: string };

type Contract = {
  endDate: string;
  monthlyAmount: number;
  progress: number;
} | null;

function fmtCurrency(n: number) {
  const sep = String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `$ ${sep}`;
}

function fmtDate(d: string | Date) {
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${date.getFullYear()}`;
}

function daysUntil(d: string | Date) {
  return Math.ceil((new Date(d).getTime() - Date.now()) / 86400000);
}

export default function TenantDashboard() {
  const user = useAuthStore((s) => s.user);

  const upcomingQuery = useQuery<UpcomingPayment[]>({
    queryKey: ['tenant-upcoming'],
    queryFn: () => api.get('/tenant/payments/upcoming').then((r) => r.data.data),
  });

  const claimsQuery = useQuery<Claim[]>({
    queryKey: ['tenant-claims'],
    queryFn: () => api.get('/tenant/claims').then((r) => r.data.data),
  });

  const contractQuery = useQuery<Contract>({
    queryKey: ['tenant-contract'],
    queryFn: () => api.get('/tenant/contract').then((r) => r.data.data).catch(() => null),
  });

  const upcoming = upcomingQuery.data ?? [];
  const claims = claimsQuery.data ?? [];
  const contract = contractQuery.data ?? null;
  const loading =
    upcomingQuery.isLoading || claimsQuery.isLoading || contractQuery.isLoading;
  const refreshing =
    upcomingQuery.isRefetching || claimsQuery.isRefetching || contractQuery.isRefetching;

  const next = upcoming.find((p) => p.status !== 'PAID') ?? upcoming[0];
  const daysLeft = next ? daysUntil(next.dueDate) : null;
  const openClaims = claims.filter((c) => c.status !== 'RESOLVED').length;
  const canPayNext = next && (next.status === 'PENDING' || next.status === 'LATE');

  const onRefresh = () => {
    upcomingQuery.refetch();
    claimsQuery.refetch();
    contractQuery.refetch();
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#6b5b45" size="large" />
      </View>
    );
  }

  // Cuenta sin propiedad vinculada
  if (!upcomingQuery.isError && upcoming.length === 0 && !contract) {
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
              onPress={() => router.push('/(tenant)/settings')}
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
        <View style={styles.emptyCard}>
          <Text style={styles.emptyEmoji}>🏠</Text>
          <Text style={styles.emptyTitle}>Cuenta sin propiedad vinculada</Text>
          <Text style={styles.emptyDesc}>
            Tu cuenta aún no está vinculada a ninguna propiedad. Pedile a tu propietario que te
            cargue en el sistema con tu email:{' '}
            <Text style={styles.emptyEmail}>{user?.email}</Text>.
          </Text>
        </View>
      </ScrollView>
    );
  }

  const dangerLevel =
    daysLeft !== null && daysLeft < 0 ? 'danger' : daysLeft !== null && daysLeft <= 5 ? 'warning' : 'normal';

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
            onPress={() => router.push('/(tenant)/settings')}
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

      {/* Próximo pago */}
      {next ? (
        <View
          style={[
            styles.nextCard,
            dangerLevel === 'danger' && styles.nextCardDanger,
            dangerLevel === 'warning' && styles.nextCardWarning,
          ]}
        >
          <Text style={styles.nextLabel}>PRÓXIMO PAGO</Text>
          <View style={styles.nextAmountRow}>
            <Text
              style={[styles.nextAmount, dangerLevel === 'danger' && { color: '#ef4444' }]}
            >
              {fmtCurrency(next.amount)}
            </Text>
            {next.hasAdjustment ? (
              <View style={styles.adjustBadge}>
                <Text style={styles.adjustBadgeText}>Ajuste +{next.adjustmentPct}%</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.nextDue}>
            {daysLeft === null
              ? '—'
              : daysLeft < 0
                ? `Venció el ${fmtDate(next.dueDate)} (hace ${Math.abs(daysLeft)} días)`
                : daysLeft === 0
                  ? `Vence hoy · ${fmtDate(next.dueDate)}`
                  : `Vence el ${fmtDate(next.dueDate)} · en ${daysLeft} día${daysLeft !== 1 ? 's' : ''}`}
          </Text>
          <View style={styles.nextButtons}>
            {canPayNext ? (
              <TouchableOpacity
                style={styles.payButton}
                onPress={() => router.push('/(tenant)/payments')}
              >
                <Text style={styles.payButtonText}>Pagar ahora</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => router.push('/(tenant)/payments')}
            >
              <Text style={styles.secondaryButtonText}>Ver pagos</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {/* Quick stats */}
      <View style={styles.quickRow}>
        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => router.push('/(tenant)/contract')}
        >
          <Text style={styles.quickLabel}>CONTRATO VENCE</Text>
          <Text style={styles.quickValue}>{contract ? fmtDate(contract.endDate) : '—'}</Text>
          {contract ? (
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${contract.progress}%` }]} />
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.quickCard}
          onPress={() => router.push('/(tenant)/claims')}
        >
          <Text style={styles.quickLabel}>RECLAMOS ACTIVOS</Text>
          <Text style={[styles.quickValue, openClaims > 0 && { color: '#f59e0b' }]}>
            {openClaims} pendiente{openClaims !== 1 ? 's' : ''}
          </Text>
          <Text style={styles.quickLink}>Ver todos →</Text>
        </TouchableOpacity>
      </View>

      {/* Widget de próximos vencimientos */}
      {upcoming.length > 0 ? (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Próximos vencimientos</Text>
            <TouchableOpacity onPress={() => router.push('/(tenant)/payments')}>
              <Text style={styles.sectionLink}>Ver todo →</Text>
            </TouchableOpacity>
          </View>

          {/* Barra de timeline */}
          <View style={styles.timeline}>
            {upcoming.slice(0, 4).map((p, i) => {
              const days = daysUntil(p.dueDate);
              const isOverdue = days < 0;
              const isUrgent = days >= 0 && days <= 5;
              const isPaid = p.status === 'PAID';
              const dotColor = isPaid ? '#16a34a' : isOverdue ? '#dc2626' : isUrgent ? '#f59e0b' : '#6b5b45';
              return (
                <View key={p.id} style={styles.timelineItem}>
                  <View style={styles.timelineLeft}>
                    <View style={[styles.timelineDot, { backgroundColor: dotColor }, isPaid && styles.timelineDotPaid]} />
                    {i < upcoming.slice(0, 4).length - 1 && <View style={styles.timelineLine} />}
                  </View>
                  <TouchableOpacity
                    style={[styles.timelineCard, isOverdue && styles.timelineCardDanger, isUrgent && styles.timelineCardWarning, isPaid && styles.timelineCardPaid]}
                    onPress={() => router.push('/(tenant)/payments')}
                    activeOpacity={0.8}
                  >
                    <View style={styles.timelineRow}>
                      <Text style={[styles.timelineMonth, isPaid && { color: '#16a34a' }]} numberOfLines={1}>
                        {p.month.charAt(0).toUpperCase() + p.month.slice(1)}
                      </Text>
                      <Text style={[styles.timelineAmount, isOverdue && { color: '#dc2626' }]}>
                        {fmtCurrency(p.amount)}
                      </Text>
                    </View>
                    <View style={styles.timelineRow}>
                      <Text style={styles.timelineDueText}>
                        {isPaid ? '✓ Pagado' : isOverdue ? `Vencido hace ${Math.abs(days)}d` : days === 0 ? 'Vence hoy' : `${fmtDate(p.dueDate)} · ${days}d`}
                      </Text>
                      {p.hasAdjustment ? (
                        <Text style={styles.timelineAdjust}>+{p.adjustmentPct}%</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {upcoming.length > 4 && (
            <TouchableOpacity onPress={() => router.push('/(tenant)/payments')} style={styles.seeMoreBtn}>
              <Text style={styles.seeMoreText}>Ver {upcoming.length - 4} más →</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : null}
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

  emptyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#2d2d2d', marginBottom: 8, textAlign: 'center' },
  emptyDesc: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 21 },
  emptyEmail: { fontWeight: '700', color: '#2d2d2d' },

  nextCard: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0dbd4',
    borderRadius: 16,
    padding: 22,
    marginBottom: 12,
  },
  nextCardDanger: { backgroundColor: '#fee2e2', borderColor: '#ef4444' },
  nextCardWarning: { backgroundColor: '#fef3c7', borderColor: '#f59e0b' },
  nextLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  nextAmountRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  nextAmount: { fontSize: 34, fontWeight: '800', color: '#2d2d2d' },
  adjustBadge: { backgroundColor: '#fef3c7', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  adjustBadgeText: { fontSize: 12, fontWeight: '600', color: '#b45309' },
  nextDue: { fontSize: 14, color: '#666', marginTop: 6, marginBottom: 18 },
  nextButtons: { flexDirection: 'row', gap: 10 },
  payButton: {
    backgroundColor: '#6b5b45',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  payButtonText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0dbd4',
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  secondaryButtonText: { color: '#6b5b45', fontSize: 14, fontWeight: '700' },

  quickRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  quickCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickLabel: { fontSize: 10, color: '#aaa', fontWeight: '600', letterSpacing: 0.5, marginBottom: 6 },
  quickValue: { fontSize: 16, fontWeight: '700', color: '#2d2d2d' },
  quickLink: { fontSize: 12, color: '#aaa', marginTop: 4 },
  progressTrack: {
    marginTop: 8,
    height: 4,
    backgroundColor: '#f0ebe4',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#6b5b45', borderRadius: 4 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: '#2d2d2d' },
  sectionLink: { fontSize: 12, color: '#e2712b', fontWeight: '600' },
  // Timeline widget styles
  timeline: { gap: 0 },
  timelineItem: { flexDirection: 'row', gap: 10 },
  timelineLeft: { alignItems: 'center', width: 14 },
  timelineDot: { width: 12, height: 12, borderRadius: 6, marginTop: 12 },
  timelineDotPaid: { borderWidth: 2, borderColor: '#16a34a', backgroundColor: '#dcfce7' },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#e0dbd4', marginTop: 2, marginBottom: 2 },
  timelineCard: {
    flex: 1,
    padding: 12,
    backgroundColor: '#f7f4ef',
    borderRadius: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  timelineCardDanger: { backgroundColor: '#fee2e2', borderColor: '#fca5a5' },
  timelineCardWarning: { backgroundColor: '#fef3c7', borderColor: '#fcd34d' },
  timelineCardPaid: { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' },
  timelineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  timelineMonth: { fontSize: 13, fontWeight: '700', color: '#2d2d2d', flex: 1 },
  timelineAmount: { fontSize: 15, fontWeight: '800', color: '#2d2d2d' },
  timelineDueText: { fontSize: 11, color: '#888', marginTop: 3, flex: 1 },
  timelineAdjust: { fontSize: 11, color: '#b45309', fontWeight: '700', marginTop: 3 },
  seeMoreBtn: { paddingTop: 4, paddingBottom: 2, alignItems: 'center' },
  seeMoreText: { fontSize: 12, color: '#e2712b', fontWeight: '600' },
});
