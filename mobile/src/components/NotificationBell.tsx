import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../lib/api';
import { useAuthStore } from '../store/auth';
import { useOwnerNotifRead } from '../store/notifications';

type OwnerNotification = { id: string };

export function NotificationBell() {
  const role = useAuthStore((s) => s.user?.role);
  const isOwner = role !== 'TENANT';

  const hydrated = useOwnerNotifRead((s) => s.hydrated);
  const readIds = useOwnerNotifRead((s) => s.readIds);
  const hydrate = useOwnerNotifRead((s) => s.hydrate);
  useEffect(() => {
    if (isOwner && !hydrated) hydrate();
  }, [isOwner, hydrated]);

  const ownerQuery = useQuery<OwnerNotification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/dashboard/notifications').then((r) => r.data.data),
    refetchInterval: 60000,
    enabled: isOwner,
  });

  const tenantQuery = useQuery<{ unreadCount: number }>({
    queryKey: ['tenant-notifications'],
    queryFn: () => api.get('/tenant/notifications').then((r) => r.data.data),
    refetchInterval: 60000,
    enabled: !isOwner,
  });

  const unread = isOwner
    ? (ownerQuery.data ?? []).filter((n) => !readIds.has(n.id)).length
    : tenantQuery.data?.unreadCount ?? 0;

  return (
    <TouchableOpacity style={styles.bell} onPress={() => router.push('/notifications')}>
      <Ionicons name="notifications-outline" size={22} color="#2d2d2d" />
      {unread > 0 ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{unread > 9 ? '9+' : unread}</Text>
        </View>
      ) : null}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  bell: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  badge: {
    position: 'absolute',
    top: 6,
    right: 6,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
});
