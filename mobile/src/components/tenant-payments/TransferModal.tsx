import { View, Text, TextInput, TouchableOpacity, Modal, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatMoney } from '@rently/shared';
import { useTenantPaymentsStyles } from './styles';
import { useThemeColors } from '../../theme/useThemeColors';
import type { Payment, Contract } from './types';

type Props = {
  payment: Payment | null;
  contract: Contract;
  note: string;
  onNoteChange: (note: string) => void;
  onCopy: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  saving: boolean;
};

export function TransferModal({
  payment,
  contract,
  note,
  onNoteChange,
  onCopy,
  onCancel,
  onConfirm,
  saving,
}: Props) {
  const { t } = useTranslation('payments');
  const styles = useTenantPaymentsStyles();
  const colors = useThemeColors();
  const info = contract?.ownerPaymentInfo;
  return (
    <Modal visible={!!payment} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>{t('transfer.title')}</Text>
          {payment ? (
            <Text style={styles.modalSub}>
              {payment.period} · {formatMoney(payment.amount, payment.currency ?? 'ARS')}
            </Text>
          ) : null}

          {info ? (
            <View style={styles.transferData}>
              {(
                [
                  [t('transfer.alias'), info.alias],
                  [t('transfer.cbu'), info.cbu],
                  [t('transfer.owner'), info.ownerName],
                ] as [string, string][]
              ).map(([label, value]) => (
                <View key={label} style={styles.transferRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.transferLabel}>{label}</Text>
                    <Text style={styles.transferValue}>{value || t('payActions.notConfigured')}</Text>
                  </View>
                  {value ? (
                    <TouchableOpacity style={styles.copyBtn} onPress={() => onCopy(value)}>
                      <Text style={styles.copyBtnText}>{t('transfer.copy')}</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.modalLabel}>
              {t('transfer.ownerNotConfigured')}
            </Text>
          )}

          <Text style={styles.modalLabel}>{t('transfer.note')}</Text>
          <TextInput
            style={styles.textarea}
            placeholder={t('transfer.notePlaceholder')}
            placeholderTextColor={colors.textMuted}
            value={note}
            onChangeText={onNoteChange}
            multiline
          />

          {info && payment ? (
            <View style={styles.contactRow}>
              <TouchableOpacity
                style={styles.contactBtn}
                onPress={() =>
                  Linking.openURL(
                    `mailto:${info.email}?subject=${encodeURIComponent(
                      t('common:transferReceiptSubject', { period: payment.period })
                    )}&body=${encodeURIComponent(
                      t('common:transferReceiptEmailBody', {
                        period: payment.period,
                        amount: formatMoney(payment.amount, payment.currency ?? 'ARS'),
                      })
                    )}`
                  )
                }
              >
                <Text style={styles.contactBtnText}>{t('transfer.email')}</Text>
              </TouchableOpacity>
              {info.whatsapp ? (
                <TouchableOpacity
                  style={[styles.contactBtn, styles.contactBtnWa]}
                  onPress={() =>
                    Linking.openURL(
                      `https://wa.me/${info.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(
                        t('common:transferReceiptWhatsappBody', {
                          period: payment.period,
                          amount: formatMoney(payment.amount, payment.currency ?? 'ARS'),
                        })
                      )}`
                    )
                  }
                >
                  <Text style={styles.contactBtnWaText}>{t('transfer.whatsapp')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.modalCancel} onPress={onCancel}>
              <Text style={styles.modalCancelText}>{t('transfer.close')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalConfirm} disabled={saving} onPress={onConfirm}>
              <Text style={styles.modalConfirmText}>
                {saving ? t('transfer.submitting') : t('transfer.submit')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
