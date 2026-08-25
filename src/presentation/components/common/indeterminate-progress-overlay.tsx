import { useEffect, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

export function IndeterminateProgressOverlay({
  label,
}: Readonly<{ label: string }>) {
  const styles = useThemedStyles(createStyles);
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(progress, {
        duration: 900,
        toValue: 1,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [progress]);

  return (
    <Modal animationType="fade" statusBarTranslucent transparent visible>
      <View style={styles.backdrop}>
        <View accessibilityLiveRegion="polite" style={styles.card}>
          <Text style={styles.label}>{label}</Text>
          <View style={styles.track}>
            <Animated.View
              style={[
                styles.bar,
                {
                  transform: [
                    {
                      translateX: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-190, 190],
                      }),
                    },
                  ],
                },
              ]}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      paddingHorizontal: 28,
      backgroundColor: '#00000066',
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      width: '100%',
      maxWidth: 440,
      padding: 22,
      backgroundColor: theme.colors.surface,
      borderRadius: 20,
      gap: 16,
    },
    label: {
      color: theme.colors.text,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
    },
    track: {
      height: 6,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 3,
      overflow: 'hidden',
    },
    bar: {
      width: '55%',
      height: '100%',
      backgroundColor: theme.colors.primary,
      borderRadius: 3,
    },
  });
