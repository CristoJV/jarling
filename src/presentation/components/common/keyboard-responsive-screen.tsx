import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';

export function KeyboardResponsiveScreen({ children }: PropsWithChildren) {
  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.screen}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });
