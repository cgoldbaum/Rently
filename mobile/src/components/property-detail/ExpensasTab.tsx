import { View, Text, TouchableOpacity } from 'react-native';
import { formatDate } from '@rently/shared';
import { styles } from './styles';
import { periodLabel } from './constants';
import type { Contract, ExpenseReceipt } from './types';

type Props = {
  contract?: Contract;
  expensas: ExpenseReceipt[];
  downloadingReceiptId: string | null;
  onOpenReceipt: (receipt: ExpenseReceipt) => void;
};

// Last 18 months for the expensas view.
function lastMonths(count: number): string[] {
  const months: string[] = [];
  const now = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}

export function ExpensasTab({ contract, expensas, downloadingReceiptId, onOpenReceipt }: Props) {
  const months = lastMonths(18);
  const receiptByPeriod = new Map(expensas.map((r) => [r.period, r]));

  return (
    <View style={styles.section}>
      {!contract?.tenant ? (
        <Text style={styles.empty}>
          Las expensas aparecen cuando hay un inquilino vinculado.
        </Text>
      ) : (
        months.map((period) => {
          const receipt = receiptByPeriod.get(period);
          if (receipt) {
            const isLoading = downloadingReceiptId === receipt.id;
            return (
              <TouchableOpacity
                key={period}
                style={styles.rowCard}
                onPress={() => onOpenReceipt(receipt)}
                disabled={isLoading}
                activeOpacity={0.7}
              >
                <View style={styles.rowTop}>
                  <Text style={[styles.rowTitle, { textTransform: 'capitalize' }]}>
                    {periodLabel(period)}
                  </Text>
                  <Text style={styles.docBtnText}>{isLoading ? 'Abriendo...' : 'Ver →'}</Text>
                </View>
                <Text style={styles.rowMeta}>
                  {receipt.fileName ?? 'Comprobante'} · {formatDate(receipt.uploadedAt)}
                </Text>
              </TouchableOpacity>
            );
          }
          return (
            <View key={period} style={[styles.rowCard, styles.rowCardMuted]}>
              <View style={styles.rowTop}>
                <Text style={[styles.rowTitle, { textTransform: 'capitalize', color: '#bbb' }]}>
                  {periodLabel(period)}
                </Text>
                <Text style={styles.rowMeta}>Sin comprobante</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
