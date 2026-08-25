import { useEffect, useState } from 'react';
import { Animated, Modal, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

type Props = Readonly<{
  initialMessage: string;
  messages: readonly string[];
  rotationIntervalMs?: number;
}>;

export function LongRunningOperationModal({
  initialMessage,
  messages,
  rotationIntervalMs = 1_350,
}: Props) {
  const styles = useThemedStyles(createStyles);
  const [progress] = useState(() => new Animated.Value(0));
  const [messageIndex, setMessageIndex] = useState(-1);

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

  useEffect(() => {
    if (messages.length === 0) return;
    const timer = setInterval(
      () =>
        setMessageIndex((current) =>
          current + 1 >= messages.length ? 0 : current + 1,
        ),
      rotationIntervalMs,
    );
    return () => clearInterval(timer);
  }, [messages, rotationIntervalMs]);

  const message =
    messageIndex < 0
      ? initialMessage
      : (messages[messageIndex] ?? initialMessage);

  return (
    <Modal
      animationType="fade"
      navigationBarTranslucent
      onRequestClose={() => undefined}
      statusBarTranslucent
      transparent
      visible
    >
      <View style={styles.backdrop}>
        <View
          accessibilityLabel={message}
          accessibilityLiveRegion="polite"
          accessibilityRole="progressbar"
          style={styles.card}
        >
          <Text style={styles.label}>{message}</Text>
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
      backgroundColor: '#00000070',
      alignItems: 'center',
      justifyContent: 'center',
    },
    card: {
      width: '100%',
      maxWidth: 440,
      padding: 22,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 20,
      borderWidth: 1,
      gap: 16,
    },
    label: {
      minHeight: 22,
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
