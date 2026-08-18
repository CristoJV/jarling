import { useEffect, useState } from 'react';
import {
  Animated,
  Modal,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from 'react-native';
import type { PropsWithChildren } from 'react';

type FullScreenModalProps = PropsWithChildren<
  Readonly<{ onRequestClose: () => void }>
>;

export function FullScreenModal({
  children,
  onRequestClose,
}: FullScreenModalProps) {
  const { width } = useWindowDimensions();
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
    <Modal animationType="none" onRequestClose={onRequestClose} visible>
      <Animated.View style={[styles.screen, { transform: [{ translateX }] }]}>
        {children}
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });
