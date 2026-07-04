import { View, Text } from 'react-native';
import { usePropertyDetailStyles } from './styles';

export function InfoRow({ label, value }: { label: string; value: string }) {
  const styles = usePropertyDetailStyles();
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}
