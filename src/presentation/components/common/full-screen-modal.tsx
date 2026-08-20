import { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import type { PropsWithChildren } from 'react';
import { useAppTheme } from '@/presentation/theme/theme-provider';

type FullScreenModalProps = PropsWithChildren<
  Readonly<{ onRequestClose: () => void }>
>;

export function FullScreenModal({
  children,
  onRequestClose,
}: FullScreenModalProps) {
  const { width } = useWindowDimensions();
  const theme = useAppTheme();
  const [translateX] = useState(() => new Animated.Value(width));

  useEffect(() => {
    translateX.setValue(width);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 260,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [translateX, width]);

  return (
    <Modal
      animationType="none"
      navigationBarTranslucent
      onRequestClose={onRequestClose}
      statusBarTranslucent
      visible
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.colors.background },
        ]}
      />
      <Animated.View
        style={[
          styles.screen,
          {
            backgroundColor: theme.colors.background,
            transform: [{ translateX }],
          },
        ]}
      >
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });
