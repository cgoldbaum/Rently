import { useState } from 'react';
import { View, Text, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatMoney, formatDate } from '@rently/shared';
import { api } from '../../lib/api';
import { usePropertyDetailStyles } from './styles';
import { useThemeColors } from '../../theme/useThemeColors';
import { RentEvolutionChart, type RentPoint } from '../RentEvolutionChart';
import type { Contract, Adjustment } from './types';

type Props = {
  contract?: Contract;
  adjustments: Adjustment[];
};

export function AdjustmentsTab({ contract, adjustments }: Props) {
  const { t } = useTranslation('contracts');
  const styles = usePropertyDetailStyles();
  const colors = useThemeColors();
  const [explainingId, setExplainingId] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<Record<string, string>>({});

  const explain = async (a: Adjustment) => {
    if (explainingId) return;
    setExplainingId(a.id);
    try {
      const res = await api.post('/ai/explain-adjustment', {
        previousAmount: a.previousAmount,
        newAmount: a.newAmount,
        percentage: a.variation,
        indexType: a.indexType,
        currency: contract?.currency ?? 'ARS',
      });
      const text: string = res.data.data.text?.trim() ?? '';
      if (text) setExplanations((prev) => ({ ...prev, [a.id]: text }));
    } catch {
      Alert.alert(t('common:error'), t('adjustments.explainError'));
    } finally {
      setExplainingId(null);
    }
  };

  const sorted = [...adjustments].sort(
    (a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime()
  );
  const chartPoints: RentPoint[] = sorted.length > 0
    ? [
        { date: contract?.startDate ?? sorted[0].appliedAt, amount: sorted[0].previousAmount },
        ...sorted.map((a) => ({ date: a.appliedAt, amount: a.newAmount })),
      ]
    : [];

  return (
    <View style={styles.section}>
      {chartPoints.length >= 2 ? (
        <View style={{ backgroundColor: colors.card, borderRadius: 14, padding: 14, marginBottom: 12 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginBottom: 8 }}>
            {t('adjustments.evolutionTitle')}
          </Text>
          <RentEvolutionChart points={chartPoints} currency={contract?.currency ?? 'ARS'} />
        </View>
      ) : null}
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

            <TouchableOpacity
              onPress={() => explain(a)}
              disabled={explainingId === a.id}
              style={{
                alignSelf: 'flex-start', marginTop: 10,
                backgroundColor: '#efe9df', borderWidth: 1, borderColor: '#6b5b45',
                borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6,
                flexDirection: 'row', alignItems: 'center', gap: 6,
                opacity: explainingId === a.id ? 0.6 : 1,
              }}
            >
              {explainingId === a.id ? <ActivityIndicator color="#6b5b45" size="small" /> : null}
              <Text style={{ color: '#6b5b45', fontSize: 12, fontWeight: '700' }}>
                {explainingId === a.id ? t('adjustments.explaining') : t('adjustments.explain')}
              </Text>
            </TouchableOpacity>

            {explanations[a.id] ? (
              <Text style={{ marginTop: 8, fontSize: 13, lineHeight: 19, color: colors.textSecondary }}>
                🤖  {explanations[a.id]}
              </Text>
            ) : null}
          </View>
        ))
      )}
    </View>
  );
}
