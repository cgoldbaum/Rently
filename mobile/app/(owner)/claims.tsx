import { useState, useMemo, memo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../src/lib/api';

type ClaimHistory = {
  oldStatus: string;
  newStatus: string;
  comment?: string;
  photoUrl?: string;
  changedAt: string;
};

type Claim = {
  id: string;
  title?: string;
  category: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
  tenant: {
    name: string;
    contract: { property: { name?: string; address: string } };
  };
  history: ClaimHistory[];
};

type PhotoAsset = { uri: string; name: string; type: string };

const CAT_LABELS: Record<string, string> = {
  PLUMBING: 'Plomería',
  ELECTRICITY: 'Electricidad',
  STRUCTURE: 'Estructura',
  OTHER: 'Otro',
};

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string }> = {
  OPEN: { label: 'Abierto', color: '#dc2626', bg: '#fef2f2' },
  IN_PROGRESS: { label: 'En curso', color: '#d97706', bg: '#fffbeb' },
  RESOLVED: { label: 'Resuelto', color: '#16a34a', bg: '#f0fdf4' },
};

const PRIORITY_STYLE: Record<string, { label: string; color: string }> = {
  HIGH: { label: 'Urgente', color: '#dc2626' },
  MEDIUM: { label: 'Media', color: '#d97706' },
  LOW: { label: 'Baja', color: '#6b7280' },
};

const FILTERS = [
  { key: 'all', label: 'Todos' },
  { key: 'OPEN', label: 'Abiertos' },
  { key: 'IN_PROGRESS', label: 'En curso' },
  { key: 'RESOLVED', label: 'Resueltos' },
];

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function claimLabel(c: Claim) {
  return c.title ?? CAT_LABELS[c.category] ?? c.category;
}

const ClaimCard = memo(function ClaimCard({ item, onPress }: { item: Claim; onPress: () => void }) {
  const st = STATUS_STYLE[item.status] ?? STATUS_STYLE.OPEN;
  const pr = PRIORITY_STYLE[item.priority] ?? PRIORITY_STYLE.MEDIUM;
  const propName = item.tenant.contract.property.name ?? item.tenant.contract.property.address;
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardTop}>
        <Text style={styles.claimTitle} numberOfLines={1}>{claimLabel(item)}</Text>
        <View style={[styles.badge, { backgroundColor: st.bg }]}>
          <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>
      <Text style={styles.property}>{propName} · {item.tenant.name}</Text>
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      <View style={[styles.priorityTag, { backgroundColor: `${pr.color}18` }]}>
        <Text style={[styles.priorityText, { color: pr.color }]}>{pr.label}</Text>
      </View>
    </TouchableOpacity>
  );
});

