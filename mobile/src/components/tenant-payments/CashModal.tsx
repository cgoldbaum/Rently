import { View, Text, TextInput, TouchableOpacity, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@rently/shared';
import { useTenantPaymentsStyles } from './styles';
import { useThemeColors } from '../../theme/useThemeColors';
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
  const { t } = useTranslation('payments');
  const styles = useTenantPaymentsStyles();
  const colors = useThemeColors();
  return (
    <Modal visible={!!payment} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t('cash.title')}</Text>
          {payment ? (
            <Text style={styles.modalSub}>
              {payment.period} · {formatMoney(payment.amount, payment.currency ?? 'ARS')}
            </Text>
          ) : null}
          <Text style={styles.modalLabel}>{t('cash.note')}</Text>
          <TextInput
            style={styles.textarea}
            placeholder={t('cash.notePlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={onNoteChange}
            multiline
          />
          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
              <Text style={styles.modalCancelText}>{t('cash.close')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirm} disabled={saving} onPress={onConfirm}>
              <Text style={styles.modalConfirmText}>
                {saving ? t('cash.submitting') : t('cash.submit')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
