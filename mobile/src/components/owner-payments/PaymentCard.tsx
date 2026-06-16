import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatMoney, formatDate } from '@rently/shared';
import { styles } from './styles';
import { STATUS } from './constants';
import { MethodBadge } from './MethodBadge';
import type { Payment } from './types';

type Props = {
  item: Payment;
  index: number;
  onPressReceipt: (id: string) => void;
  onMarkPaid: (payment: Payment) => void;
  onSplit: (payment: Payment) => void;
};

export function PaymentCard({ item, index, onPressReceipt, onMarkPaid, onSplit }: Props) {
  const st = STATUS[item.status] ?? STATUS.PENDING;
  const canMark =
    item.status === 'PENDING' ||
    item.status === 'LATE' ||
    item.status === 'PENDING_CONFIRMATION';

  return (
    <Animated.View entering={FadeInDown.duration(280).delay(Math.min(index, 6) * 40)}>
      <TouchableOpacity
        activeOpacity={item.status === 'PAID' ? 0.7 : 1}
        onPress={() => item.status === 'PAID' && onPressReceipt(item.id)}
        style={styles.card}
      >
        <View style={styles.cardTop}>
          <Text style={styles.cardProperty} numberOfLines={1}>
            {item.contract.property.name ?? item.contract.property.address}
          </Text>
          <View style={[styles.badge, { backgroundColor: st.bg }]}>
            <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        <Text style={styles.cardTenant}>
          {item.contract.tenant?.name ?? 'Sin inquilino'} · {item.period}
        </Text>
        <View style={styles.cardBottom}>
          <Text style={styles.cardAmount}>{formatMoney(item.amount, item.currency ?? 'USD')}</Text>
        </View>
        <View style={styles.cardMetaRow}>
          <Text style={styles.cardDue}>Vence {formatDate(item.dueDate)}</Text>
          <MethodBadge method={item.method} />
        </View>
        {(item.installmentCount ?? 1) > 1 && (
          <View style={styles.installmentBadge}>
            <Text style={styles.installmentBadgeText}>
              Cuota {item.installmentNumber}/{item.installmentCount}
            </Text>
          </View>
        )}
        {canMark ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { flex: 1 }]}
              onPress={() => onMarkPaid(item)}
            >
              <Text style={styles.actionBtnText}>
                {item.status === 'PENDING_CONFIRMATION' ? 'Confirmar pago' : 'Marcar pagado'}
              </Text>
            </TouchableOpacity>
            {(item.installmentCount ?? 1) === 1 && item.status !== 'PENDING_CONFIRMATION' && (
              <TouchableOpacity style={styles.splitBtn} onPress={() => onSplit(item)}>
                <Text style={styles.splitBtnText}>En cuotas</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <Text style={styles.receiptHint}>Ver comprobante →</Text>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}