export default function ClaimsScreen() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState<Claim | null>(null);
  const [resolveOpen, setResolveOpen] = useState(false);
  const [comment, setComment] = useState('');
  const [photo, setPhoto] = useState<PhotoAsset | null>(null);

  const { data: claims = [], isLoading } = useQuery<Claim[]>({
    queryKey: ['claims'],
    queryFn: () => api.get('/claims').then((r: { data: { data: Claim[] } }) => r.data.data),
  });

  const resolveMutation = useMutation({
    mutationFn: async ({
      id,
      comment,
      photo,
    }: {
      id: string;
      comment: string;
      photo: PhotoAsset | null;
    }) => {
      const form = new FormData();
      if (comment) form.append('comment', comment);
      if (photo) {
        form.append('photo', {
          uri: photo.uri,
          name: photo.name,
          type: photo.type,
        } as unknown as Blob);
      }
      const res = await api.patch(`/claims/${id}/resolve`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data.data as Claim;
    },
    onSuccess: (updated) => {
      qc.setQueryData<Claim[]>(['claims'], (prev) =>
        (prev ?? []).map((c) => (c.id === updated.id ? updated : c))
      );
      setSelected(updated);
      setResolveOpen(false);
      setComment('');
      setPhoto(null);
    },
    onError: () => Alert.alert('Error', 'No se pudo marcar el reclamo como resuelto.'),
  });

  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (!result.canceled && result.assets.length > 0) {
      const asset = result.assets[0];
      setPhoto({
        uri: asset.uri,
        name: asset.fileName ?? `foto-${Date.now()}.jpg`,
        type: asset.mimeType ?? 'image/jpeg',
      });
    }
  };

  const openDetail = (claim: Claim) => {
    setSelected(claim);
    setResolveOpen(false);
    setComment('');
    setPhoto(null);
  };

  const closeDetail = () => {
    setSelected(null);
    setResolveOpen(false);
  };

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const c of claims) {
      counts[c.status] = (counts[c.status] ?? 0) + 1;
    }
    return counts;
  }, [claims]);

  const filtered = filter === 'all' ? claims : claims.filter((c) => c.status === filter);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reclamos</Text>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersScroll}
        contentContainerStyle={styles.filters}
      >
        {FILTERS.map((f) => {
          const count = f.key === 'all' ? claims.length : (statusCounts[f.key] ?? 0);
          const active = filter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              activeOpacity={1}
              style={[styles.filterBtn, active && styles.filterBtnActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, active && styles.filterTextActive]}>
                {f.label}
              </Text>
              {f.key !== 'all' && (
                <View style={[styles.filterCount, active && styles.filterCountActive]}>
                  <Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>
                    {count}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {isLoading ? (
        <ActivityIndicator color="#6b5b45" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <Text style={styles.empty}>
          No hay reclamos{filter !== 'all' ? ' en este estado' : ''}.
        </Text>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          initialNumToRender={8}
          maxToRenderPerBatch={5}
          windowSize={7}
          removeClippedSubviews
          renderItem={({ item }) => <ClaimCard item={item} onPress={() => openDetail(item)} />}
        />
      )}

      {/* Modal de detalle */}
      <Modal
        visible={!!selected}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeDetail}
      >
        {selected && (
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.modalTitle} numberOfLines={2}>
                  {claimLabel(selected)}
                </Text>
                <Text style={styles.modalSub}>
                  {selected.tenant.contract.property.name ??
                    selected.tenant.contract.property.address}{' '}
                  · {selected.tenant.name}
                </Text>
              </View>
              <TouchableOpacity onPress={closeDetail} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              {/* Badges */}
              {(() => {
                const st = STATUS_STYLE[selected.status] ?? STATUS_STYLE.OPEN;
                const pr = PRIORITY_STYLE[selected.priority] ?? PRIORITY_STYLE.MEDIUM;
                return (
                  <View style={styles.badgeRow}>
                    <View style={[styles.badge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: `${pr.color}18` }]}>
                      <Text style={[styles.badgeText, { color: pr.color }]}>
                        Prioridad {pr.label}
                      </Text>
                    </View>
                  </View>
                );
              })()}

              {/* Descripción */}
              <Text style={styles.sectionLabel}>Descripción</Text>
              <Text style={styles.descriptionFull}>{selected.description}</Text>
              <Text style={styles.dateText}>Reportado el {fmtDate(selected.createdAt)}</Text>

              {/* Historial */}
              {selected.history.length > 0 && (
                <>
                  <Text style={styles.sectionLabel}>Historial</Text>
                  {selected.history.map((h, i) => {
                    const st = STATUS_STYLE[h.newStatus] ?? STATUS_STYLE.OPEN;
                    return (
                      <View key={i} style={styles.historyItem}>
                        <View style={styles.historyTop}>
                          <Text style={[styles.historyStatus, { color: st.color }]}>
                            {st.label}
                          </Text>
                          <Text style={styles.historyDate}>{fmtDate(h.changedAt)}</Text>
                        </View>
                        {h.comment ? (
                          <Text style={styles.historyComment}>{h.comment}</Text>
                        ) : null}
                        {h.photoUrl ? (
                          <Image
                            source={{ uri: `${api.defaults.baseURL}${h.photoUrl}` }}
                            style={styles.historyPhoto}
                            contentFit="cover"
                          />
                        ) : null}
                      </View>
                    );
                  })}
                </>
              )}

              {/* Botón resolver */}
              {selected.status !== 'RESOLVED' && !resolveOpen && (
                <TouchableOpacity
                  style={styles.resolveBtn}
                  onPress={() => {
                    setComment('');
                    setPhoto(null);
                    setResolveOpen(true);
                  }}
                >
                  <Text style={styles.resolveBtnText}>✓ Marcar como resuelto</Text>
                </TouchableOpacity>
              )}

              {/* Formulario de resolución */}
              {resolveOpen && (
                <View style={styles.resolveForm}>
                  <Text style={styles.resolveFormTitle}>Registrar resolución</Text>

                  <Text style={styles.inputLabel}>Comentario (opcional)</Text>
                  <TextInput
                    style={styles.textInput}
                    multiline
                    numberOfLines={3}
                    placeholder="Describí cómo se resolvió el problema..."
                    placeholderTextColor="#aaa"
                    value={comment}
                    onChangeText={setComment}
                    textAlignVertical="top"
                  />

                  <Text style={styles.inputLabel}>Foto (opcional)</Text>
                  <TouchableOpacity style={styles.photoPickerBtn} onPress={pickPhoto}>
                    <Text style={styles.photoPickerText}>
                      {photo ? '📷 Cambiar foto' : '📷 Adjuntar foto'}
                    </Text>
                  </TouchableOpacity>
                  {photo ? (
                    <Image
                      source={{ uri: photo.uri }}
                      style={styles.photoPreview}
                      contentFit="cover"
                    />
                  ) : null}

                  <View style={styles.formActions}>
                    <TouchableOpacity
                      style={[
                        styles.confirmBtn,
                        resolveMutation.isPending && styles.disabledBtn,
                      ]}
                      onPress={() =>
                        resolveMutation.mutate({ id: selected.id, comment, photo })
                      }
                      disabled={resolveMutation.isPending}
                    >
                      <Text style={styles.confirmBtnText}>
                        {resolveMutation.isPending ? 'Guardando...' : 'Confirmar resolución'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => setResolveOpen(false)}
                    >
                      <Text style={styles.cancelBtnText}>Cancelar</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5', paddingTop: 60 },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#2d2d2d',
    paddingHorizontal: 20,
    marginBottom: 12,
  },

  filtersScroll: { borderBottomWidth: 1, borderBottomColor: '#e0dbd4', marginBottom: 8 },
  filters: { paddingHorizontal: 16, gap: 8, paddingBottom: 10, flexDirection: 'row' },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e0dbd4',
    backgroundColor: '#fff',
  },
  filterBtnActive: { borderColor: '#6b5b45', backgroundColor: '#f5f1eb' },
  filterText: { fontSize: 13, fontWeight: '600', color: '#888' },
  filterTextActive: { color: '#6b5b45' },
  filterCount: {
    backgroundColor: '#f0ede6',
    borderRadius: 999,
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  filterCountActive: { backgroundColor: '#e0d8cc' },
  filterCountText: { fontSize: 11, fontWeight: '700', color: '#888' },
  filterCountTextActive: { color: '#6b5b45' },

  empty: { textAlign: 'center', color: '#aaa', marginTop: 40, fontSize: 14 },
  list: { paddingHorizontal: 20, gap: 12, paddingBottom: 20, paddingTop: 8 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  claimTitle: { fontSize: 15, fontWeight: '700', color: '#2d2d2d', flex: 1 },
  property: { fontSize: 13, color: '#888', marginTop: 4 },
  description: { fontSize: 13, color: '#555', marginTop: 8, lineHeight: 18 },
  priorityTag: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 10,
  },
  priorityText: { fontSize: 11, fontWeight: '700' },

  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },

  modal: { flex: 1, backgroundColor: '#faf8f5' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0dbd4',
    backgroundColor: '#fff',
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#2d2d2d' },
  modalSub: { fontSize: 13, color: '#888', marginTop: 3 },
  closeBtn: { padding: 4 },
  closeBtnText: { fontSize: 18, color: '#888' },
  modalBody: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },

  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#aaa',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 16,
  },
  descriptionFull: { fontSize: 14, color: '#555', lineHeight: 22 },
  dateText: { fontSize: 12, color: '#aaa', marginTop: 8 },

  historyItem: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  historyTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  historyStatus: { fontSize: 13, fontWeight: '700' },
  historyDate: { fontSize: 12, color: '#aaa' },
  historyComment: { fontSize: 13, color: '#555', lineHeight: 18, marginTop: 4 },
  historyPhoto: { width: '100%', height: 160, borderRadius: 8, marginTop: 8 },

  resolveBtn: {
    backgroundColor: '#6b5b45',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  resolveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

  resolveForm: {
    borderWidth: 1.5,
    borderColor: '#e0dbd4',
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    gap: 12,
  },
  resolveFormTitle: { fontSize: 15, fontWeight: '700', color: '#2d2d2d' },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#888' },
  textInput: {
    borderWidth: 1,
    borderColor: '#e0dbd4',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#2d2d2d',
    minHeight: 80,
    backgroundColor: '#fff',
  },
  photoPickerBtn: {
    borderWidth: 1.5,
    borderColor: '#e0dbd4',
    borderStyle: 'dashed',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f9f7f4',
  },
  photoPickerText: { fontSize: 14, color: '#888', fontWeight: '600' },
  photoPreview: { width: '100%', height: 160, borderRadius: 8, marginTop: 8 },
  formActions: { flexDirection: 'row', gap: 10 },
  confirmBtn: {
    flex: 1,
    backgroundColor: '#6b5b45',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledBtn: { opacity: 0.5 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e0dbd4',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  cancelBtnText: { color: '#6b5b45', fontWeight: '700', fontSize: 14 },
});
