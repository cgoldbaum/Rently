import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { api } from '../../src/lib/api';
import { claimSchema } from '@rently/shared';
import { claimStatusStyle } from '../../src/lib/claimStatus';
import { SkeletonScreen } from '../../src/components/ui/Skeleton';
import { EmptyState } from '../../src/components/ui/EmptyState';

type Claim = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  photoUrl?: string;
  createdAt: string;
};

const PRIORITY_KEYS = ['HIGH', 'MEDIUM', 'LOW'] as const;
const PRIORITY_COLOR: Record<string, string> = {
  HIGH: '#dc2626',
  MEDIUM: '#d97706',
  LOW: '#6b7280',
};

export default function TenantClaimsScreen() {
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const { t } = useTranslation('claims');
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [aiDrafting, setAiDrafting] = useState(false);

  const { data, isLoading } = useQuery<Claim[]>({
    queryKey: ['tenant-claims'],
    queryFn: () => api.get('/tenant/claims').then((r) => r.data.data),
  });

  const { mutate: createClaim, isPending } = useMutation({
    mutationFn: async (body: {
      title: string;
      description: string;
      priority: string;
      photoUri?: string | null;
    }) => {
      const form = new FormData();
      form.append('title', body.title);
      form.append('description', body.description);
      form.append('priority', body.priority);
      if (body.photoUri) {
        const filename = body.photoUri.split('/').pop() ?? 'photo.jpg';
        const ext = filename.split('.').pop() ?? 'jpg';
        form.append('photo', {
          uri: body.photoUri,
          name: filename,
          type: `image/${ext === 'png' ? 'png' : 'jpeg'}`,
        } as unknown as Blob);
      }
      return api.post('/tenant/claims', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-claims'] });
      setModalVisible(false);
      setTitle('');
      setDescription('');
      setPriority('MEDIUM');
      setPhotoUri(null);
    },
    onError: () => Alert.alert(t('common:error'), t('errors.createFailed')),
  });

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setPhotoUri(result.assets[0].uri);
    }
  };

  const handleAiDraft = async () => {
    const notes = description.trim();
    if (!notes || aiDrafting) return;
    setAiDrafting(true);
    try {
      const res = await api.post('/ai/draft-claim', { title: title.trim() || undefined, notes });
      const text: string = res.data.data.text?.trim() ?? '';
      if (text) setDescription(text);
    } catch {
      Alert.alert(t('common:error'), t('errors.aiDraftFailed'));
    } finally {
      setAiDrafting(false);
    }
  };

  const handleSubmit = () => {
    const result = claimSchema.safeParse({ title, description, priority });
    if (!result.success) {
      Alert.alert(t('common:error'), result.error.issues[0].message);
      return;
    }
    createClaim({ title: result.data.title, description: result.data.description, priority: result.data.priority ?? 'MEDIUM', photoUri });
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setPriority('MEDIUM');
    setPhotoUri(null);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('title')}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setModalVisible(true);
          }}
        >
          <Text style={styles.addButtonText}>{t('actions.newClaimShort')}</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <SkeletonScreen count={4} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          windowSize={7}
          ListEmptyComponent={
            <EmptyState
              emoji="🛠️"
              title={t('empty.tenantTitle')}
              description={t('empty.tenantDesc')}
            />
          }
          renderItem={({ item, index }) => {
            const st = claimStatusStyle(item.status);
            return (
              <Animated.View entering={FadeInDown.duration(280).delay(Math.min(index, 6) * 40)} style={styles.card}>
                <View style={styles.row}>
                  <Text style={styles.claimTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeText, { color: st.color }]}>
                      {t(`domain:claimStatus.${item.status}`)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.description} numberOfLines={2}>
                  {item.description}
                </Text>
              </Animated.View>
            );
          }}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View
          style={[styles.modal, { paddingTop: (Platform.OS === 'android' ? insets.top : 0) + 24 }]}
        >
          <Text style={styles.modalTitle}>{t('newClaim.title')}</Text>

          <TextInput
            style={styles.input}
            placeholder={t('form.titleLabel')}
            placeholderTextColor="#aaa"
            value={title}
            onChangeText={setTitle}
          />

          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder={t('form.descriptionMultilinePlaceholder')}
            placeholderTextColor="#aaa"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
          />

          <TouchableOpacity
            style={[styles.aiButton, (aiDrafting || !description.trim()) && styles.aiButtonDisabled]}
            onPress={handleAiDraft}
            disabled={aiDrafting || !description.trim()}
          >
            <Text style={styles.aiButtonText}>
              {aiDrafting ? t('form.aiDrafting') : t('form.aiDraft')}
            </Text>
          </TouchableOpacity>

          <Text style={styles.label}>{t('form.priorityLabel')}</Text>
          <View style={styles.priorityRow}>
            {PRIORITY_KEYS.map((key) => {
              const color = PRIORITY_COLOR[key];
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => setPriority(key)}
                  style={[
                    styles.priorityBtn,
                    {
                      borderColor: priority === key ? color : '#e0dbd4',
                      backgroundColor: priority === key ? `${color}18` : '#fff',
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.priorityBtnText,
                      { color: priority === key ? color : '#888' },
                    ]}
                  >
                    {t(`domain:claimPriority.${key}`)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={styles.photoButton} onPress={pickPhoto}>
            <Text style={styles.photoButtonText}>
              {photoUri ? t('form.changePhoto') : t('form.attachPhoto')}
            </Text>
          </TouchableOpacity>
          {photoUri && (
            <Image
              source={{ uri: photoUri }}
              style={styles.photoPreview}
              contentFit="cover"
            />
          )}

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isPending}
          >
            <Text style={styles.submitText}>
              {isPending ? t('actions.submitting') : t('actions.submitClaim')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => {
              setModalVisible(false);
              resetForm();
            }}
          >
            <Text style={styles.cancelText}>{t('common:cancel')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#2d2d2d' },
  addButton: {
    backgroundColor: '#6b5b45',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addButtonText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  loading: { textAlign: 'center', color: '#aaa', marginTop: 40 },
  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  claimTitle: { fontSize: 15, fontWeight: '700', color: '#2d2d2d', flex: 1 },
  description: { fontSize: 13, color: '#555', marginTop: 8, lineHeight: 18 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  modal: { flex: 1, padding: 24, backgroundColor: '#faf8f5' },
  modalTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2d2d2d',
    marginBottom: 20,
    marginTop: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#555',
    marginBottom: 10,
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  priorityBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  priorityBtnText: { fontSize: 13, fontWeight: '700' },
  photoButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#e0dbd4',
    borderStyle: 'dashed',
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  photoButtonText: { fontSize: 14, color: '#6b5b45', fontWeight: '600' },
  photoPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e0dbd4',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    fontSize: 16,
    backgroundColor: '#fff',
    color: '#2d2d2d',
  },
  textarea: { height: 120, textAlignVertical: 'top' },
  aiButton: {
    alignSelf: 'flex-start',
    backgroundColor: '#efe9df',
    borderWidth: 1,
    borderColor: '#6b5b45',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: -4,
    marginBottom: 16,
  },
  aiButtonDisabled: { opacity: 0.5 },
  aiButtonText: { color: '#6b5b45', fontSize: 13, fontWeight: '700' },
  submitButton: {
    backgroundColor: '#6b5b45',
    borderRadius: 14,
    padding: 18,
    alignItems: 'center',
  },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelButton: { marginTop: 12, padding: 16, alignItems: 'center' },
  cancelText: { color: '#888', fontSize: 16 },
});
