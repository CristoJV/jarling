import { Pressable, StyleSheet, Text } from 'react-native';

import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

type FloatingActionButtonProps = Readonly<{
  accessibilityLabel: string;
  label: string;
  onPress: () => void;
  testID?: string;
}>;

export function FloatingActionButton({
  accessibilityLabel,
  label,
  onPress,
  testID,
}: FloatingActionButtonProps) {
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.button}
      testID={testID}
    >
      <Text style={styles.label}>+ {label}</Text>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    button: {
      position: 'absolute',
      right: 22,
      bottom: 22,
      minHeight: 52,
      paddingHorizontal: 20,
      backgroundColor: theme.colors.primary,
      borderRadius: 26,
      shadowColor: '#000000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: theme.elevation.floating,
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      color: theme.colors.onPrimary,
      fontSize: 14,
      fontWeight: '700',
    },
  });
