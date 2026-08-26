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
  onRemove: (key: TransactionFilterChip['key']) => void;
}>;

export function TransactionFilters({ filters, onRemove }: Props) {
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  if (filters.length === 0) return null;

  return (
    <View style={styles.filters}>
      {filters.map((filter) => (
        <Pressable
          accessibilityRole="button"
          key={filter.key}
          onPress={() => onRemove(filter.key)}
          style={styles.filter}
        >
          <Text numberOfLines={1} style={styles.filterText}>
            {filter.label}
          </Text>
          <MaterialCommunityIcons
            color={theme.colors.primary}
            name="close"
            size={16}
          />
        </Pressable>
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
      gap: 6,
    },
    filterText: {
      flexShrink: 1,
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },
  });
