import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { TransactionFilterChip } from '@/presentation/utils/transaction-search';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

type Props = Readonly<{
  filters: readonly TransactionFilterChip[];
  onPress: (key: TransactionFilterChip['key']) => void;
  onRemove: (key: TransactionFilterChip['key']) => void;
}>;

export function TransactionFilters({ filters, onPress, onRemove }: Props) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  if (filters.length === 0) return null;

  return (
    <View style={styles.filters}>
      {filters.map((filter) => (
        <View key={filter.key} style={styles.filter}>
          <Pressable
            accessibilityRole="button"
            onPress={() => onPress(filter.key)}
            style={styles.filterLabel}
          >
            <Text numberOfLines={1} style={styles.filterText}>
              {filter.label}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            hitSlop={6}
            onPress={() => onRemove(filter.key)}
            style={styles.remove}
          >
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="close"
              size={16}
            />
          </Pressable>
        </View>
      ))}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    filters: {
      minHeight: 44,
      paddingHorizontal: 16,
      paddingVertical: 6,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 7,
    },
    filter: {
      minHeight: 32,
      maxWidth: '100%',
      paddingHorizontal: 10,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    filterLabel: { minHeight: 32, maxWidth: '90%', justifyContent: 'center' },
    remove: {
      width: 28,
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
