import { View, Text, TouchableOpacity, Modal } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@rently/shared';
import { styles } from './styles';
import { METHODS } from './constants';
import type { Payment } from './types';

type Props = {
  payment: Payment | null;
  method: string;
  onSelectMethod: (method: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
};

export function MarkPaidModal({
  payment,
  method,
  onSelectMethod,
  onCancel,
  onConfirm,
  saving,
}: Props) {
  const { t } = useTranslation('payments');
  return (
    <Modal visible={!!payment} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t('markPaid.title')}</Text>
          {payment ? (
            <>
              <Text style={styles.modalSub}>
                {payment.contract.property.name ?? payment.contract.property.address}
              </Text>
              <Text style={styles.modalAmount}>
                {formatMoney(payment.amount, payment.currency ?? 'USD')}
              </Text>
              <Text style={styles.modalPeriod}>{t('markPaid.period')} {payment.period}</Text>

              <Text style={styles.modalLabel}>{t('markPaid.methodLabel')}</Text>
              <View style={styles.methodRow}>
                {METHODS.map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[styles.methodBtn, method === m && styles.methodBtnActive]}
                    onPress={() => onSelectMethod(m)}
                  >
                    <Text style={[styles.methodText, method === m && styles.methodTextActive]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
                  <Text style={styles.modalCancelText}>{t('actions.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.modalConfirm} onPress={onConfirm} disabled={saving}>
                  <Text style={styles.modalConfirmText}>
                    {saving ? t('actions.saving') : t('actions.confirmPayment')}
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
