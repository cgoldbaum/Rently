import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Switch,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { profileSchema, getFieldErrors } from '@rently/shared';
import { useAuthStore } from '../store/auth';
import { api } from '../lib/api';
import { syncStorage } from '../storage';

const NOTIFICATION_ITEMS = [
  'Pago recibido',
  'Pago en mora',
  'Nuevo reclamo',
  'Ajuste aplicado',
  'Vencimiento de contrato',
];

type Me = { id: string; name: string; email: string; phone?: string; role: 'OWNER' | 'TENANT' };

type ApiError = { response?: { data?: { error?: { message?: string } } } };

export function SettingsScreen() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notifications, setNotifications] = useState([true, true, true, true, false]);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState('');

  const meQuery = useQuery<Me>({
    queryKey: ['auth-me'],
    queryFn: () => api.get('/auth/me').then((r) => r.data.data ?? r.data),
  });

  // Sync the form with the fetched profile once it loads.
  useEffect(() => {
    if (meQuery.data) {
      setName(meQuery.data.name ?? '');
      setEmail(meQuery.data.email ?? '');
      setPhone(meQuery.data.phone ?? '');
    }
  }, [meQuery.data]);

  const saveProfile = useMutation({
    mutationFn: (body: { name: string; phone: string }) => api.patch('/auth/me', body),
    onSuccess: () => {
      if (user) setUser({ ...user, name });
      Alert.alert('Listo', 'Perfil actualizado.');
    },
    onError: (err) => {
      const msg = (err as ApiError).response?.data?.error?.message;
      Alert.alert('Error', msg ?? 'No se pudo guardar el perfil.');
    },
  });

  const deleteAccount = useMutation({
    mutationFn: () => api.delete('/auth/me'),
    onSuccess: () => {
      clearAuth();
      router.replace('/(auth)/login');
    },
    onError: () => Alert.alert('Error', 'No se pudo eliminar la cuenta.'),
  });

  const handleSave = () => {
    const parsed = profileSchema.safeParse({ name, phone });
    if (!parsed.success) {
      setFieldErrors(getFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});
    saveProfile.mutate({ name: parsed.data.name, phone: parsed.data.phone });
  };

  const handleLogout = () => {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión',
        style: 'destructive',
        onPress: async () => {
          const refreshToken = syncStorage.getItem('refreshToken');
          try {
            await api.post('/auth/logout', refreshToken ? { refreshToken } : {});
          } catch {
            // Ignore — local session is cleared regardless.
          }
          clearAuth();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const toggleNotification = (i: number) =>
    setNotifications((prev) => prev.map((v, idx) => (idx === i ? !v : v)));

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.titleRow}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Ajustes</Text>
        </View>

        {/* Perfil */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Perfil</Text>

          <Text style={styles.label}>Nombre</Text>
          <TextInput
            style={[styles.input, fieldErrors.name && styles.inputError]}
            value={name}
            onChangeText={(v) => {
              setName(v);
              setFieldErrors((p) => ({ ...p, name: '' }));
            }}
            placeholder="Tu nombre"
            placeholderTextColor="#aaa"
          />
          {fieldErrors.name ? <Text style={styles.errorText}>{fieldErrors.name}</Text> : null}

          <Text style={styles.label}>Email</Text>
          <TextInput style={[styles.input, styles.inputDisabled]} value={email} editable={false} />

          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={[styles.input, fieldErrors.phone && styles.inputError]}
            value={phone}
            onChangeText={(v) => {
              setPhone(v);
              setFieldErrors((p) => ({ ...p, phone: '' }));
            }}
            placeholder="+54 11 0000-0000"
            placeholderTextColor="#aaa"
            keyboardType="phone-pad"
          />
          {fieldErrors.phone ? <Text style={styles.errorText}>{fieldErrors.phone}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, (saveProfile.isPending || meQuery.isLoading) && styles.btnDisabled]}
            onPress={handleSave}
            disabled={saveProfile.isPending || meQuery.isLoading}
          >
            <Text style={styles.primaryBtnText}>
              {saveProfile.isPending ? 'Guardando...' : 'Guardar cambios'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Suscripción (solo propietario) */}
        {user?.role === 'OWNER' ? (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Suscripción</Text>
            <View style={styles.planBox}>
              <View>
                <Text style={styles.planName}>Plan Pro</Text>
                <Text style={styles.planDesc}>4–10 propiedades</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={styles.planPrice}>USD 20</Text>
                <Text style={styles.planPer}>/ mes</Text>
              </View>
            </View>
            <Text style={styles.planNote}>
              Ahorro estimado vs. inmobiliaria: <Text style={styles.planSaving}>USD 160/mes</Text>
            </Text>
          </View>
        ) : null}

        {/* Notificaciones */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Notificaciones</Text>
          {NOTIFICATION_ITEMS.map((item, i) => (
            <View
              key={item}
              style={[styles.notifRow, i < NOTIFICATION_ITEMS.length - 1 && styles.notifRowBorder]}
            >
              <Text style={styles.notifText}>{item}</Text>
              <Switch
                value={notifications[i]}
                onValueChange={() => toggleNotification(i)}
                trackColor={{ true: '#6b5b45', false: '#e0dbd4' }}
                thumbColor="#fff"
              />
            </View>
          ))}
        </View>

        {/* Eliminar cuenta */}
        <View style={[styles.card, styles.dangerCard]}>
          <Text style={styles.dangerTitle}>Eliminar cuenta</Text>
          <Text style={styles.dangerDesc}>
            Se eliminarán permanentemente tu cuenta y todos los datos asociados.
          </Text>
          <TouchableOpacity
            style={styles.dangerBtn}
            onPress={() => {
              setDeleteConfirm('');
              setShowDelete(true);
            }}
          >
            <Text style={styles.dangerBtnText}>Eliminar cuenta</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal eliminar cuenta */}
      <Modal visible={showDelete} transparent animationType="fade" onRequestClose={() => setShowDelete(false)}>
        <View style={styles.overlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Eliminar cuenta</Text>
            <Text style={styles.modalText}>
              Esta acción es irreversible. Se borrarán todos tus datos.
            </Text>
            <Text style={styles.label}>
              Escribí ELIMINAR para confirmar
            </Text>
            <TextInput
              style={styles.input}
              value={deleteConfirm}
              onChangeText={setDeleteConfirm}
              placeholder="ELIMINAR"
              placeholderTextColor="#aaa"
              autoCapitalize="characters"
            />
            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setShowDelete(false)}>
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalDelete,
                  (deleteConfirm !== 'ELIMINAR' || deleteAccount.isPending) && styles.btnDisabled,
                ]}
                disabled={deleteConfirm !== 'ELIMINAR' || deleteAccount.isPending}
                onPress={() => deleteAccount.mutate()}
              >
                <Text style={styles.modalDeleteText}>
                  {deleteAccount.isPending ? 'Eliminando...' : 'Eliminar'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {meQuery.isLoading ? (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator color="#6b5b45" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#faf8f5' },
  content: { padding: 20, paddingTop: 60, paddingBottom: 40 },

  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f0ede6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: 20, color: '#6b5b45', fontWeight: '700' },
  title: { fontSize: 26, fontWeight: '800', color: '#2d2d2d' },

  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 18,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#2d2d2d', marginBottom: 12 },

  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e0dbd4',
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#2d2d2d',
    backgroundColor: '#faf8f5',
  },
  inputDisabled: { color: '#aaa', backgroundColor: '#f3f0ea' },
  inputError: { borderColor: '#ef4444' },
  errorText: { fontSize: 12, color: '#ef4444', marginTop: 4 },

  primaryBtn: {
    marginTop: 18,
    backgroundColor: '#6b5b45',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },

  planBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f0ede6',
    borderRadius: 12,
    padding: 16,
  },
  planName: { fontSize: 16, fontWeight: '800', color: '#2d2d2d' },
  planDesc: { fontSize: 13, color: '#888', marginTop: 2 },
  planPrice: { fontSize: 20, fontWeight: '800', color: '#6b5b45' },
  planPer: { fontSize: 12, color: '#aaa' },
  planNote: { fontSize: 13, color: '#888', marginTop: 12 },
  planSaving: { color: '#16a34a', fontWeight: '700' },

  notifRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  notifRowBorder: { borderBottomWidth: 1, borderBottomColor: '#f0ebe4' },
  notifText: { fontSize: 14, color: '#2d2d2d' },

  dangerCard: { borderWidth: 1, borderColor: '#fecaca' },
  dangerTitle: { fontSize: 15, fontWeight: '800', color: '#ef4444' },
  dangerDesc: { fontSize: 13, color: '#888', marginTop: 6, lineHeight: 19 },
  dangerBtn: {
    marginTop: 14,
    backgroundColor: '#fee2e2',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  dangerBtnText: { color: '#ef4444', fontSize: 14, fontWeight: '700' },

  logoutBtn: {
    backgroundColor: '#f0ede6',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  logoutText: { color: '#6b5b45', fontSize: 15, fontWeight: '700' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: '#fff', borderRadius: 16, padding: 22 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#ef4444' },
  modalText: { fontSize: 14, color: '#666', marginTop: 8, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancel: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#f0ede6',
    alignItems: 'center',
  },
  modalCancelText: { color: '#888', fontSize: 14, fontWeight: '700' },
  modalDelete: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  modalDeleteText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  loadingOverlay: {
    position: 'absolute',
    top: 60,
    right: 24,
  },
});
