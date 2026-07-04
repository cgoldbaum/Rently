import { View, Text } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useOwnerPaymentsStyles } from './styles';
import { METHOD_CONFIG } from './constants';

export function MethodBadge({ method }: { method?: string }) {
  const { t } = useTranslation();
  const styles = useOwnerPaymentsStyles();
  if (!method) return <Text style={styles.methodMissing}>—</Text>;
  const cfg = METHOD_CONFIG[method];
  const label = cfg ? t(`domain:paymentMethod.${cfg.label}`) : method;
  const color = cfg?.color ?? '#374151';
  const bg = cfg?.bg ?? '#f3f4f6';
  return (
    <View style={[styles.methodBadge, { backgroundColor: bg }]}>
      <Text style={[styles.methodBadgeText, { color }]}>{label}</Text>
    </View>
  );
}
