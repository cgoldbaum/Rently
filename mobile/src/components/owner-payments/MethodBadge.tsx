import { View, Text } from 'react-native';
import { styles } from './styles';
import { METHOD_CONFIG } from './constants';

export function MethodBadge({ method }: { method?: string }) {
  if (!method) return <Text style={styles.methodMissing}>—</Text>;
  const cfg = METHOD_CONFIG[method] ?? { label: method, color: '#374151', bg: '#f3f4f6' };
  return (
    <View style={[styles.methodBadge, { backgroundColor: cfg.bg }]}>
      <Text style={[styles.methodBadgeText, { color: cfg.color }]}>{cfg.label}</Text>
    </View>
  );
}
