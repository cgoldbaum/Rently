import { View, Text, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@rently/shared';
import { usePropertyDetailStyles } from './styles';
import { useThemeColors } from '../../theme/useThemeColors';
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
  const { t } = useTranslation('payments');
  const styles = usePropertyDetailStyles();
  const colors = useThemeColors();
  const months = lastMonths(18);
  const receiptByPeriod = new Map(expensas.map((r) => [r.period, r]));

  return (
    <View style={styles.section}>
      {!contract?.tenants?.length ? (
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
                  <Text style={styles.docBtnText}>{isLoading ? t('expensas.uploading') : `${t('expensas.view')} →`}</Text>
                </View>
                <Text style={styles.rowMeta}>
                  {receipt.fileName ?? t('expensas.uploaded')} · {formatDate(receipt.uploadedAt)}
                </Text>
              </TouchableOpacity>
            );
          }
          return (
            <View key={period} style={[styles.rowCard, styles.rowCardMuted]}>
              <View style={styles.rowTop}>
                <Text style={[styles.rowTitle, { textTransform: 'capitalize', color: colors.textMuted }]}>
                  {periodLabel(period)}
                </Text>
                <Text style={styles.rowMeta}>{t('expensas.pending')}</Text>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}
