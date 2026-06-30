import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { tenantSchema, getFieldErrors } from '@rently/shared';
import { api } from '../lib/api';

type ApiError = { response?: { data?: { error?: { message?: string } } } };

export function TenantFormModal({
  visible,
  contractId,
  onClose,
  onSaved,
}: {
  visible: boolean;
  contractId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    setName('');
    setEmail('');
    setPhone('');
    setErrors({});
  }, [visible]);

  const save = useMutation({
    mutationFn: (body: { name: string; email: string; phone: string }) =>
      api.post(`/contracts/${contractId}/tenant`, body),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err) => {
      const msg = (err as ApiError).response?.data?.error?.message;
      Alert.alert('Error', msg ?? 'No se pudo vincular el inquilino.');
    },
  });

  const handleSave = () => {
    const parsed = tenantSchema.safeParse({ name, email, phone });
    if (!parsed.success) {
      setErrors(getFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate({ name, email, phone });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Vincular inquilino</Text>

          <Text style={styles.label}>Nombre *</Text>
          <TextInput
            style={[styles.input, errors.name && styles.inputError]}
            value={name}
            onChangeText={setName}
            placeholder="Nombre completo"
            placeholderTextColor="#aaa"
          />
          {errors.name ? <Text style={styles.err}>{errors.name}</Text> : null}

          <Text style={styles.label}>Email *</Text>
          <TextInput
            style={[styles.input, errors.email && styles.inputError]}
            value={email}
            onChangeText={setEmail}
            placeholder="inquilino@email.com"
            placeholderTextColor="#aaa"
            autoCapitalize="none"
            keyboardType="email-address"
          />
          {errors.email ? <Text style={styles.err}>{errors.email}</Text> : null}

          <Text style={styles.label}>Teléfono</Text>
          <TextInput
            style={[styles.input, errors.phone && styles.inputError]}
            value={phone}
            onChangeText={setPhone}
            placeholder="+54 11 0000-0000"
            placeholderTextColor="#aaa"
            keyboardType="phone-pad"
          />
          {errors.phone ? <Text style={styles.err}>{errors.phone}</Text> : null}

          <Text style={styles.hint}>
            Se le enviará un acceso al inquilino con este email para que use el portal.
          </Text>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirm, save.isPending && styles.disabled]}
              onPress={handleSave}
              disabled={save.isPending}
            >
              <Text style={styles.confirmText}>{save.isPending ? 'Vinculando...' : 'Vincular'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#faf8f5',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 22,
  },
  title: { fontSize: 20, fontWeight: '800', color: '#2d2d2d', marginBottom: 8 },
  label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e0dbd4',
    borderRadius: 12,
    padding: 13,
    fontSize: 15,
    color: '#2d2d2d',
    backgroundColor: '#fff',
  },
  inputError: { borderColor: '#ef4444' },
  err: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  hint: { fontSize: 12, color: '#888', marginTop: 14, lineHeight: 17 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  cancel: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f0ede6',
    alignItems: 'center',
  },
  cancelText: { color: '#888', fontSize: 15, fontWeight: '700' },
  confirm: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#6b5b45',
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  disabled: { opacity: 0.5 },
});
