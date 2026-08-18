import type { PropsWithChildren } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type SafeBottomSheetProps = PropsWithChildren<
  Readonly<{
    bottomPadding?: number;
    respectBottomInset?: boolean;
    style?: StyleProp<ViewStyle>;
  }>
>;

export function bottomSheetPadding(
  requestedPadding: number,
  bottomInset: number,
): number {
  return Math.max(0, requestedPadding, bottomInset);
}

export function SafeBottomSheet({
  bottomPadding = 0,
  children,
  respectBottomInset = true,
  style,
}: SafeBottomSheetProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        style,
        {
          paddingBottom: bottomSheetPadding(
            bottomPadding,
            respectBottomInset ? insets.bottom : 0,
          ),
        },
      ]}
    >
      {children}
    </View>
  );
}
