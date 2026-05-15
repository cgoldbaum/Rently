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
} from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../src/lib/api';
import { claimSchema } from '@rently/shared';

type Claim = {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#f59e0b',
  IN_PROGRESS: '#3b82f6',
  RESOLVED: '#22c55e',
};

export default function TenantClaimsScreen() {
  const qc = useQueryClient();
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const { data, isLoading } = useQuery<Claim[]>({
    queryKey: ['tenant-claims'],
    queryFn: () => api.get('/tenant/claims').then((r) => r.data.data),
  });

  const { mutate: createClaim, isPending } = useMutation({
    mutationFn: (body: { title: string; description: string }) =>
      api.post('/tenant/claims', body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tenant-claims'] });
      setModalVisible(false);
      setTitle('');
      setDescription('');
    },
    onError: () => Alert.alert('Error', 'No se pudo crear el reclamo.'),
  });

  const handleSubmit = () => {
    const result = claimSchema.safeParse({ title, description });
    if (!result.success) {
      Alert.alert('Error', result.error.issues[0].message);
      return;
    }
    createClaim(result.data);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Reclamos</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.addButtonText}>+ Nuevo</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <Text style={styles.loading}>Cargando...</Text>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.row}>
                <Text style={styles.claimTitle} numberOfLines={1}>{item.title}</Text>
                <View style={[styles.badge, { backgroundColor: STATUS_COLORS[item.status] ?? '#aaa' }]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>
              <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
            </View>
          )}
        />
      )}

      <Modal visible={modalVisible} animationType="slide" presentationStyle="pageSheet">
        <View style={styles.modal}>
          <Text style={styles.modalTitle}>Nuevo reclamo</Text>
          <TextInput
            style={styles.input}
            placeholder="Título"
            placeholderTextColor="#aaa"
            value={title}
            onChangeText={setTitle}
          />
          <TextInput
            style={[styles.input, styles.textarea]}
            placeholder="Descripción del problema..."
            placeholderTextColor="#aaa"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={5}
          />
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={isPending}>
            <Text style={styles.submitText}>{isPending ? 'Enviando...' : 'Enviar reclamo'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={() => setModalVisible(false)}>
            <Text style={styles.cancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#faf8f5', paddingTop: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', color: '#2d2d2d' },
  addButton: { backgroundColor: '#6b5b45', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
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
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  claimTitle: { fontSize: 15, fontWeight: '700', color: '#2d2d2d', flex: 1 },
  description: { fontSize: 13, color: '#555', marginTop: 8, lineHeight: 18 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  modal: { flex: 1, padding: 24, backgroundColor: '#faf8f5' },
  modalTitle: { fontSize: 24, fontWeight: '800', color: '#2d2d2d', marginBottom: 20, marginTop: 20 },
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
  submitButton: { backgroundColor: '#6b5b45', borderRadius: 14, padding: 18, alignItems: 'center' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelButton: { marginTop: 12, padding: 16, alignItems: 'center' },
  cancelText: { color: '#888', fontSize: 16 },
});
