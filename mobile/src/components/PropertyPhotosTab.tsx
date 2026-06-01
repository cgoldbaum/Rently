import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

type Photo = { id: string; fileUrl: string; thumbnailUrl?: string };

const GAP = 10;
const COLS = 3;
const SIDE = 20;
const cellSize = (Dimensions.get('window').width - SIDE * 2 - GAP * (COLS - 1)) / COLS;

export function PropertyPhotosTab({ propertyId }: { propertyId: string }) {
  const qc = useQueryClient();
  const baseUrl = api.defaults.baseURL ?? '';

  const { data: photos = [], isLoading } = useQuery<Photo[]>({
    queryKey: ['property-photos', propertyId],
    queryFn: () => api.get(`/properties/${propertyId}/photos`).then((r) => r.data.data),
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
      const res = await api.post(`/properties/${propertyId}/photos`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['property-photos', propertyId] }),
    onError: () => Alert.alert('Error', 'No se pudieron subir las fotos.'),
  });

  const remove = useMutation({
    mutationFn: (photoId: string) =>
      api.delete(`/properties/${propertyId}/photos/${photoId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['property-photos', propertyId] }),
    onError: () => Alert.alert('Error', 'No se pudo eliminar la foto.'),
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
    upload.mutate(result.assets);
  };

  const confirmDelete = (photoId: string) =>
    Alert.alert('Eliminar foto', '¿Querés eliminar esta foto?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => remove.mutate(photoId) },
    ]);

  if (isLoading) {
    return <ActivityIndicator color="#6b5b45" style={{ marginTop: 30 }} />;
  }

  return (
    <View style={styles.section}>
      <View style={styles.headerRow}>
        <Text style={styles.count}>{photos.length} foto{photos.length !== 1 ? 's' : ''}</Text>
        <TouchableOpacity
          style={[styles.addBtn, upload.isPending && styles.disabled]}
          onPress={pickPhotos}
          disabled={upload.isPending}
        >
          <Text style={styles.addBtnText}>{upload.isPending ? 'Subiendo...' : '+ Agregar'}</Text>
        </TouchableOpacity>
      </View>

      {photos.length === 0 ? (
        <Text style={styles.empty}>Sin fotos cargadas.</Text>
      ) : (
        <View style={styles.grid}>
          {photos.map((p) => (
            <View key={p.id} style={[styles.cell, { width: cellSize, height: cellSize }]}>
              <Image
                source={{ uri: `${baseUrl}${p.thumbnailUrl ?? p.fileUrl}` }}
                style={styles.img}
                contentFit="cover"
              />
              <TouchableOpacity style={styles.delBtn} onPress={() => confirmDelete(p.id)}>
                <Text style={styles.delBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
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
  disabled: { opacity: 0.5 },
  empty: { textAlign: 'center', color: '#aaa', fontSize: 14, marginTop: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: { borderRadius: 10, overflow: 'hidden', backgroundColor: '#f0ede6' },
  img: { width: '100%', height: '100%' },
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
});
