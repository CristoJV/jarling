import type { ReactNode } from 'react';
import { useCallback, useEffect, useState } from 'react';
import {
  Animated,
  BackHandler,
  Easing,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';

import { useAppTheme } from '@/presentation/theme/theme-provider';
import { motion } from '@/presentation/motion/motion';
import { useReducedMotion } from '@/presentation/motion/use-reduced-motion';

type Props = Readonly<{
  onBack: () => void;
  children: (goBack: () => void) => ReactNode;
  overlay?: boolean;
}>;

export function AnimatedFlowScreen({
  onBack,
  children,
  overlay = false,
}: Props) {
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const [translateX] = useState(() => new Animated.Value(width));

  useEffect(() => {
    translateX.setValue(width);
    Animated.timing(translateX, {
      toValue: 0,
      duration: reducedMotion ? 0 : motion.flowEnter,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [reducedMotion, translateX, width]);

  const goBack = useCallback(() => {
    Animated.timing(translateX, {
      toValue: width,
      duration: reducedMotion ? 0 : motion.flowExit,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) onBack();
    });
  }, [onBack, reducedMotion, translateX, width]);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        goBack();
        return true;
      },
    );
    return () => subscription.remove();
  }, [goBack]);

  return (
    <Animated.View
      style={[
        styles.screen,
        overlay && styles.overlay,
        {
          backgroundColor: theme.colors.background,
          transform: [{ translateX }],
        },
      ]}
    >
      {children(goBack)}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 10,
  },
});
