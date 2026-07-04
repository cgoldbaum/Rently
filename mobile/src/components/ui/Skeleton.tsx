import { useEffect, useMemo } from 'react';
import { View, StyleSheet, type DimensionValue, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useThemeColors } from '../../theme/useThemeColors';
import type { ThemeColors } from '../../theme/colors';

/** Bloque gris con un pulso suave, para placeholders de carga. */
export function Skeleton({
  width = '100%',
  height = 14,
  radius = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const colors = useThemeColors();
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 700, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 700, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      false
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.backgroundElevated },
        style,
        animatedStyle,
      ]}
    />
  );
}

/** Tarjeta blanca con un par de líneas grises, imitando una card real. */
export function SkeletonCard() {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.card}>
      <View style={styles.rowBetween}>
        <Skeleton width="55%" height={16} />
        <Skeleton width={64} height={20} radius={20} />
      </View>
      <Skeleton width="80%" height={12} style={{ marginTop: 14 }} />
      <Skeleton width="40%" height={12} style={{ marginTop: 8 }} />
    </View>
  );
}

/** Pantalla de carga con varias tarjetas placeholder, en el layout estándar. */
export function SkeletonScreen({ count = 4 }: { count?: number }) {
  const colors = useThemeColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.screen}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

function createStyles(colors: ThemeColors) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: 60,
      paddingHorizontal: 20,
      gap: 12,
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 14,
      padding: 16,
      shadowColor: '#000',
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  });
}
