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

type AnimatedCenteredModalProps = PropsWithChildren<
  Readonly<{ onDismiss: () => void; keyboardAvoiding?: boolean }>
>;

export function AnimatedCenteredModal({
  children,
  onDismiss,
  keyboardAvoiding = false,
}: AnimatedCenteredModalProps) {
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
        style={[StyleSheet.absoluteFill, styles.scrim, { opacity: progress }]}
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
          style={{
            opacity: progress,
            transform: [
              {
                scale: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.96, 1],
                }),
              },
            ],
          }}
        >
          {children}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(18, 24, 20, 0.42)' },
  positioner: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
