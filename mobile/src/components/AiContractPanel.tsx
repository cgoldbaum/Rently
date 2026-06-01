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
import { Send, X, Sparkles } from 'lucide-react-native';
import { api } from '../lib/api';

const ACCENT = '#6b5b45';

type AiMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

export function AiContractPanel({
  contractId,
  visible,
  onClose,
}: {
  contractId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<AiMessage>>(null);

  // Load (or create) the contract-scoped session the first time the panel opens.
  useEffect(() => {
    if (!visible || sessionId || !contractId) return;
    api
      .get(`/ai-chat/contract/${contractId}/session`)
      .then((res) => {
        const session = res.data.data;
        setSessionId(session.id);
        return api.get(`/ai-chat/sessions/${session.id}`);
      })
      .then((res) => setMessages(res.data.data.messages ?? []))
      .catch(() => {});
  }, [visible, sessionId, contractId]);

  async function handleSend() {
    const content = draft.trim();
    if (!content || loading || !sessionId) return;

    setDraft('');
    setLoading(true);
    const tempId = 'tmp-' + Date.now();
    setMessages((prev) => [...prev, { id: tempId, role: 'user', content }]);

    try {
      const res = await api.post(`/ai-chat/sessions/${sessionId}/messages`, { content });
      const { assistantMessage } = res.data.data;
      setMessages((prev) => [
        ...prev,
        { id: assistantMessage.id, role: 'assistant', content: assistantMessage.content },
      ]);
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <KeyboardAvoidingView
          style={styles.sheet}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.header}>
            <View style={styles.headerIcon}>
              <Sparkles size={16} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>Asistente IA</Text>
              <Text style={styles.headerSubtitle}>Contexto de este contrato</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <X size={24} color="#2d2d2d" />
            </TouchableOpacity>
          </View>

          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m) => m.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              loading ? null : (
                <Text style={styles.emptyText}>
                  Preguntame sobre este contrato, pagos o inquilino.
                </Text>
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

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder="Consultá a la IA..."
              placeholderTextColor="#aaa"
              value={draft}
              onChangeText={setDraft}
              multiline
              maxLength={4000}
              editable={!loading && !!sessionId}
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!draft.trim() || loading || !sessionId) && styles.sendBtnDisabled]}
              onPress={handleSend}
              disabled={!draft.trim() || loading || !sessionId}
            >
              <Send size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    height: '82%',
    backgroundColor: '#faf8f5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#f3efe9',
    borderBottomWidth: 1,
    borderBottomColor: '#e8e0d6',
  },
  headerIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 15, fontWeight: '800', color: '#2d2d2d' },
  headerSubtitle: { fontSize: 12, color: '#888' },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  emptyText: { textAlign: 'center', color: '#888', fontSize: 14, marginTop: 30, paddingHorizontal: 20, lineHeight: 20 },
  bubble: { maxWidth: '85%', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9 },
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
});
