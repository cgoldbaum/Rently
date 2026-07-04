import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { formatDate } from '@rently/shared';
import { usePropertyDetailStyles } from './styles';
import { CLAIM_STATUS } from './constants';
import type { Claim } from './types';

export function ClaimsTab({ claims }: { claims: Claim[] }) {
  const { t } = useTranslation('claims');
  const styles = usePropertyDetailStyles();

  return (
    <View style={styles.section}>
      {claims.length === 0 ? (
        <Text style={styles.empty}>{t('empty.noClaimsForProperty')}</Text>
      ) : (
        claims.map((c) => {
          const st = CLAIM_STATUS[c.status] ?? CLAIM_STATUS.OPEN;
          return (
            <View key={c.id} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <Text style={styles.rowTitle}>{t('domain:claimCategory.' + c.category)}</Text>
                <View style={[styles.miniBadge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.miniBadgeText, { color: st.color }]}>
                    {t(`domain:claimStatus.${c.status}`)}
                  </Text>
                </View>
              </View>
              <Text style={styles.rowDesc}>{c.description}</Text>
              <Text style={styles.rowMeta}>{formatDate(c.createdAt)}</Text>
            </View>
          );
        })
      )}
    </View>
  );
}
