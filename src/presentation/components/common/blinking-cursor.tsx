import { useEffect, useState } from 'react';
import { Animated, Easing, Platform, StyleSheet } from 'react-native';

import { useReducedMotion } from '@/presentation/motion/use-reduced-motion';
import { useAppTheme } from '@/presentation/theme/theme-provider';

type Props = Readonly<{
  height?: number;
}>;

export function BlinkingCursor({ height = 38 }: Props) {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const [opacity] = useState(() => new Animated.Value(1));

  useEffect(() => {
    if (reducedMotion) {
      opacity.setValue(1);
      return;
    }

    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.15,
          duration: 520,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 520,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [opacity, reducedMotion]);

  return (
    <Animated.View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.cursor,
        { backgroundColor: theme.colors.primary, height, opacity },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  cursor: { width: 2, marginLeft: 4, borderRadius: 1 },
});
