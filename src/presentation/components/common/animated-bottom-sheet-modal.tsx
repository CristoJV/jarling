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

type AnimatedBottomSheetModalProps = PropsWithChildren<
  Readonly<{
    onDismiss: () => void;
    visible?: boolean;
    keyboardAvoiding?: boolean;
  }>
>;

export function AnimatedBottomSheetModal({
  children,
  onDismiss,
  visible = true,
  keyboardAvoiding = false,
}: AnimatedBottomSheetModalProps) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [progress, visible]);

  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={onDismiss}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.scrim,
          {
            opacity: progress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          },
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
          style={{
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [72, 0],
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
  positioner: { flex: 1, justifyContent: 'flex-end' },
});
