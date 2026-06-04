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
  Modal,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { api } from '../lib/api';

const ACCENT = '#6b5b45';

type Session = {
  id: string;
  title: string | null;
  contractId: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { messages: number };
};

type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt?: string;
};

function fmtRelative(d: string) {
  const diff = Date.now() - new Date(d).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) {
    const date = new Date(d);
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  }
  if (days === 1) return 'ayer';
  if (days < 7) return `hace ${days} días`;
  return new Date(d).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

export function AiChatScreen() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [historyVisible, setHistoryVisible] = useState(false);
  const listRef = useRef<FlatList<AiMessage>>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  useEffect(() => {
    if (selectedId) loadMessages(selectedId);
    else setMessages([]);
  }, [selectedId]);

  async function loadSessions() {
    try {
      const res = await api.get('/ai-chat/sessions');
      const data: Session[] = res.data.data;
      setSessions(data);
      if (data.length > 0 && !selectedId) setSelectedId(data[0].id);
    } catch {}
  }

  async function loadMessages(sessionId: string) {
    try {
      const res = await api.get(`/ai-chat/sessions/${sessionId}`);
      setMessages(res.data.data.messages ?? []);
    } catch {}
  }

  async function createSession() {
    try {
      const res = await api.post('/ai-chat/sessions', {});
      const s: Session = { ...res.data.data, _count: { messages: 0 } };
      setSessions((prev) => [s, ...prev]);
      setSelectedId(s.id);
      setMessages([]);
      setHistoryVisible(false);
    } catch {}
  }

  async function deleteSession(sessionId: string) {
    try {
      await api.delete(`/ai-chat/sessions/${sessionId}`);
      const remaining = sessions.filter((s) => s.id !== sessionId);
      setSessions(remaining);
      if (selectedId === sessionId) {
        setSelectedId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch {}
  }

  async function handleSend() {
    const content = draft.trim();
    if (!content || loading) return;

    let currentId = selectedId;
    if (!currentId) {
      try {
        const res = await api.post('/ai-chat/sessions', {});
        const s: Session = { ...res.data.data, _count: { messages: 0 } };
        setSessions((prev) => [s, ...prev]);
        setSelectedId(s.id);
        currentId = s.id;
      } catch {
        return;
      }
    }

    setDraft('');
    setLoading(true);
    const tempId = 'tmp-' + Date.now();
    setMessages((prev) => [...prev, { id: tempId, role: 'user', content }]);

    try {
      const res = await api.post(`/ai-chat/sessions/${currentId}/messages`, { content });
      const { assistantMessage } = res.data.data;
      setMessages((prev) => [
        ...prev,
        { id: assistantMessage.id, role: 'assistant', content: assistantMessage.content },
      ]);
      loadSessions();
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setLoading(false);
    }
  }

  const selectedSession = sessions.find((s) => s.id === selectedId);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={26} color="#2d2d2d" />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {selectedSession?.title ?? 'Asistente IA'}
          </Text>
          <Text style={styles.headerSubtitle}>Rently AI</Text>
        </View>
        <TouchableOpacity style={styles.headerBtn} onPress={() => setHistoryVisible(true)}>
          <Ionicons name="time-outline" size={22} color="#2d2d2d" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerBtn} onPress={createSession}>
          <Ionicons name="add" size={24} color="#2d2d2d" />
        </TouchableOpacity>
      </View>

      {/* Thread */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        contentContainerStyle={styles.list}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.empty}>
              <Text style={styles.emptyEmoji}>🤖</Text>
              <Text style={styles.emptyTitle}>Asistente IA de Rently</Text>
              <Text style={styles.emptyText}>
                Preguntame sobre tus propiedades, contratos, pagos, reclamos o cualquier
                consulta de alquiler.
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.role === 'user' ? styles.bubbleMine : styles.bubbleTheirs,
            ]}
          >
            <Text style={[styles.bubbleText, item.role === 'user' && styles.bubbleTextMine]}>
              {item.content}
            </Text>
          </View>
        )}
        ListFooterComponent={
          loading ? (
            <View style={[styles.bubble, styles.bubbleTheirs, styles.typing]}>
              <ActivityIndicator color={ACCENT} size="small" />
              <Text style={styles.typingText}>Pensando...</Text>
            </View>
          ) : null
        }
      />

      {/* Input */}
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder="Hacé una consulta a la IA..."
          placeholderTextColor="#aaa"
          value={draft}
          onChangeText={setDraft}
          multiline
          maxLength={4000}
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.sendBtn, (!draft.trim() || loading) && styles.sendBtnDisabled]}
          onPress={handleSend}
          disabled={!draft.trim() || loading}
        >
          <Ionicons name="send" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* History modal */}
      <Modal
        visible={historyVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHistoryVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Conversaciones</Text>
              <TouchableOpacity onPress={() => setHistoryVisible(false)}>
                <Ionicons name="close" size={24} color="#2d2d2d" />
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.newBtn} onPress={createSession}>
              <Ionicons name="add" size={18} color="#fff" />
              <Text style={styles.newBtnText}>Nueva conversación</Text>
            </TouchableOpacity>
            <FlatList
              data={sessions}
              keyExtractor={(s) => s.id}
              style={{ maxHeight: 360 }}
              ListEmptyComponent={
                <Text style={styles.emptyText}>Todavía no tenés conversaciones.</Text>
              }
              renderItem={({ item }) => (
                <View
                  style={[
                    styles.sessionRow,
                    item.id === selectedId && styles.sessionRowActive,
                  ]}
                >
                  <TouchableOpacity
                    style={{ flex: 1 }}
                    onPress={() => {
                      setSelectedId(item.id);
                      setHistoryVisible(false);
                    }}
                  >
                    <Text style={styles.sessionTitle} numberOfLines={1}>
                      {item.title ?? 'Nueva conversación'}
                    </Text>
                    <Text style={styles.sessionMeta}>
                      {fmtRelative(item.updatedAt)} · {item._count.messages} msg
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteSession(item.id)}>
                    <Ionicons name="trash-outline" size={16} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              )}
            />
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 56,
    paddingBottom: 12,
    paddingHorizontal: 14,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0ebe4',
  },
  backBtn: { padding: 4, marginRight: 2 },
  headerTitle: { fontSize: 16, fontWeight: '800', color: '#2d2d2d' },
  headerSubtitle: { fontSize: 12, color: '#aaa' },
  headerBtn: { padding: 4 },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 20 },
  emptyEmoji: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#2d2d2d', marginBottom: 8 },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 14, lineHeight: 20 },
  bubble: { maxWidth: '84%', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleMine: { alignSelf: 'flex-end', backgroundColor: ACCENT },
  bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: '#fff' },
  bubbleText: { fontSize: 15, color: '#2d2d2d', lineHeight: 21 },
  bubbleTextMine: { color: '#fff' },
  typing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { fontSize: 14, color: '#888' },
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
    backgroundColor: ACCENT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: '#faf8f5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#2d2d2d' },
  newBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 12,
  },
  newBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
  },
  sessionRowActive: { borderWidth: 1.5, borderColor: ACCENT },
  sessionTitle: { fontSize: 14, fontWeight: '700', color: '#2d2d2d' },
  sessionMeta: { fontSize: 12, color: '#aaa', marginTop: 2 },
  deleteBtn: { padding: 6, marginLeft: 8 },
});
