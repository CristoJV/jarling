import type { PropsWithChildren, ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

type Props = PropsWithChildren<Readonly<{ bottom?: ReactNode }>>;

export function BottomActionLayout({ children, bottom }: Props) {
  return (
    <View style={styles.layout}>
      <View style={styles.content}>{children}</View>
      {bottom ? <View style={styles.bottom}>{bottom}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layout: { flex: 1 },
  content: { flex: 1, minHeight: 0 },
  bottom: { flexShrink: 0 },
});
