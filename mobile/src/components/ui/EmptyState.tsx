import { StyleSheet } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

/** Estado vacío consistente: emoji + título + descripción opcional, con fade de entrada. */
export function EmptyState({
  emoji = '📭',
  title,
  description,
}: {
  emoji?: string;
  title: string;
  description?: string;
}) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.wrap}>
      <Animated.Text style={styles.emoji}>{emoji}</Animated.Text>
      <Animated.Text style={styles.title}>{title}</Animated.Text>
      {description ? <Animated.Text style={styles.desc}>{description}</Animated.Text> : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingHorizontal: 32, paddingVertical: 40 },
  emoji: { fontSize: 40, marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '700', color: '#2d2d2d', textAlign: 'center' },
  desc: { fontSize: 13, color: '#888', textAlign: 'center', lineHeight: 20, marginTop: 6 },
});
