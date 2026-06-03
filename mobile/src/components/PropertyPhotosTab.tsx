import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  Modal,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

type Tag = { id: string; name: string; color?: string; isDefault: boolean };
type TagRel = { tag: Tag };
type Photo = { id: string; fileUrl: string; thumbnailUrl?: string; folderId?: string | null; tags: TagRel[] };
type Folder = { id: string; name: string; description?: string | null; _count?: { photos: number } };

const GAP = 10;
const COLS = 3;
const SIDE = 20;
const cellSize = (Dimensions.get('window').width - SIDE * 2 - GAP * (COLS - 1)) / COLS;

const TAG_COLORS = ['#6b7280', '#ef4444', '#f59e0b', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6'];

export function PropertyPhotosTab({ propertyId }: { propertyId: string }) {
  const qc = useQueryClient();
  const baseUrl = api.defaults.baseURL ?? '';

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
        uploadTags.forEach((t) => formData.append('tagIds[]', t));
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
    onError: () => Alert.alert('Error', 'No se pudieron subir las fotos.'),
  });

  const remove = useMutation({
    mutationFn: (photoId: string) =>
      api.delete(`/properties/${propertyId}/photos/${photoId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['property-photos', propertyId] }),
    onError: () => Alert.alert('Error', 'No se pudo eliminar la foto.'),
  });

  const createFolder = useMutation({
    mutationFn: (name: string) =>
      api.post(`/properties/${propertyId}/folders`, { name }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property-folders', propertyId] });
      setNewFolderName('');
      Alert.alert('Listo', 'Carpeta creada');
    },
    onError: () => Alert.alert('Error', 'No se pudo crear la carpeta'),
  });

  const deleteFolder = useMutation({
    mutationFn: (folderId: string) =>
      api.delete(`/properties/${propertyId}/folders/${folderId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['property-folders', propertyId] });
      qc.invalidateQueries({ queryKey: ['property-photos', propertyId] });
      Alert.alert('Listo', 'Carpeta eliminada');
    },
    onError: () => Alert.alert('Error', 'No se pudo eliminar la carpeta'),
  });

  const pickPhotos = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso necesario', 'Necesitamos acceso a tus fotos para subir imágenes.');
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
    Alert.alert('Eliminar foto', '¿Querés eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(photoId) },
    ]);

  const confirmDeleteFolder = (folder: Folder) =>
    Alert.alert('Eliminar carpeta', `¿Eliminar "${folder.name}"? Las fotos se conservarán.`, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteFolder.mutate(folder.id) },
    ]);

  const toggleTag = (tagId: string) => {
    setUploadTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
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
          {photos.length} foto{photos.length !== 1 ? 's' : ''}
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity
            style={styles.outlineBtn}
            onPress={() => setShowFolderModal(true)}
          >
            <Text style={styles.outlineBtnText}>Carpetas</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.addBtn, upload.isPending && styles.disabled]}
            onPress={pickPhotos}
            disabled={upload.isPending}
          >
            <Text style={styles.addBtnText}>
              {upload.isPending ? 'Subiendo...' : '+ Agregar'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Folder filters */}
      {folders.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 6, paddingRight: 20 }}>
            <TouchableOpacity
              style={[styles.folderChip, !activeFolder && styles.folderChipActive]}
              onPress={() => setActiveFolder('')}
            >
              <Text style={[styles.chipText, !activeFolder && styles.chipTextActive]}>
                Todas
              </Text>
            </TouchableOpacity>
            {folders.map((f) => (
              <TouchableOpacity
                key={f.id}
                style={[styles.folderChip, activeFolder === f.id && styles.folderChipActive]}
                onPress={() => setActiveFolder(f.id)}
              >
                <Text
                  style={[styles.chipText, activeFolder === f.id && styles.chipTextActive]}
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
          {activeFolder ? 'Sin fotos en esta carpeta.' : 'Sin fotos cargadas.'}
        </Text>
      ) : (
        <View style={styles.grid}>
          {photos.map((p) => (
            <View key={p.id} style={[styles.cell, { width: cellSize, height: cellSize }]}>
              <Image
                source={{ uri: `${baseUrl}${p.thumbnailUrl ?? p.fileUrl}` }}
                style={styles.img}
                contentFit="cover"
              />
              {p.tags?.length > 0 && (
                <View style={styles.tagOverlay}>
                  {p.tags.slice(0, 2).map((t) => (
                    <Text key={t.tag.id} style={styles.tagLabel}>
                      {t.tag.name}
                    </Text>
                  ))}
                </View>
              )}
              <TouchableOpacity style={styles.delBtn} onPress={() => confirmDelete(p.id)}>
                <Text style={styles.delBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
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
            <Text style={styles.modalTitle}>Opciones de subida</Text>

            <Text style={styles.modalLabel}>Carpeta</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                <TouchableOpacity
                  style={[styles.chip, !uploadFolder && styles.chipActive]}
                  onPress={() => setUploadFolder('')}
                >
                  <Text style={[styles.chipText, !uploadFolder && styles.chipTextActive]}>
                    Sin carpeta
                  </Text>
                </TouchableOpacity>
                {folders.map((f) => (
                  <TouchableOpacity
                    key={f.id}
                    style={[styles.chip, uploadFolder === f.id && styles.chipActive]}
                    onPress={() => setUploadFolder(f.id)}
                  >
                    <Text style={[styles.chipText, uploadFolder === f.id && styles.chipTextActive]}>
                      {f.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.modalLabel}>Etiquetas</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 24 }}>
              {tags.map((t) => (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.chip,
                    uploadTags.includes(t.id) && {
                      backgroundColor: t.color || '#6b5b45',
                    },
                  ]}
                  onPress={() => toggleTag(t.id)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      uploadTags.includes(t.id) && styles.chipTextActive,
                    ]}
                  >
                    {t.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => setShowUploadModal(false)}
            >
              <Text style={styles.primaryBtnText}>Listo</Text>
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
            <Text style={styles.modalTitle}>Carpetas</Text>

            {folders.length === 0 ? (
              <Text style={{ textAlign: 'center', color: '#aaa', marginVertical: 20 }}>
                Sin carpetas aún
              </Text>
            ) : (
              folders.map((f) => (
                <View key={f.id} style={styles.folderRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.folderName}>{f.name}</Text>
                    <Text style={styles.folderCount}>
                      {f._count?.photos ?? 0} fotos
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.dangerBtn}
                    onPress={() => confirmDeleteFolder(f)}
                  >
                    <Text style={styles.dangerBtnText}>Eliminar</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <View style={{ flexDirection: 'row', gap: 8, marginTop: 16 }}>
              <TextInput
                style={styles.input}
                placeholder="Nombre de la carpeta"
                placeholderTextColor="#bbb"
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
                <Text style={styles.primaryBtnText}>Crear</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.outlineBtn, { marginTop: 12 }]}
              onPress={() => setShowFolderModal(false)}
            >
              <Text style={styles.outlineBtnText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: SIDE },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  count: { fontSize: 14, fontWeight: '700', color: '#2d2d2d' },
  addBtn: {
    backgroundColor: '#6b5b45',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  outlineBtn: {
    borderWidth: 1.5,
    borderColor: '#e0dbd4',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  outlineBtnText: { color: '#6b5b45', fontSize: 12, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  empty: { textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#f0ede6' },
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
  folderChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0ede6',
  },
  folderChipActive: { backgroundColor: '#6b5b45' },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f0ede6',
  },
  chipActive: { backgroundColor: '#6b5b45' },
  chipText: { fontSize: 13, color: '#666', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#2d2d2d', marginBottom: 16 },
  modalLabel: { fontSize: 13, fontWeight: '700', color: '#555', marginBottom: 8 },
  folderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0ede6',
  },
  folderName: { fontSize: 15, fontWeight: '600', color: '#2d2d2d' },
  folderCount: { fontSize: 12, color: '#aaa', marginTop: 2 },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#e0dbd4',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#2d2d2d',
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
