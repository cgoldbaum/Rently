import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatMoney, formatDate } from '@rently/shared';
import { styles } from './styles';
import { PAY_STATUS } from './constants';
import type { Contract, Payment } from './types';

type Props = {
  contract?: Contract;
  payments: Payment[];
  onAddPayment: () => void;
};

export function PaymentsTab({ contract, payments, onAddPayment }: Props) {
  const { t } = useTranslation('payments');
  return (
    <View style={styles.section}>
      {!contract ? (
        <Text style={styles.empty}>{t('common:createContractForCharges')}</Text>
      ) : (
        <>
          <TouchableOpacity style={styles.primaryBtn} onPress={onAddPayment}>
            <Text style={styles.primaryBtnText}>+ {t('actions.registerPayment')}</Text>
          </TouchableOpacity>
          {payments.length === 0 ? (
            <Text style={styles.empty}>{t('empty.noPaymentsRegistered')}</Text>
          ) : (
            payments.map((p) => {
              const st = PAY_STATUS[p.status] ?? PAY_STATUS.PENDING;
              return (
                <View key={p.id} style={styles.rowCard}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowTitle}>{p.period}</Text>
                    <View style={[styles.miniBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.miniBadgeText, { color: st.color }]}>{t('domain:paymentStatus.' + p.status)}</Text>
                    </View>
                  </View>
                  <Text style={styles.rowAmount}>
                    {formatMoney(p.amount, p.currency ?? contract.currency ?? 'ARS')}
                  </Text>
                  <Text style={styles.rowMeta}>
                    {t('tenant.dueDate', { date: formatDate(p.dueDate) })}
                    {p.method ? ` · ${p.method}` : ''}
                  </Text>
                </View>
              );
            })
          )}
        </>
      )}
    </View>
  );
}
