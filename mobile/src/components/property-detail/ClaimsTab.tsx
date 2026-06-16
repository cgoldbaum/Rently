import { View, Text } from 'react-native';
import { formatDate } from '@rently/shared';
import { styles } from './styles';
import { CLAIM_STATUS, CAT_LABELS } from './constants';
import type { Claim } from './types';

export function ClaimsTab({ claims }: { claims: Claim[] }) {
  return (
    <View style={styles.section}>
      {claims.length === 0 ? (
        <Text style={styles.empty}>Sin reclamos para esta propiedad.</Text>
      ) : (
        claims.map((c) => {
          const st = CLAIM_STATUS[c.status] ?? CLAIM_STATUS.OPEN;
          return (
            <View key={c.id} style={styles.rowCard}>
              <View style={styles.rowTop}>
                <Text style={styles.rowTitle}>{CAT_LABELS[c.category] || c.category}</Text>
                <View style={[styles.miniBadge, { backgroundColor: st.bg }]}>
                  <Text style={[styles.miniBadgeText, { color: st.color }]}>{st.label}</Text>
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
