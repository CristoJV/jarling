import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategoryTarget } from '@/domain/entities/category-target';
import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import { formatMoney } from '@/presentation/utils/money';
import { targetDescription } from '@/presentation/utils/target';
import { SafeBottomSheet } from '@/presentation/components/common/safe-bottom-sheet';
import { AnimatedBottomSheetModal } from '@/presentation/components/common/animated-bottom-sheet-modal';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

type CategoryDetailsModalProps = Readonly<{
  values: BudgetCategoryValues;
  target?: CategoryTarget;
  onDismiss: () => void;
  onEditTarget: () => void;
  onRename: () => void;
  onToggleHidden: () => void;
}>;

export function CategoryDetailsModal({
  values,
  target,
  onDismiss,
  onEditTarget,
  onRename,
  onToggleHidden,
}: CategoryDetailsModalProps) {
  const { language, t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <AnimatedBottomSheetModal onDismiss={onDismiss}>
      <SafeBottomSheet style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>{t('budget.details')}</Text>

        <Pressable onPress={onRename} style={styles.nameCard}>
          <Text style={styles.label}>{t('budget.categoryName')}</Text>
          <Text style={styles.name}>{values.category.name}</Text>
          <Text style={styles.editHint}>{t('budget.tapToRename')}</Text>
        </Pressable>

        <View style={styles.valuesCard}>
          <Value
            label={t('budget.assigned')}
            value={formatMoney(values.assigned)}
          />
          <Value
            label={t('budget.activity')}
            value={formatMoney(values.activity)}
          />
          <Value
            label={t('budget.available')}
            value={formatMoney(values.available)}
          />
        </View>

        <View style={styles.targetCard}>
          <Text style={styles.label}>{t('budget.target')}</Text>
          <Text style={styles.targetDescription}>
            {target
              ? targetDescription(target, language)
              : t('budget.noTarget')}
          </Text>
          <Pressable onPress={onEditTarget} style={styles.targetButton}>
            <Text style={styles.targetButtonText}>
              {target ? t('budget.editTarget') : t('targets.set')}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={onToggleHidden} style={styles.hideButton}>
          <Text style={styles.hideText}>
            {values.category.hidden ? t('budget.unhide') : t('budget.hide')}
          </Text>
        </Pressable>
      </SafeBottomSheet>
    </AnimatedBottomSheetModal>
  );
}

function Value({ label, value }: Readonly<{ label: string; value: string }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.value}>
      <Text style={styles.valueLabel}>{label}</Text>
      <Text style={styles.valueAmount}>{value}</Text>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sheet: {
      padding: 24,
      paddingBottom: 38,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      gap: 16,
    },
    handle: {
      width: 44,
      height: 5,
      marginBottom: 8,
      backgroundColor: theme.colors.border,
      borderRadius: 3,
      alignSelf: 'center',
    },
    title: { color: theme.colors.text, fontSize: 26, fontWeight: '800' },
    nameCard: {
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
    },
    label: { color: theme.colors.textMuted, fontSize: 12, fontWeight: '700' },
    name: {
      marginTop: 3,
      color: theme.colors.text,
      fontSize: 20,
      fontWeight: '700',
    },
    editHint: {
      marginTop: 4,
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: '700',
    },
    valuesCard: {
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    value: { alignItems: 'center', gap: 4 },
    valueLabel: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
    },
    valueAmount: {
      color: theme.colors.text,
      fontSize: 14,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    targetCard: {
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderRadius: 18,
    },
    targetDescription: {
      marginTop: 5,
      color: theme.colors.text,
      fontSize: 17,
      fontWeight: '600',
    },
    targetButton: {
      minHeight: 50,
      marginTop: 16,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
    },
    targetButtonText: {
      color: theme.colors.primary,
      fontSize: 16,
      fontWeight: '800',
    },
    hideButton: {
      minHeight: 52,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hideText: { color: theme.colors.negative, fontSize: 15, fontWeight: '800' },
  });
