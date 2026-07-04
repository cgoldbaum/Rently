import { useEffect, useMemo, useRef, useState } from 'react';
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
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useThemeColors } from '../theme/useThemeColors';
import type { ThemeColors } from '../theme/colors';

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
  const { t } = useTranslation('chat');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const listRef = useRef<FlatList<AiMessage>>(null);
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

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
              <Ionicons name="sparkles" size={16} color={ACCENT} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerTitle}>{t('ai.title')}</Text>
              <Text style={styles.headerSubtitle}>{t('contractPanel.subtitle')}</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={{ padding: 4 }}>
              <Ionicons name="close" size={24} color={colors.text} />
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
                <Text style={styles.emptyText}>{t('contractPanel.empty')}</Text>
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
                  <Text style={styles.typingText}>{t('contractPanel.thinking')}</Text>
                </View>
              ) : null
            }
          />

          <View style={styles.inputRow}>
            <TextInput
              style={styles.input}
              placeholder={t('contractPanel.inputPlaceholder')}
              placeholderTextColor={colors.placeholder}
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
              <Ionicons name="send" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    overlay: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
    sheet: {
      height: '82%',
      backgroundColor: colors.background,
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
      backgroundColor: colors.backgroundElevated,
      borderBottomWidth: 1,
      borderBottomColor: colors.borderLight,
    },
    headerIcon: {
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: colors.card,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: { fontSize: 15, fontWeight: '800', color: colors.text },
    headerSubtitle: { fontSize: 12, color: colors.textMuted },
    list: { padding: 16, gap: 10, flexGrow: 1 },
    emptyText: { textAlign: 'center', color: colors.textMuted, fontSize: 14, marginTop: 30, paddingHorizontal: 20, lineHeight: 20 },
    bubble: { maxWidth: '85%', borderRadius: 14, paddingHorizontal: 13, paddingVertical: 9 },
    bubbleMine: { alignSelf: 'flex-end', backgroundColor: ACCENT },
    bubbleTheirs: { alignSelf: 'flex-start', backgroundColor: colors.card },
    bubbleText: { fontSize: 15, color: colors.text, lineHeight: 21 },
    bubbleTextMine: { color: '#fff' },
    typing: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    typingText: { fontSize: 14, color: colors.textMuted },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 8,
      padding: 10,
      paddingBottom: 28,
      backgroundColor: colors.card,
      borderTopWidth: 1,
      borderTopColor: colors.borderLight,
    },
    input: {
      flex: 1,
      maxHeight: 110,
      backgroundColor: colors.cardMuted,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 10,
      fontSize: 15,
      color: colors.text,
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
}
