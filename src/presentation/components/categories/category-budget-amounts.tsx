import { StyleSheet, Text, View } from 'react-native';

import { Money } from '@/domain/value-objects/money';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';
import { formatMoney } from '@/presentation/utils/money';

type Props = Readonly<{
  assigned?: Money;
  available: Money;
}>;

export function CategoryBudgetAmounts({ assigned, available }: Props) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const assignedLabel = assigned ? formatMoney(assigned) : undefined;
  const availableLabel = formatMoney(available);

  return (
    <View
      accessible
      accessibilityLabel={
        assignedLabel
          ? `${t('budget.assigned')}: ${assignedLabel}. ${t('budget.available')}: ${availableLabel}`
          : `${t('budget.readyToAssign')}: ${availableLabel}`
      }
      style={styles.amounts}
    >
      {assignedLabel ? (
        <>
          <Text style={styles.assigned}>{assignedLabel}</Text>
          <Text style={styles.separator}>/</Text>
        </>
      ) : null}
      <Text
        style={[
          styles.available,
          available.cents < 0 && styles.availableNegative,
        ]}
      >
        {availableLabel}
      </Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    amounts: {
      flexShrink: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 4,
    },
    assigned: {
      color: theme.colors.primary,
      fontSize: 13,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    separator: { color: theme.colors.textMuted, fontSize: 12 },
    available: {
      color: theme.colors.positive,
      fontSize: 13,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    availableNegative: { color: theme.colors.negative },
  });
