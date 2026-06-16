import { View, Text, TextInput, TouchableOpacity, Modal } from 'react-native';
import { formatMoney } from '@rently/shared';
import { styles } from './styles';
import type { Payment } from './types';

type Props = {
  payment: Payment | null;
  note: string;
  onNoteChange: (note: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
};

export function CashModal({ payment, note, onNoteChange, onCancel, onConfirm, saving }: Props) {
  return (
    <Modal visible={!!payment} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Registrar pago en efectivo</Text>
          {payment ? (
            <Text style={styles.modalSub}>
              {payment.period} · {formatMoney(payment.amount, payment.currency ?? 'ARS')}
            </Text>
          ) : null}
          <Text style={styles.modalLabel}>Nota (opcional)</Text>
          <TextInput
            style={styles.textarea}
            placeholder="Ej: Lo coordiné por WhatsApp con el propietario"
            placeholderTextColor="#aaa"
            value={note}
            onChangeText={onNoteChange}
            multiline
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirm} disabled={saving} onPress={onConfirm}>
              <Text style={styles.modalConfirmText}>
                {saving ? 'Avisando...' : 'Avisar pago'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
