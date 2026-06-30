import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, Alert } from 'react-native';
import { useMutation } from '@tanstack/react-query';
import { paymentSchema, getFieldErrors } from '@rently/shared';
import { api } from '../lib/api';
import { dmyToIso } from '../lib/dates';
import { chipStyles, borderedChipStyles, modalFormStyles } from '../styles/shared';

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
      dueDate: dmyToIso(dueDate),
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
          <View style={chipStyles.row}>
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

          <Text style={styles.label}>Vencimiento (DD/MM/AAAA) *</Text>
          <TextInput
            style={[styles.input, errors.dueDate && styles.inputError]}
            value={dueDate}
            onChangeText={setDueDate}
            placeholder="10/05/2026"
            placeholderTextColor="#aaa"
          />
          {errors.dueDate ? <Text style={styles.err}>{errors.dueDate}</Text> : null}

          <Text style={styles.label}>Método</Text>
          <View style={chipStyles.row}>
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

const styles = { ...modalFormStyles, ...borderedChipStyles, title: { ...modalFormStyles.title, marginBottom: 6 }, actions: { ...modalFormStyles.actions, marginTop: 18 } };
