import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatMoney, formatDate } from '@rently/shared';
import { styles } from './styles';
import type { Contract, Adjustment } from './types';

type Props = {
  contract?: Contract;
  adjustments: Adjustment[];
};

export function AdjustmentsTab({ contract, adjustments }: Props) {
  const { t } = useTranslation('contracts');
  return (
    <View style={styles.section}>
      {!contract ? (
        <Text style={styles.empty}>{t('adjustments.noContractView')}</Text>
      ) : adjustments.length === 0 ? (
        <Text style={styles.empty}>{t('adjustments.noAdjustments')}</Text>
      ) : (
        adjustments.map((a) => (
          <View key={a.id} style={styles.rowCard}>
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle}>{t(`domain:indexType.${a.indexType}`, a.indexType)}</Text>
              <Text style={styles.adjPct}>+{a.variation.toFixed(1)}%</Text>
            </View>
            <Text style={styles.rowMeta}>{formatDate(a.appliedAt)}</Text>
            <Text style={styles.adjAmounts}>
              {formatMoney(a.previousAmount, contract.currency ?? 'ARS')} →{' '}
              {formatMoney(a.newAmount, contract.currency ?? 'ARS')}
            </Text>
            {a.notified ? (
              <Text style={styles.adjNotified}>{t('adjustments.bothNotified')}</Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}
