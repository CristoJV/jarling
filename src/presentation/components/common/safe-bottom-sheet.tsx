import type { PropsWithChildren } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type SafeBottomSheetProps = PropsWithChildren<
  Readonly<{ style?: StyleProp<ViewStyle> }>
>;

export function SafeBottomSheet({ children, style }: SafeBottomSheetProps) {
  return (
    <SafeAreaView edges={['bottom', 'left', 'right']} style={style}>
      {children}
    </SafeAreaView>
  );
}
