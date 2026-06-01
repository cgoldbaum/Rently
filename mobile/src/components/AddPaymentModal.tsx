import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { paymentSchema, getFieldErrors } from '@rently/shared';
import { api } from '../lib/api';

const METHODS = ['Transferencia', 'Efectivo', 'Mercado Pago'];

type ApiError = { response?: { data?: { error?: { message?: string } } } };

export function AddPaymentModal({
  visible,
  contractId,
  defaultCurrency = 'USD',
  onClose,
  onSaved,
}: {
  visible: boolean;
  contractId: string;
  defaultCurrency?: 'ARS' | 'USD';
  onClose: () => void;
  onSaved: () => void;
}) {
  const [period, setPeriod] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState<'ARS' | 'USD'>(defaultCurrency);
  const [dueDate, setDueDate] = useState('');
  const [method, setMethod] = useState('Transferencia');
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    setPeriod('');
    setAmount('');
    setCurrency(defaultCurrency);
    setDueDate('');
    setMethod('Transferencia');
    setErrors({});
  }, [visible, defaultCurrency]);

  const save = useMutation({
    mutationFn: (body: Record<string, unknown>) =>
      api.post(`/contracts/${contractId}/payments`, body),
    onSuccess: () => {
      onSaved();
      onClose();
    },
    onError: (err) => {
      const msg = (err as ApiError).response?.data?.error?.message;
      Alert.alert('Error', msg ?? 'No se pudo registrar el cobro.');
    },
  });

  const handleSave = () => {
    const parsed = paymentSchema.safeParse({ period, amount, currency, dueDate, method });
    if (!parsed.success) {
      setErrors(getFieldErrors(parsed.error));
      return;
    }
    setErrors({});
    save.mutate({
      amount: parseFloat(amount),
      currency,
      period,
      dueDate: new Date(dueDate).toISOString(),
      method,
      status: 'PENDING',
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Registrar cobro</Text>

          <Text style={styles.label}>Período (AAAA-MM) *</Text>
          <TextInput
            style={[styles.input, errors.period && styles.inputError]}
            value={period}
            onChangeText={setPeriod}
            placeholder="2026-05"
            placeholderTextColor="#aaa"
          />
          {errors.period ? <Text style={styles.err}>{errors.period}</Text> : null}

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

          <Text style={styles.label}>Monto *</Text>
          <TextInput
            style={[styles.input, errors.amount && styles.inputError]}
            value={amount}
            onChangeText={setAmount}
            placeholder="120000"
            placeholderTextColor="#aaa"
            keyboardType="numeric"
          />
          {errors.amount ? <Text style={styles.err}>{errors.amount}</Text> : null}

          <Text style={styles.label}>Vencimiento (AAAA-MM-DD) *</Text>
          <TextInput
            style={[styles.input, errors.dueDate && styles.inputError]}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="2026-05-10"
            placeholderTextColor="#aaa"
          />
          {errors.dueDate ? <Text style={styles.err}>{errors.dueDate}</Text> : null}

          <Text style={styles.label}>Método</Text>
          <View style={styles.chipRow}>
            {METHODS.map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.chip, method === m && styles.chipActive]}
                onPress={() => setMethod(m)}
              >
                <Text style={[styles.chipText, method === m && styles.chipTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancel} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirm, save.isPending && styles.disabled]}
              onPress={handleSave}
              disabled={save.isPending}
            >
              <Text style={styles.confirmText}>{save.isPending ? 'Guardando...' : 'Registrar'}</Text>
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
  title: { fontSize: 20, fontWeight: '800', color: '#2d2d2d', marginBottom: 6 },
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
