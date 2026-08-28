import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

type FilterChipProps = Readonly<{
  label: string;
  onPress: () => void;
  onRemove: () => void;
}>;

export function FilterChip({ label, onPress, onRemove }: FilterChipProps) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.filter}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={styles.filterLabel}
      >
        <Text numberOfLines={1} style={styles.filterText}>
          {label}
        </Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        hitSlop={6}
        onPress={onRemove}
        style={styles.remove}
      >
        <MaterialCommunityIcons
          color={theme.colors.primary}
          name="close"
          size={16}
        />
      </Pressable>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    filter: {
      minHeight: 32,
      maxWidth: '100%',
      paddingLeft: 10,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    filterLabel: { minHeight: 32, maxWidth: '90%', justifyContent: 'center' },
    remove: {
      width: 38,
      height: 32,
      alignItems: 'center',
      justifyContent: 'center',
    },
    filterText: {
      flexShrink: 1,
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },
  });
