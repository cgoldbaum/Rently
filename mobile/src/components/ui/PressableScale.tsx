import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  type AnimatedProps,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<AnimatedProps<PressableProps>, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** Escala al presionar (default 0.97). */
  pressedScale?: number;
};

/**
 * Reemplazo de TouchableOpacity para tarjetas: hace un leve "scale down" al
 * presionar. Acepta props de reanimated (entering/layout) por spread.
 */
export function PressableScale({ children, style, pressedScale = 0.97, ...rest }: Props) {
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withTiming(pressedScale, { duration: 90 });
      }}
      onPressOut={() => {
        scale.value = withTiming(1, { duration: 120 });
      }}
      style={[style, animatedStyle]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
