import { useEffect, useMemo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuthStore } from '../src/store/auth';
import { useTranslation } from 'react-i18next';
import { api } from '../src/lib/api';
import { useOwnerNotifRead } from '../src/store/notifications';
import { useThemeColors } from '../src/theme/useThemeColors';
import type { ThemeColors } from '../src/theme/colors';

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

function fmtShortDate(d: string | Date) {
  const date = new Date(d);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

function relativeTime(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'ahora';
  if (m < 60) return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `hace ${h}h`;
  return `hace ${Math.floor(h / 24)}d`;
}

function Header({ title, action }: { title: string; action?: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
        <Ionicons name="chevron-back" size={26} color={colors.text} />
      </TouchableOpacity>
      <Text style={styles.headerTitle}>{title}</Text>
      <View style={styles.headerAction}>{action}</View>
    </View>
  );
}

function EmptyState({ text }: { text: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyCheck}>✓</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

// Unified notification icon — shared by owner and tenant.
// Handles both lowercase (owner) and uppercase (tenant) type names.
const NOTIF_STYLE: Record<string, { bg: string; color: string; iconName: string }> = {
  claim: { bg: '#fef2f2', color: '#dc2626', iconName: 'wrench-outline' },
  payment: { bg: '#fffbeb', color: '#d97706', iconName: 'cash-outline' },
  adjustment: { bg: '#f0f9ff', color: '#0284c7', iconName: 'trending-up' },
  contract: { bg: '#faf5ff', color: '#7c3aed', iconName: 'document-text-outline' },
  photo: { bg: '#f0fdf4', color: '#16a34a', iconName: 'image-outline' },
  default: { bg: '#f3f4f6', color: '#6b7280', iconName: 'notifications-outline' },
};

function NotifIcon({ type }: { type: string }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const s = NOTIF_STYLE[type?.toLowerCase()] ?? NOTIF_STYLE.default;
  return (
    <View style={[styles.iconBox, { backgroundColor: s.bg }]}>
      <Ionicons name={s.iconName as any} size={17} color={s.color} />
    </View>
  );
}

// ── Owner ──────────────────────────────────────────────────────────────────

type OwnerNotification = {
  id: string;
  type: string;
  subtype: string;
  message: string;
  detail: string;
  propertyAddress: string;
  date: string;
};

function OwnerNotifications() {
  const { t } = useTranslation('dashboard');
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { readIds, hydrated, hydrate, toggle, markAllRead } = useOwnerNotifRead();

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated]);

  const { data: notifications = [], isLoading, isRefetching, refetch } = useQuery<
    OwnerNotification[]
  >({
    queryKey: ['notifications'],
    queryFn: () => api.get('/dashboard/notifications').then((r) => r.data.data),
    refetchInterval: 60000,
  });

  const unread = notifications.filter((n) => !readIds.has(n.id));

  return (
    <View style={styles.container}>
      <Header
        title={t('notifications.title')}
        action={
          unread.length > 0 ? (
            <TouchableOpacity onPress={() => markAllRead(notifications.map((n) => n.id))}>
              <Text style={styles.markAll}>{t('notifications.markAllRead')}</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      {isLoading || !hydrated ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#6b5b45" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6b5b45" colors={['#6b5b45']} />
          }
        >
          {notifications.length === 0 ? (
            <EmptyState text={t('notifications.empty')} />
          ) : (
            notifications.map((n) => {
              const isRead = readIds.has(n.id);
              return (
                <View key={n.id} style={[styles.item, !isRead && styles.itemUnread]}>
                  <NotifIcon type={n.type} />
                  <View style={styles.itemBody}>
                    <Text style={[styles.itemMessage, !isRead && styles.itemMessageUnread]}>
                      {n.message}
                    </Text>
                    {n.detail ? <Text style={styles.itemDetail}>{n.detail}</Text> : null}
                    <Text style={styles.itemMeta}>
                      {n.propertyAddress} · {fmtShortDate(n.date)}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => toggle(n.id)} style={styles.itemAction}>
                    <Text style={[styles.itemActionText, !isRead && styles.itemActionUnread]}>
                      {isRead ? t('notifications.read') : t('notifications.unread')}
                    </Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ── Tenant ─────────────────────────────────────────────────────────────────

type TenantNotification = {
  id: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
};

function TenantNotifications() {
  const { t } = useTranslation('dashboard');
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const qc = useQueryClient();

  const { data, isLoading, isRefetching, refetch } = useQuery<{
    data: TenantNotification[];
    unreadCount: number;
  }>({
    queryKey: ['tenant-notifications'],
    queryFn: () => api.get('/tenant/notifications').then((r) => r.data.data),
    refetchInterval: 60000,
  });

  const notifications = data?.data ?? [];
  const unreadCount = data?.unreadCount ?? 0;

  const invalidate = () => qc.invalidateQueries({ queryKey: ['tenant-notifications'] });
  const markRead = useMutation({
    mutationFn: (id: string) => api.put(`/tenant/notifications/${id}/read`),
    onSuccess: invalidate,
  });
  const markUnread = useMutation({
    mutationFn: (id: string) => api.put(`/tenant/notifications/${id}/unread`),
    onSuccess: invalidate,
  });
  const markAllRead = useMutation({
    mutationFn: () => api.put('/tenant/notifications/read-all'),
    onSuccess: invalidate,
  });

  return (
    <View style={styles.container}>
      <Header
        title={t('notifications.title')}
        action={
          unreadCount > 0 ? (
            <TouchableOpacity onPress={() => markAllRead.mutate()}>
              <Text style={styles.markAll}>{t('notifications.markAllRead')}</Text>
            </TouchableOpacity>
          ) : null
        }
      />
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#6b5b45" size="large" />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#6b5b45" colors={['#6b5b45']} />
          }
        >
          {notifications.length === 0 ? (
            <EmptyState text={t('notifications.empty')} />
          ) : (
            notifications.map((n) => (
              <View key={n.id} style={[styles.item, !n.read && styles.itemUnread]}>
                <NotifIcon type={n.type} />
                <View style={styles.itemBody}>
                  <Text style={[styles.itemMessage, !n.read && styles.itemMessageUnread]}>
                    {n.message}
                  </Text>
                  <Text style={styles.itemMeta}>{relativeTime(n.createdAt)}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => (n.read ? markUnread.mutate(n.id) : markRead.mutate(n.id))}
                  style={styles.itemAction}
                >
                  <Text style={[styles.itemActionText, !n.read && styles.itemActionUnread]}>
                    {n.read ? t('notifications.unread') : t('notifications.read')}
                  </Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

export default function NotificationsScreen() {
  const activeView = useAuthStore((s) => s.activeView);
  return activeView === 'tenant' ? <TenantNotifications /> : <OwnerNotifications />;
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingBottom: 12,
      paddingHorizontal: 12,
      backgroundColor: colors.card,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    backBtn: { padding: 4 },
    headerTitle: { flex: 1, fontSize: 18, fontWeight: '800', color: colors.text, marginLeft: 4 },
    headerAction: { minWidth: 90, alignItems: 'flex-end' },
    markAll: { fontSize: 13, color: '#e2712b', fontWeight: '600' },

    list: { padding: 16, gap: 10 },
    item: {
      flexDirection: 'row',
      gap: 12,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 14,
      alignItems: 'flex-start',
    },
    itemUnread: { backgroundColor: '#fdf3ea' },
    iconBox: {
      width: 36,
      height: 36,
      borderRadius: 9,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemBody: { flex: 1 },
    itemMessage: { fontSize: 13, color: colors.text, fontWeight: '400' },
    itemMessageUnread: { fontWeight: '700' },
    itemDetail: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    itemMeta: { fontSize: 11, color: colors.placeholder, marginTop: 3 },
    itemAction: { paddingHorizontal: 4, paddingVertical: 2 },
    itemActionText: { fontSize: 11, fontWeight: '600', color: colors.placeholder },
    itemActionUnread: { color: '#e2712b' },

    empty: { alignItems: 'center', paddingVertical: 60 },
    emptyCheck: { fontSize: 32, color: '#22c55e', marginBottom: 8 },
    emptyText: { fontSize: 14, color: colors.placeholder },
  });
}
