import { View, Text, TouchableOpacity } from 'react-native';
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
  return (
    <View style={styles.section}>
      {!contract ? (
        <Text style={styles.empty}>Creá un contrato para registrar cobros.</Text>
      ) : (
        <>
          <TouchableOpacity style={styles.primaryBtn} onPress={onAddPayment}>
            <Text style={styles.primaryBtnText}>+ Registrar cobro</Text>
          </TouchableOpacity>
          {payments.length === 0 ? (
            <Text style={styles.empty}>Sin cobros registrados.</Text>
          ) : (
            payments.map((p) => {
              const st = PAY_STATUS[p.status] ?? PAY_STATUS.PENDING;
              return (
                <View key={p.id} style={styles.rowCard}>
                  <View style={styles.rowTop}>
                    <Text style={styles.rowTitle}>{p.period}</Text>
                    <View style={[styles.miniBadge, { backgroundColor: st.bg }]}>
                      <Text style={[styles.miniBadgeText, { color: st.color }]}>{st.label}</Text>
                    </View>
                  </View>
                  <Text style={styles.rowAmount}>
                    {formatMoney(p.amount, p.currency ?? contract.currency ?? 'ARS')}
                  </Text>
                  <Text style={styles.rowMeta}>
                    Vence {formatDate(p.dueDate)}
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
