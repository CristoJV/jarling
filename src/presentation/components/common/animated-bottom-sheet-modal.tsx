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
  const theme = useAppTheme();
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
          { backgroundColor: theme.colors.scrim },
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
          style={[
            styles.sheetContainer,
            {
              transform: [
                {
                  translateY: progress.interpolate({
                    inputRange: [0, 1],
                    outputRange: [72, 0],
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
  scrim: {},
  positioner: { flex: 1, justifyContent: 'flex-end' },
  sheetContainer: { width: '100%', alignSelf: 'stretch' },
});
