import { View, Text, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { formatMoney, formatDate } from '@rently/shared';
import { styles } from './styles';
import { STATUS } from './constants';
import type { Payment } from './types';

type Props = {
  item: Payment;
  index: number;
  mpPending: boolean;
  onPressReceipt: (id: string) => void;
  onMercadoPago: (id: string) => void;
  onTransfer: (payment: Payment) => void;
  onCash: (payment: Payment) => void;
};

export function PaymentCard({
  item,
  index,
  mpPending,
  onPressReceipt,
  onMercadoPago,
  onTransfer,
  onCash,
}: Props) {
  const st = STATUS[item.status] ?? STATUS.PENDING;
  const canPay = item.status === 'PENDING' || item.status === 'LATE';

  return (
    <Animated.View entering={FadeInDown.duration(280).delay(Math.min(index, 6) * 40)}>
      <TouchableOpacity
        activeOpacity={item.status === 'PAID' ? 0.7 : 1}
        onPress={() => item.status === 'PAID' && onPressReceipt(item.id)}
        style={styles.card}
      >
        <View style={styles.payTop}>
          <Text style={styles.payPeriod}>{item.period}</Text>
          <View style={[styles.badge, { backgroundColor: st.bg }]}>
            <Text style={[styles.badgeText, { color: st.color }]}>{st.label}</Text>
          </View>
        </View>
        <Text style={styles.payMeta}>
          Vto. {formatDate(item.dueDate)}
          {item.paidDate ? ` · Pagado ${formatDate(item.paidDate)}` : ''}
          {item.method ? ` · ${item.method}` : ''}
        </Text>
        {item.cashNote ? <Text style={styles.payNote}>"{item.cashNote}"</Text> : null}
        <Text style={styles.payAmount}>{formatMoney(item.amount, item.currency ?? 'ARS')}</Text>

        {canPay ? (
          <View style={styles.payButtons}>
            <TouchableOpacity
              style={[styles.payBtn, styles.payBtnMp]}
              onPress={() => onMercadoPago(item.id)}
              disabled={mpPending}
            >
              <Text style={styles.payBtnMpText}>Mercado Pago</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.payBtn} onPress={() => onTransfer(item)}>
              <Text style={styles.payBtnText}>Transferencia</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.payBtn} onPress={() => onCash(item)}>
              <Text style={styles.payBtnText}>Efectivo</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {item.status === 'PENDING_CONFIRMATION' ? (
          <Text style={styles.waitHint}>Esperando confirmación del propietario</Text>
        ) : null}
        {item.status === 'PAID' ? <Text style={styles.waitHint}>Ver comprobante →</Text> : null}
      </TouchableOpacity>
    </Animated.View>
  );
}
