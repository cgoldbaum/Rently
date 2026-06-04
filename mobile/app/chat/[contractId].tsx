import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Ionicons from '@expo/vector-icons/Ionicons';
import { api } from '../../src/lib/api';
import { AiContractPanel } from '../../src/components/AiContractPanel';

type Message = {
  id: string;
  body: string;
  senderId: string;
  senderName: string;
  mine: boolean;
  readAt: string | null;
  createdAt: string;
};

function fmtTime(d: string) {
  const date = new Date(d);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

export default function ChatThread() {
  const { contractId, name } = useLocalSearchParams<{ contractId: string; name: string }>();
  const qc = useQueryClient();
  const [draft, setDraft] = useState('');
  const [aiVisible, setAiVisible] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ['chat-messages', contractId],
    queryFn: () =>
      api.get(`/chat/conversations/${contractId}/messages`).then((r) => r.data.data),
    enabled: !!contractId,
    refetchInterval: 15000,
  });

  const markRead = useMutation({
    mutationFn: () => api.put(`/chat/conversations/${contractId}/read`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['chat-messages', contractId] });
      qc.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });

  const sendMessage = useMutation({
    mutationFn: (body: string) =>
      api.post(`/chat/conversations/${contractId}/messages`, { body }),
    onSuccess: () => {
      setDraft('');
      qc.invalidateQueries({ queryKey: ['chat-messages', contractId] });
      qc.invalidateQueries({ queryKey: ['chat-conversations'] });
    },
  });

  // Mark incoming messages as read while viewing the thread.
  useEffect(() => {
    if (contractId && messages.some((m) => !m.mine && !m.readAt)) {
      markRead.mutate();
    }
  }, [contractId, messages]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = () => {
    const body = draft.trim();
    if (!body || sendMessage.isPending) return;
    sendMessage.mutate(body);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#2d2d2d" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {name ?? 'Chat'}
        </Text>
        <TouchableOpacity style={styles.aiBtn} onPress={() => setAiVisible(true)}>
          <Ionicons name="sparkles" size={20} color="#6b5b45" />
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color="#6b5b45" size="large" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
          ListEmptyComponent={
            <Text style={styles.emptyText}>No hay mensajes. ¡Escribí el primero!</Text>
          }
          renderItem={({ item }) => (
            <View
              style={[styles.bubble, item.mine ? styles.bubbleMine : styles.bubbleTheirs]}
            >
              <Text style={[styles.bubbleText, item.mine && styles.bubbleTextMine]}>
                {item.body}
              </Text>
              <Text style={[styles.bubbleTime, item.mine && styles.bubbleTimeMine]}>
                {fmtTime(item.createdAt)}
              </Text>
            </View>
          )}
        />
      )}

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Escribí un mensaje..."
          placeholderTextColor="#aaa"
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={2000}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || sendMessage.isPending) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!draft.trim() || sendMessage.isPending}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {contractId && (
        <AiContractPanel
          contractId={contractId}
          visible={aiVisible}
          onClose={() => setAiVisible(false)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0ebe4',
  },
  backBtn: { padding: 4 },
  aiBtn: { padding: 6, marginLeft: 4 },
  headerTitle: { flex: 1, fontSize: 17, fontWeight: '800', color: '#2d2d2d', marginLeft: 4 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: 16, gap: 8, flexGrow: 1 },
  emptyText: { textAlign: 'center', color: '#aaa', fontSize: 13, marginTop: 40 },
  bubble: { maxWidth: '78%', borderRadius: 14, paddingHorizontal: 12, paddingVertical: 8 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: '#6b5b45' },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  bubbleText: { fontSize: 15, color: '#2d2d2d', lineHeight: 20 },
  bubbleTextMine: { color: '#fff' },
  bubbleTime: { fontSize: 10, color: '#aaa', marginTop: 3, textAlign: 'right' },
  bubbleTimeMine: { color: 'rgba(255,255,255,0.7)' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    padding: 10,
    paddingBottom: 28,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#f0ebe4',
  },
  input: {
    flex: 1,
    maxHeight: 110,
    backgroundColor: '#f3f0ea',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 15,
    color: '#2d2d2d',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#6b5b45',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
});
