import { useState, useMemo, memo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  useWindowDimensions,
  FlatList,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useChipStyles } from '../styles/shared';
import { useThemeColors } from '../theme/useThemeColors';
import type { ThemeColors } from '../theme/colors';

type Tag = { id: string; name: string; color?: string; isDefault: boolean };
type TagRel = { tag: Tag };
type Photo = { id: string; fileUrl: string; thumbnailUrl?: string; folderId?: string | null; tags: TagRel[] };
type Folder = { id: string; name: string; description?: string | null; _count?: { photos: number } };

const GAP = 10;
const COLS = 3;
const SIDE = 20;

const PhotoCell = memo(function PhotoCell({ photo, cellSize, baseUrl, onDelete, styles }: { photo: Photo; cellSize: number; baseUrl: string; onDelete: (id: string) => void; styles: ReturnType<typeof createStyles> }) {
  return (
    <View style={[styles.cell, { width: cellSize, height: cellSize }]}>
      <Image
        source={{ uri: `${baseUrl}${photo.thumbnailUrl ?? photo.fileUrl}` }}
        style={styles.img}
        contentFit="cover"
      />
      {photo.tags?.length > 0 && (
        <View style={styles.tagOverlay}>
          {photo.tags.slice(0, 2).map((rel) => (
            <Text key={rel.tag.id} style={styles.tagLabel}>{rel.tag.name}</Text>
          ))}
        </View>
      )}
      <TouchableOpacity style={styles.delBtn} onPress={() => onDelete(photo.id)}>
        <Text style={styles.delBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
});

const TAG_COLORS = ['#6b7280', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export function PropertyPhotosTab({ propertyId }: { propertyId: string }) {
  const { t } = useTranslation('photos');
  const { width } = useWindowDimensions();
  const cellSize = useMemo(() => (width - SIDE * 2 - GAP * (COLS - 1)) / COLS, [width]);
  const qc = useQueryClient();
  const baseUrl = api.defaults.baseURL ?? '';
  const chipStyles = useChipStyles();
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const [activeFolder, setActiveFolder] = useState('');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadFolder, setUploadFolder] = useState('');
  const [uploadTags, setUploadTags] = useState<string[]>([]);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const { data: tags = [] } = useQuery<Tag[]>({
    queryKey: ['photo-tags'],
    queryFn: () => api.get('/tags').then((r) => r.data.data),
  });

  const { data: folders = [] } = useQuery<Folder[]>({
    queryKey: ['property-folders', propertyId],
    queryFn: () => api.get(`/properties/${propertyId}/folders`).then((r) => r.data.data),
  });

  const photosUrl = activeFolder
    ? `/properties/${propertyId}/photos?folderId=${activeFolder}`
    : `/properties/${propertyId}/photos`;

  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ['property-photos', propertyId, activeFolder],
    queryFn: () => api.get(photosUrl).then((r) => r.data.data),
  });

  const upload = useMutation({
    mutationFn: async (assets: ImagePicker.ImagePickerAsset[]) => {
      const formData = new FormData();
      assets.forEach((a, i) => {
        formData.append('images[]', {
          uri: a.uri,
          name: a.fileName ?? `foto-${Date.now()}-${i}.jpg`,
          type: a.mimeType ?? 'image/jpeg',
        } as unknown as Blob);
      });
      if (uploadFolder) formData.append('folderId', uploadFolder);
      if (uploadTags.length > 0) {
        uploadTags.forEach((id) => formData.append('tagIds[]', id));
      }
      const res = await api.post(`/properties/${propertyId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property-photos', propertyId] });
      setShowUploadModal(false);
      setUploadFolder('');
      setUploadTags([]);
    },
    onError: () => Alert.alert(t('common:error'), t('upload.error')),
  });

  const remove = useMutation({
    mutationFn: (photoId: string) =>
      api.delete(`/properties/${propertyId}/photos/${photoId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['property-photos', propertyId] }),
    onError: () => Alert.alert(t('common:error'), t('detail.deleteError')),
  });

  const createFolder = useMutation({
    mutationFn: (name: string) =>
      api.post(`/properties/${propertyId}/folders`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property-folders', propertyId] });
      setNewFolderName('');
      Alert.alert(t('upload.done'), t('folders.created'));
    },
    onError: () => Alert.alert(t('common:error'), t('folders.createError')),
  });

  const deleteFolder = useMutation({
    mutationFn: (folderId: string) =>
      api.delete(`/properties/${propertyId}/folders/${folderId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property-folders', propertyId] });
      qc.invalidateQueries({ queryKey: ['property-photos', propertyId] });
      Alert.alert(t('upload.done'), t('folders.deleted'));
    },
    onError: () => Alert.alert(t('common:error'), t('folders.deleteError')),
  });

  const pickPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert(t('upload.permissionTitle'), t('upload.permissionDesc'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });
    if (result.canceled || !result.assets.length) return;
    setShowUploadModal(true);
    upload.mutate(result.assets);
  };

  const confirmDelete = (photoId: string) =>
    Alert.alert(t('detail.title'), t('detail.confirmSimple'), [
      { text: t('common:cancel'), style: 'cancel' },
      { text: t('common:delete'), style: 'destructive', onPress: () => remove.mutate(photoId) },
    ]);

  const confirmDeleteFolder = (folder: Folder) =>
    Alert.alert(t('folders.title'), t('folders.deleteConfirm', { name: folder.name }), [
      { text: t('common:cancel'), style: 'cancel' },
      { text: t('common:delete'), style: 'destructive', onPress: () => deleteFolder.mutate(folder.id) },
    ]);

  const toggleTag = (tagId: string) => {
    setUploadTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId],
    );
  };

  if (isLoading) {
    return <ActivityIndicator color="#6b5b45" style={{ marginTop: 30 }} />;
  }

  return (
    <View style={styles.section}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.count}>
          {t('grid.photoCount', { count: photos.length })}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => setShowFolderModal(true)}
          >
            <Text style={styles.outlineBtnText}>{t('folders.title')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, upload.isPending && styles.disabled]}
            onPress={pickPhotos}
            disabled={upload.isPending}
          >
            <Text style={styles.addBtnText}>
              {upload.isPending ? t('upload.uploading') : t('upload.addButton')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Folder filters */}
      {folders.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6, paddingRight: 20 }}>
            <TouchableOpacity
              style={[chipStyles.chip, !activeFolder && chipStyles.chipActive]}
              onPress={() => setActiveFolder('')}
            >
              <Text style={[chipStyles.chipText, !activeFolder && chipStyles.chipTextActive]}>
                {t('filters.all')}
              </Text>
            </TouchableOpacity>
            {folders.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[chipStyles.chip, activeFolder === f.id && chipStyles.chipActive]}
                onPress={() => setActiveFolder(f.id)}
              >
                <Text
                  style={[chipStyles.chipText, activeFolder === f.id && chipStyles.chipTextActive]}
                >
                  {f.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      )}

      {/* Photo grid */}
      {photos.length === 0 ? (
        <Text style={styles.empty}>
          {activeFolder ? t('grid.noPhotos') : t('grid.noPhotosEmpty')}
        </Text>
      ) : (
        <FlatList
          data={photos}
          numColumns={COLS}
          keyExtractor={(p) => p.id}
          renderItem={({ item }) => (
            <PhotoCell photo={item} cellSize={cellSize} baseUrl={baseUrl} onDelete={confirmDelete} styles={styles} />
          )}
          getItemLayout={(_, index) => ({
            length: cellSize + GAP,
            offset: (cellSize + GAP) * index,
            index,
          })}
          removeClippedSubviews
          columnWrapperStyle={{ gap: GAP }}
          scrollEnabled={false}
        />
      )}

      {/* Upload options modal */}
      <Modal
        visible={showUploadModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('upload.optionsTitle')}</Text>

            <Text style={styles.modalLabel}>{t('upload.folderLabel')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <View style={chipStyles.row}>
                <TouchableOpacity
                  style={[chipStyles.chip, !uploadFolder && chipStyles.chipActive]}
                  onPress={() => setUploadFolder('')}
                >
                  <Text style={[chipStyles.chipText, !uploadFolder && chipStyles.chipTextActive]}>
                    {t('upload.noFolder')}
                  </Text>
                </TouchableOpacity>
                {folders.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[chipStyles.chip, uploadFolder === f.id && chipStyles.chipActive]}
                    onPress={() => setUploadFolder(f.id)}
                  >
                    <Text                       style={[chipStyles.chipText, uploadFolder === f.id && chipStyles.chipTextActive]}>
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.modalLabel}>{t('upload.tagsLabel')}</Text>
            <View style={[chipStyles.row, { gap: 6, marginBottom: 24 }]}>
              {tags.map((tag) => (
                <TouchableOpacity
                  key={tag.id}
                  style={[
                    chipStyles.chip,
                    uploadTags.includes(tag.id) && {
                      backgroundColor: tag.color || '#6b5b45',
                    },
                  ]}
                  onPress={() => toggleTag(tag.id)}
                >
                  <Text
                    style={[
                      chipStyles.chipText,
                      uploadTags.includes(tag.id) && chipStyles.chipTextActive,
                    ]}
                  >
                    {tag.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setShowUploadModal(false)}
            >
              <Text style={styles.primaryBtnText}>{t('upload.done')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Folder management modal */}
      <Modal
        visible={showFolderModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFolderModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('folders.title')}</Text>

            {folders.length === 0 ? (
              <Text style={{ textAlign: 'center', color: colors.textMuted, marginVertical: 20 }}>
                {t('folders.empty')}
              </Text>
            ) : (
              folders.map((f) => (
                <View key={f.id} style={styles.folderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.folderName}>{f.name}</Text>
                    <Text style={styles.folderCount}>
                      {t('folders.photoCount', { count: f._count?.photos ?? 0 })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.dangerBtn}
                    onPress={() => confirmDeleteFolder(f)}
                  >
                    <Text style={styles.dangerBtnText}>{t('common:delete')}</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <TextInput
                style={styles.input}
                placeholder={t('folders.namePlaceholder')}
                placeholderTextColor={colors.placeholder}
                value={newFolderName}
                onChangeText={setNewFolderName}
              />
              <TouchableOpacity
                style={[styles.primaryBtn, { paddingHorizontal: 16 }]}
                onPress={() => {
                  if (newFolderName.trim()) createFolder.mutate(newFolderName.trim());
                }}
                disabled={!newFolderName.trim()}
              >
                <Text style={styles.primaryBtnText}>{t('folders.create')}</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.outlineBtn, { marginTop: 12 }]}
              onPress={() => setShowFolderModal(false)}
            >
              <Text style={styles.outlineBtnText}>{t('folders.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    section: { paddingHorizontal: SIDE },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 14,
    },
    count: { fontSize: 14, fontWeight: '700', color: colors.text },
    addBtn: {
      backgroundColor: '#6b5b45',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
    outlineBtn: {
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    outlineBtnText: { color: '#6b5b45', fontSize: 12, fontWeight: '700' },
    disabled: { opacity: 0.5 },
    empty: { textAlign: 'center', color: colors.placeholder, fontSize: 14, marginTop: 20 },
    cell: { borderRadius: 10, overflow: 'hidden', backgroundColor: colors.backgroundElevated },
    img: { width: '100%', height: '100%' },
    tagOverlay: {
      position: 'absolute',
      bottom: 4,
      left: 4,
      flexDirection: 'row',
      gap: 2,
    },
    tagLabel: {
      fontSize: 9,
      fontWeight: '600',
      color: '#fff',
      backgroundColor: 'rgba(0,0,0,0.5)',
      paddingHorizontal: 4,
      paddingVertical: 1,
      borderRadius: 3,
      overflow: 'hidden',
    },
    delBtn: {
      position: 'absolute',
      top: 4,
      right: 4,
      width: 24,
      height: 24,
      borderRadius: 12,
      backgroundColor: 'rgba(0,0,0,0.6)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    delBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    modalContent: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 24,
      maxHeight: '70%',
    },
    modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 16 },
    modalLabel: { fontSize: 13, fontWeight: '700', color: colors.textSecondary, marginBottom: 8 },
    folderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.backgroundElevated,
    },
    folderName: { fontSize: 15, fontWeight: '600', color: colors.text },
    folderCount: { fontSize: 12, color: colors.placeholder, marginTop: 2 },
    input: {
      flex: 1,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      fontSize: 14,
      color: colors.text,
    },
    primaryBtn: {
      backgroundColor: '#6b5b45',
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
    dangerBtn: {
      backgroundColor: '#fee2e2',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
    },
    dangerBtnText: { color: '#ef4444', fontSize: 12, fontWeight: '700' },
  });
}
