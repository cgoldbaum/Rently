import { memo } from 'react';
import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { claimStatusStyle } from '../../lib/claimStatus';
import { PressableScale } from '../ui/PressableScale';
import { styles } from './styles';
import { PRIORITY_STYLE, claimLabel } from './constants';
import type { Claim } from './types';

export const ClaimCard = memo(function ClaimCard({
  item,
  onPress,
}: {
  item: Claim;
  onPress: () => void;
}) {
  const { t } = useTranslation('claims');
  const st = claimStatusStyle(item.status);
  const pr = PRIORITY_STYLE[item.priority] ?? PRIORITY_STYLE.MEDIUM;
  const propName = item.tenant.contract.property.name ?? item.tenant.contract.property.address;
  return (
    <PressableScale
      style={styles.card}
      onPress={onPress}
      entering={FadeInDown.duration(280)}
      layout={LinearTransition.duration(220)}
    >
      <View style={styles.cardTop}>
        <Text style={styles.claimTitle} numberOfLines={1}>{claimLabel(item)}</Text>
        <View style={[styles.badge, { backgroundColor: st.bg }]}>
          <Text style={[styles.badgeText, { color: st.color }]}>
            {t(`domain:claimStatus.${item.status}`)}
          </Text>
        </View>
      </View>
      <Text style={styles.property}>{propName} · {item.tenant.name}</Text>
      <Text style={styles.description} numberOfLines={2}>{item.description}</Text>
      <View style={[styles.priorityTag, { backgroundColor: `${pr.color}18` }]}>
        <Text style={[styles.priorityText, { color: pr.color }]}>
          {t(`domain:claimPriority.${item.priority}`)}
        </Text>
      </View>
    </PressableScale>
  );
});
