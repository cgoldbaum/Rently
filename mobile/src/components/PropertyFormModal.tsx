import { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
} from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { propertySchema, getFieldErrors } from '@rently/shared';
import { api } from '../lib/api';

export type PropertyInput = {
  id: string;
  name?: string;
  address: string;
  country?: string;
  type: string;
  surface: number;
  antiquity?: number;
  description?: string;
};

const COUNTRIES: [string, string][] = [
  ['AR', '🇦🇷 Argentina'],
  ['CL', '🇨🇱 Chile'],
  ['CO', '🇨🇴 Colombia'],
  ['UY', '🇺🇾 Uruguay'],
];

const TYPES: [string, string][] = [
  ['APARTMENT', 'Departamento'],
  ['HOUSE', 'Casa'],
  ['COMMERCIAL', 'Comercial'],
  ['PH', 'PH'],
];

type ApiError = { response?: { data?: { error?: { message?: string } } } };

export function PropertyFormModal({
  visible,
  property,
  onClose,
  onSaved,
}: {
  visible: boolean;
  property: PropertyInput | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!property;
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [country, setCountry] = useState('AR');
  const [type, setType] = useState('APARTMENT');
  const [surface, setSurface] = useState('');
  const [antiquity, setAntiquity] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Reset / hydrate the form whenever the modal opens.
  useEffect(() => {
    if (!visible) return;
    setName(property?.name ?? '');
    setAddress(property?.address ?? '');
    setCountry(property?.country ?? 'AR');
    setType(property?.type ?? 'APARTMENT');
    setSurface(property?.surface != null ? String(property.surface) : '');
    setAntiquity(property?.antiquity != null ? String(property.antiquity) : '');
    setDescription(property?.description ?? '');
    setErrors({});
  }, [visible, property]);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      isEdit
        ? api.patch(`/properties/${property!.id}`, body)
        : api.post('/properties', body),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err) => {
      const msg = (err as ApiError).response?.data?.error?.message;
      Alert.alert('Error', msg ?? 'No se pudo guardar la propiedad.');
    },
  });

  const handleSave = () => {
    const parsed = propertySchema.safeParse({
      name,
      address,
      country,
      type,
      surface,
      antiquity: antiquity || undefined,
      description,
    });
    if (!parsed.success) {
      setErrors(getFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate({
      name: name || undefined,
      address,
      country,
      type,
      surface: parseFloat(surface),
      antiquity: antiquity ? parseInt(antiquity, 10) : undefined,
      description: description || undefined,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{isEdit ? 'Editar propiedad' : 'Nueva propiedad'}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
            <Text style={styles.label}>Nombre / Identificador</Text>
            <TextInput
              style={[styles.input, errors.name && styles.inputError]}
              value={name}
              onChangeText={setName}
              placeholder="Ej: Depto 3A - Palermo"
              placeholderTextColor="#aaa"
            />
            {errors.name ? <Text style={styles.err}>{errors.name}</Text> : null}

            <Text style={styles.label}>Dirección *</Text>
            <TextInput
              style={[styles.input, errors.address && styles.inputError]}
              value={address}
              onChangeText={setAddress}
              placeholder="Ej: Thames 1842, CABA"
              placeholderTextColor="#aaa"
            />
            {errors.address ? <Text style={styles.err}>{errors.address}</Text> : null}

            <Text style={styles.label}>País *</Text>
            <View style={styles.chipRow}>
              {COUNTRIES.map(([val, lbl]) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.chip, country === val && styles.chipActive]}
                  onPress={() => setCountry(val)}
                >
                  <Text style={[styles.chipText, country === val && styles.chipTextActive]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Tipo *</Text>
            <View style={styles.chipRow}>
              {TYPES.map(([val, lbl]) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.chip, type === val && styles.chipActive]}
                  onPress={() => setType(val)}
                >
                  <Text style={[styles.chipText, type === val && styles.chipTextActive]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Superficie (m²) *</Text>
            <TextInput
              style={[styles.input, errors.surface && styles.inputError]}
              value={surface}
              onChangeText={setSurface}
              placeholder="58"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
            />
            {errors.surface ? <Text style={styles.err}>{errors.surface}</Text> : null}

            <Text style={styles.label}>Antigüedad (años)</Text>
            <TextInput
              style={[styles.input, errors.antiquity && styles.inputError]}
              value={antiquity}
              onChangeText={setAntiquity}
              placeholder="10"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
            />
            {errors.antiquity ? <Text style={styles.err}>{errors.antiquity}</Text> : null}

            <Text style={styles.label}>Descripción</Text>
            <TextInput
              style={[styles.input, styles.textarea, errors.description && styles.inputError]}
              value={description}
              onChangeText={setDescription}
              placeholder="Detalles del inmueble..."
              placeholderTextColor="#aaa"
              multiline
            />
            {errors.description ? <Text style={styles.err}>{errors.description}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirm, save.isPending && styles.disabled]}
              onPress={handleSave}
              disabled={save.isPending}
            >
              <Text style={styles.confirmText}>
                {save.isPending ? 'Guardando...' : isEdit ? 'Guardar' : 'Crear'}
              </Text>
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
    maxHeight: '90%',
  },
  scroll: { marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '800', color: '#2d2d2d', marginBottom: 14 },
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
  textarea: { minHeight: 70, textAlignVertical: 'top' },
  inputError: { borderColor: '#ef4444' },
  err: { fontSize: 12, color: '#ef4444', marginTop: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#e0dbd4',
    backgroundColor: '#fff',
  },
  chipActive: { borderColor: '#6b5b45', backgroundColor: '#f0ede6' },
  chipText: { fontSize: 13, color: '#888', fontWeight: '600' },
  chipTextActive: { color: '#6b5b45' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 12 },
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
