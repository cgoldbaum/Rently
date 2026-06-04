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
import { contractSchema, getFieldErrors } from '@rently/shared';
import { api } from '../lib/api';

export type ContractInput = {
  id: string;
  startDate: string;
  endDate: string;
  initialAmount: number;
  currency?: 'ARS' | 'USD';
  paymentDay: number;
  indexType: string;
  adjustFrequency: number;
};

const INDEX_BY_COUNTRY: Record<string, [string, string][]> = {
  AR: [
    ['IPC', 'IPC (INDEC)'],
    ['ICL', 'ICL (BCRA)'],
    ['MANUAL', 'Manual'],
  ],
  CL: [
    ['IPC', 'IPC (Banco Central)'],
    ['MANUAL', 'Manual'],
  ],
  CO: [
    ['IPC', 'IPC (DANE)'],
    ['MANUAL', 'Manual'],
  ],
  UY: [
    ['IPC', 'IPC (INE)'],
    ['MANUAL', 'Manual'],
  ],
};

type ApiError = { response?: { data?: { error?: { message?: string } } } };

export function ContractFormModal({
  visible,
  propertyId,
  country = 'AR',
  contract,
  onClose,
  onSaved,
}: {
  visible: boolean;
  propertyId: string;
  country?: string;
  contract: ContractInput | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!contract;
  const indices = INDEX_BY_COUNTRY[country] ?? INDEX_BY_COUNTRY.AR;

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [initialAmount, setInitialAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>('USD');
  const [paymentDay, setPaymentDay] = useState('1');
  const [indexType, setIndexType] = useState('IPC');
  const [adjustFrequency, setAdjustFrequency] = useState('3');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    setStartDate(contract?.startDate?.slice(0, 10) ?? '');
    setEndDate(contract?.endDate?.slice(0, 10) ?? '');
    setInitialAmount(contract ? String(contract.initialAmount) : '');
    setCurrency(contract?.currency ?? 'USD');
    setPaymentDay(contract ? String(contract.paymentDay) : '1');
    setIndexType(contract?.indexType ?? indices[0][0]);
    setAdjustFrequency(contract ? String(contract.adjustFrequency || 3) : '3');
    setErrors({});
  }, [visible, contract?.id]);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      isEdit
        ? api.patch(`/properties/${propertyId}/contract`, body)
        : api.post(`/properties/${propertyId}/contract`, body),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err) => {
      const msg = (err as ApiError).response?.data?.error?.message;
      Alert.alert('Error', msg ?? 'No se pudo guardar el contrato.');
    },
  });

  const handleSave = () => {
    const parsed = contractSchema.safeParse({
      startDate,
      endDate,
      initialAmount,
      currency,
      paymentDay,
      indexType,
      adjustFrequency,
    });
    if (!parsed.success) {
      setErrors(getFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate({
      startDate: (() => { const [d, m, y] = startDate.split('/'); return new Date(`${y}-${m}-${d}`).toISOString(); })(),
      endDate: (() => { const [d, m, y] = endDate.split('/'); return new Date(`${y}-${m}-${d}`).toISOString(); })(),
      initialAmount: parseFloat(initialAmount),
      paymentDay: parseInt(paymentDay, 10),
      indexType,
      adjustFrequency: indexType === 'MANUAL' ? 0 : parseInt(adjustFrequency, 10),
      currency,
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>{isEdit ? 'Editar contrato' : 'Crear contrato'}</Text>
          <ScrollView keyboardShouldPersistTaps="handled" style={styles.scroll}>
            <Text style={styles.label}>Fecha de inicio *</Text>
            <TextInput
              style={[styles.input, errors.startDate && styles.inputError]}
              value={startDate}
              onChangeText={setStartDate}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#aaa"
            />
            {errors.startDate ? <Text style={styles.err}>{errors.startDate}</Text> : null}

            <Text style={styles.label}>Fecha de fin *</Text>
            <TextInput
              style={[styles.input, errors.endDate && styles.inputError]}
              value={endDate}
              onChangeText={setEndDate}
              placeholder="DD/MM/AAAA"
              placeholderTextColor="#aaa"
            />
            {errors.endDate ? <Text style={styles.err}>{errors.endDate}</Text> : null}

            <Text style={styles.label}>Moneda *</Text>
            <View style={styles.chipRow}>
              {(['ARS', 'USD'] as const).map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.chip, currency === c && styles.chipActive]}
                  onPress={() => setCurrency(c)}
                >
                  <Text style={[styles.chipText, currency === c && styles.chipTextActive]}>{c}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Monto inicial *</Text>
            <TextInput
              style={[styles.input, errors.initialAmount && styles.inputError]}
              value={initialAmount}
              onChangeText={setInitialAmount}
              placeholder="120000"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
            />
            {errors.initialAmount ? <Text style={styles.err}>{errors.initialAmount}</Text> : null}

            <Text style={styles.label}>Día de pago (1-28) *</Text>
            <TextInput
              style={[styles.input, errors.paymentDay && styles.inputError]}
              value={paymentDay}
              onChangeText={setPaymentDay}
              placeholder="10"
              placeholderTextColor="#aaa"
              keyboardType="numeric"
            />
            {errors.paymentDay ? <Text style={styles.err}>{errors.paymentDay}</Text> : null}

            <Text style={styles.label}>Índice de ajuste *</Text>
            <View style={styles.chipRow}>
              {indices.map(([val, lbl]) => (
                <TouchableOpacity
                  key={val}
                  style={[styles.chip, indexType === val && styles.chipActive]}
                  onPress={() => setIndexType(val)}
                >
                  <Text style={[styles.chipText, indexType === val && styles.chipTextActive]}>{lbl}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {errors.indexType ? <Text style={styles.err}>{errors.indexType}</Text> : null}

            {indexType !== 'MANUAL' ? (
              <>
                <Text style={styles.label}>Frecuencia de ajuste (meses) *</Text>
                <TextInput
                  style={[styles.input, errors.adjustFrequency && styles.inputError]}
                  value={adjustFrequency}
                  onChangeText={setAdjustFrequency}
                  placeholder="3"
                  placeholderTextColor="#aaa"
                  keyboardType="numeric"
                />
                {errors.adjustFrequency ? (
                  <Text style={styles.err}>{errors.adjustFrequency}</Text>
                ) : null}
              </>
            ) : null}
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
              <Text style={styles.confirmText}>{save.isPending ? 'Guardando...' : 'Guardar'}</Text>
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
