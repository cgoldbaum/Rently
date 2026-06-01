import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '../lib/api';

type Conversation = {
  contractId: string;
  propertyName: string | null;
  propertyAddress: string;
  otherPartyName: string;
  otherPartyRole: 'OWNER' | 'TENANT';
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
};

function fmtWhen(d: string | null) {
  if (!d) return '';
  const date = new Date(d);
  const today = new Date();
  const sameDay =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();
  if (sameDay) {
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function ConversationsScreen() {
  const { data = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ['chat-conversations'],
    queryFn: () => api.get('/chat/conversations').then((r) => r.data.data),
    refetchInterval: 5000,
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Chat</Text>
      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#6b5b45" size="large" />
        </View>
      ) : data.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No tenés conversaciones todavía.</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => c.contractId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() =>
                router.push({
                  pathname: '/chat/[contractId]',
                  params: { contractId: item.contractId, name: item.otherPartyName },
                })
              }
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>
                  {item.otherPartyName.charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={styles.rowBody}>
                <View style={styles.rowTop}>
                  <Text style={styles.name} numberOfLines={1}>
                    {item.otherPartyName}
                  </Text>
                  <Text style={styles.when}>{fmtWhen(item.lastMessageAt)}</Text>
                </View>
                <Text style={styles.property} numberOfLines={1}>
                  {item.propertyName ?? item.propertyAddress}
                </Text>
                <View style={styles.rowBottom}>
                  <Text style={styles.preview} numberOfLines={1}>
                    {item.lastMessage ?? 'Sin mensajes'}
                  </Text>
                  {item.unreadCount > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unreadCount}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2d2d2d',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: '#aaa', fontSize: 14 },
  list: { paddingHorizontal: 16, paddingBottom: 20, gap: 8 },
  row: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#6b5b45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#fff', fontSize: 18, fontWeight: '800' },
  rowBody: { flex: 1 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: '#2d2d2d', flex: 1 },
  when: { fontSize: 11, color: '#aaa', marginLeft: 8 },
  property: { fontSize: 12, color: '#888', marginTop: 1 },
  rowBottom: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  preview: { flex: 1, fontSize: 13, color: '#666' },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
});
