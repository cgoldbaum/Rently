import { View, Text } from 'react-native';
import { formatMoney, formatDate } from '@rently/shared';
import { styles } from './styles';
import { INDEX_LABELS } from './constants';
import type { Contract, Adjustment } from './types';

type Props = {
  contract?: Contract;
  adjustments: Adjustment[];
};

export function AdjustmentsTab({ contract, adjustments }: Props) {
  return (
    <View style={styles.section}>
      {!contract ? (
        <Text style={styles.empty}>Creá un contrato para ver los ajustes.</Text>
      ) : adjustments.length === 0 ? (
        <Text style={styles.empty}>Todavía no se aplicaron ajustes.</Text>
      ) : (
        adjustments.map((a) => (
          <View key={a.id} style={styles.rowCard}>
            <View style={styles.rowTop}>
              <Text style={styles.rowTitle}>{INDEX_LABELS[a.indexType] || a.indexType}</Text>
              <Text style={styles.adjPct}>+{a.variation.toFixed(1)}%</Text>
            </View>
            <Text style={styles.rowMeta}>{formatDate(a.appliedAt)}</Text>
            <Text style={styles.adjAmounts}>
              {formatMoney(a.previousAmount, contract.currency ?? 'ARS')} →{' '}
              {formatMoney(a.newAmount, contract.currency ?? 'ARS')}
            </Text>
            {a.notified ? (
              <Text style={styles.adjNotified}>✓ Ambas partes notificadas</Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}
