import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { CategoryTarget } from '@/domain/entities/category-target';
import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import type { TargetProgress } from '@/domain/services/calculate-target-progress';
import { Money } from '@/domain/value-objects/money';
import { isProtectedCategoryGroup } from '@/domain/policies/system-categories';
import { formatMoney } from '@/presentation/utils/money';
import { targetDescription } from '@/presentation/utils/target';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';
import {
  categoryDisplayName,
  groupDisplayName,
} from '@/presentation/utils/category-name';

type EditBudgetViewProps = Readonly<{
  groups: readonly CategoryGroupSummary[];
  monthLabel: string;
  targetsByCategoryId: ReadonlyMap<string, CategoryTarget>;
  progressByCategoryId: ReadonlyMap<string, TargetProgress>;
  valuesByCategoryId: ReadonlyMap<string, BudgetCategoryValues>;
  onDismiss: () => void;
  onAddCategory: (groupId: string) => void;
  onAddGroup: () => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onSelectCategory: (values: BudgetCategoryValues) => void;
}>;

export function EditBudgetView({
  groups,
  monthLabel,
  targetsByCategoryId,
  progressByCategoryId,
  valuesByCategoryId,
  onDismiss,
  onAddCategory,
  onAddGroup,
  onRenameGroup,
  onSelectCategory,
}: EditBudgetViewProps) {
  const { language, t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const totalTargets = Money.fromCents(
    [...progressByCategoryId.values()].reduce(
      (total, progress) => total + progress.monthlyTarget.cents,
      0,
    ),
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable onPress={onDismiss} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </Pressable>
        <Text style={styles.title}>{t('budget.edit')}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.total}>{formatMoney(totalTargets)}</Text>
        <Text style={styles.totalLabel}>{t('budget.costToBeMe')}</Text>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>
            {t('budget.monthTargets', { month: monthLabel })}
          </Text>
          <Text style={styles.summaryValue}>{formatMoney(totalTargets)}</Text>
        </View>

        {groups.map(({ group, categories }) => (
          <View key={group.id} style={styles.groupSection}>
            <View style={styles.groupHeader}>
              <Pressable
                disabled={isProtectedCategoryGroup(group.id)}
                onPress={() =>
                  onRenameGroup(group.id, groupDisplayName(group, t))
                }
              >
                <Text style={styles.groupName}>
                  {groupDisplayName(group, t)}
                </Text>
              </Pressable>
              {!isProtectedCategoryGroup(group.id) ? (
                <Pressable
                  accessibilityLabel={t('budget.addCategoryTo', {
                    group: groupDisplayName(group, t),
                  })}
                  onPress={() => onAddCategory(group.id)}
                  style={styles.addButton}
                >
                  <Text style={styles.addText}>+</Text>
                </Pressable>
              ) : null}
            </View>
            <View style={styles.categoryCard}>
              {categories.map((category) => {
                const values = valuesByCategoryId.get(category.id);
                const target = targetsByCategoryId.get(category.id);
                const progress = progressByCategoryId.get(category.id);
                return (
                  <Pressable
                    disabled={!values}
                    key={category.id}
                    onPress={() => values && onSelectCategory(values)}
                    style={styles.categoryRow}
                  >
                    <View style={styles.categoryCopy}>
                      <Text numberOfLines={1} style={styles.categoryName}>
                        {categoryDisplayName(category, t)}
                      </Text>
                      {category.hidden ? (
                        <Text style={styles.hidden}>{t('budget.hidden')}</Text>
                      ) : null}
                    </View>
                    <View style={styles.targetCopy}>
                      {target ? (
                        <>
                          <Text style={styles.targetAmount}>
                            {formatMoney(
                              progress?.monthlyTarget ?? target.amount,
                            )}
                          </Text>
                          <Text
                            numberOfLines={1}
                            style={styles.targetDescription}
                          >
                            {target.kind === 'weekly'
                              ? `${formatMoney(target.amount)} ${t('targets.weekly')}`
                              : targetDescription(target, language)}
                          </Text>
                        </>
                      ) : (
                        <Text style={styles.addTarget}>
                          {t('budget.addTarget')}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.chevron}>›</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}

        <Pressable onPress={onAddGroup} style={styles.addGroupButton}>
          <Text style={styles.addGroupText}>+ {t('budget.newGroup')}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: 64,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    back: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    backText: { color: theme.colors.primary, fontSize: 38, lineHeight: 40 },
    title: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: '700',
    },
    headerSpacer: { width: 44 },
    content: {
      width: '100%',
      maxWidth: 760,
      padding: 20,
      paddingBottom: 48,
      alignSelf: 'center',
    },
    total: {
      marginTop: 8,
      color: theme.colors.text,
      fontSize: 46,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      textAlign: 'center',
    },
    totalLabel: {
      marginBottom: 24,
      color: theme.colors.textMuted,
      fontSize: 16,
      fontWeight: '700',
      textAlign: 'center',
    },
    summaryCard: {
      minHeight: 76,
      paddingHorizontal: 20,
      marginBottom: 26,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 20,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    summaryLabel: {
      color: theme.colors.textSecondary,
      fontSize: 16,
      fontWeight: '700',
    },
    summaryValue: {
      color: theme.colors.positive,
      fontSize: 18,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    groupSection: { marginBottom: 22 },
    groupHeader: {
      minHeight: 50,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    groupName: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
    addButton: {
      width: 38,
      height: 38,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addText: {
      color: theme.colors.primary,
      fontSize: 27,
      lineHeight: 29,
      fontWeight: '700',
    },
    categoryCard: {
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 20,
      borderWidth: 1,
      overflow: 'hidden',
    },
    categoryRow: {
      minHeight: 72,
      paddingHorizontal: 18,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    categoryCopy: { flex: 1 },
    categoryName: { color: theme.colors.text, fontSize: 16, fontWeight: '600' },
    hidden: {
      marginTop: 2,
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
    },
    targetCopy: { maxWidth: '46%', alignItems: 'flex-end' },
    targetAmount: {
      color: theme.colors.text,
      fontSize: 15,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    targetDescription: {
      marginTop: 2,
      color: theme.colors.textMuted,
      fontSize: 11,
    },
    addTarget: { color: theme.colors.primary, fontSize: 15, fontWeight: '800' },
    chevron: { color: theme.colors.textMuted, fontSize: 24 },
    addGroupButton: {
      minHeight: 52,
      borderColor: theme.colors.textMuted,
      borderRadius: 16,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addGroupText: {
      color: theme.colors.primary,
      fontSize: 15,
      fontWeight: '800',
    },
  });
