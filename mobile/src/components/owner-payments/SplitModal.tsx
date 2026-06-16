import { View, Text, TouchableOpacity, Modal, TextInput } from 'react-native';
import { formatMoney } from '@rently/shared';
import { styles } from './styles';
import { INSTALLMENT_COUNTS } from './constants';
import type { Payment } from './types';

type Props = {
  payment: Payment | null;
  splitCount: number;
  splitDates: string[];
  onCountChange: (count: number) => void;
  onDateChange: (index: number, value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
};

export function SplitModal({
  payment,
  splitCount,
  splitDates,
  onCountChange,
  onDateChange,
  onCancel,
  onConfirm,
  saving,
}: Props) {
  return (
    <Modal visible={!!payment} transparent animationType="slide" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Pago en cuotas</Text>
          {payment ? (
            <>
              <Text style={styles.modalSub}>
                {payment.contract.property.name ?? payment.contract.property.address}
              </Text>
              <Text style={styles.modalAmount}>
                {formatMoney(payment.amount, payment.currency ?? 'USD')}
              </Text>
              <Text style={styles.modalPeriod}>Período {payment.period}</Text>

              <Text style={styles.modalLabel}>Número de cuotas</Text>
              <View style={styles.methodRow}>
                {INSTALLMENT_COUNTS.map((n) => (
                  <TouchableOpacity
                    key={n}
                    style={[styles.methodBtn, splitCount === n && styles.methodBtnActive]}
                    onPress={() => onCountChange(n)}
                  >
                    <Text style={[styles.methodText, splitCount === n && styles.methodTextActive]}>
                      {n}x
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.splitAmountHint}>
                {formatMoney(
                  Math.round((payment.amount / splitCount) * 100) / 100,
                  payment.currency ?? 'USD'
                )}{' '}
                por cuota
              </Text>

              <Text style={styles.modalLabel}>Fechas de vencimiento</Text>
              {Array.from({ length: splitCount }).map((_, i) => (
                <View key={i} style={styles.dateInputRow}>
                  <Text style={styles.dateInputLabel}>Cuota {i + 1}</Text>
                  <TextInput
                    style={[styles.dateInput]}
                    value={splitDates[i] ?? ''}
                    onChangeText={(v) => onDateChange(i, v)}
                    placeholder="DD/MM/AAAA"
                    keyboardType="numbers-and-punctuation"
                  />
                </View>
              ))}

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
                  <Text style={styles.modalCancelText}>Cancelar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirm} onPress={onConfirm} disabled={saving}>
                  <Text style={styles.modalConfirmText}>
                    {saving ? 'Guardando...' : 'Confirmar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}
