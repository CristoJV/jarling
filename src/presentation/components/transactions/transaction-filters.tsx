import { StyleSheet, View } from 'react-native';

import { FilterChip } from '@/presentation/components/common/filter-chip';
import type { TransactionFilterChip } from '@/presentation/utils/transaction-search';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

type Props = Readonly<{
  filters: readonly TransactionFilterChip[];
  onPress: (key: TransactionFilterChip['key']) => void;
  onRemove: (key: TransactionFilterChip['key']) => void;
}>;

export function TransactionFilters({ filters, onPress, onRemove }: Props) {
  const styles = useThemedStyles(createStyles);
  if (filters.length === 0) return null;

  return (
    <View style={styles.filters}>
      {filters.map((filter) => (
        <FilterChip
          key={filter.key}
          label={filter.label}
          onPress={() => onPress(filter.key)}
          onRemove={() => onRemove(filter.key)}
        />
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
  });
