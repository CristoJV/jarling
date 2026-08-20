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

type Props = Readonly<{
  onBack: () => void;
  children: (goBack: () => void) => ReactNode;
}>;

export function AnimatedFlowScreen({ onBack, children }: Props) {
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  const [translateX] = useState(() => new Animated.Value(width));

  useEffect(() => {
    translateX.setValue(width);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 210,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [translateX, width]);

  const goBack = useCallback(() => {
    Animated.timing(translateX, {
      toValue: width,
      duration: 180,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(({ finished }) => {
      if (finished) onBack();
    });
  }, [onBack, translateX, width]);

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

const styles = StyleSheet.create({ screen: { flex: 1 } });
