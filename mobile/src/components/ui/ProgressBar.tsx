import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

/** Barra de progreso cuyo relleno se anima al cambiar `progress` (0-100). */
export function ProgressBar({
  progress,
  height = 4,
  color = '#6b5b45',
  trackColor = '#f0ebe4',
  style,
}: {
  progress: number;
  height?: number;
  color?: string;
  trackColor?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const width = useSharedValue(0);

  useEffect(() => {
    const clamped = Math.max(0, Math.min(100, progress));
    width.value = withTiming(clamped, { duration: 700, easing: Easing.out(Easing.cubic) });
  }, [progress, width]);

  const animatedStyle = useAnimatedStyle(() => ({ width: `${width.value}%` }));

  return (
    <View style={[{ height, backgroundColor: trackColor, borderRadius: height, overflow: 'hidden' }, style]}>
      <Animated.View style={[{ height: '100%', backgroundColor: color, borderRadius: height }, animatedStyle]} />
    </View>
  );
}
