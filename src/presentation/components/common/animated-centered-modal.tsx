import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useAppTheme } from '@/presentation/theme/theme-provider';

type AnimatedCenteredModalProps = PropsWithChildren<
  Readonly<{ onDismiss: () => void; keyboardAvoiding?: boolean }>
>;

export function AnimatedCenteredModal({
  children,
  onDismiss,
  keyboardAvoiding = false,
}: AnimatedCenteredModalProps) {
  const theme = useAppTheme();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progress, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [progress]);

  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={onDismiss}
      statusBarTranslucent
      transparent
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.colors.scrim, opacity: progress },
        ]}
      />
      <Pressable onPress={onDismiss} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView
        behavior={
          keyboardAvoiding
            ? Platform.OS === 'ios'
              ? 'padding'
              : 'height'
            : undefined
        }
        pointerEvents="box-none"
        style={styles.positioner}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: progress,
              transform: [
                {
                  scale: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.96, 1],
                  }),
                },
              ],
            },
          ]}
        >
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  positioner: {
    flex: 1,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { width: '100%', maxWidth: 680 },
});
