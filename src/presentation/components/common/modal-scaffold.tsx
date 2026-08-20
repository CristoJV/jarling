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
  useWindowDimensions,
} from 'react-native';

import { useAppTheme } from '@/presentation/theme/theme-provider';
import { motion } from '@/presentation/motion/motion';
import { useReducedMotion } from '@/presentation/motion/use-reduced-motion';

type Props = PropsWithChildren<
  Readonly<{
    onDismiss: () => void;
    placement: 'bottom' | 'center';
    visible?: boolean;
    keyboardAvoiding?: boolean;
  }>
>;

export function ModalScaffold({
  children,
  onDismiss,
  placement,
  visible = true,
  keyboardAvoiding = false,
}: Props) {
  const theme = useAppTheme();
  const { height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!visible) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: reducedMotion
        ? 0
        : placement === 'bottom'
          ? motion.bottomSheet
          : motion.dialog,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [placement, progress, reducedMotion, visible]);

  return (
    <Modal
      animationType="none"
      onRequestClose={onDismiss}
      statusBarTranslucent
      transparent
      visible={visible}
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
        style={[
          styles.positioner,
          placement === 'bottom' ? styles.bottom : styles.center,
        ]}
      >
        <Animated.View
          accessibilityViewIsModal
          importantForAccessibility="yes"
          style={[
            styles.content,
            placement === 'center' && styles.centerContent,
            {
              opacity: progress,
              transform: [
                placement === 'bottom'
                  ? {
                      translateY: progress.interpolate({
                        inputRange: [0, 1],
                        outputRange: [Math.max(120, height * 0.45), 0],
                      }),
                    }
                  : {
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
  positioner: { flex: 1 },
  bottom: { justifyContent: 'flex-end' },
  center: { padding: 12, alignItems: 'center', justifyContent: 'center' },
  content: { width: '100%', alignSelf: 'stretch' },
  centerContent: { maxWidth: 680, alignSelf: 'center' },
});
