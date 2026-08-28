import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import { calculateCategoryFundingState } from '@/domain/services/calculate-category-funding-state';
import { planCategoryAssignment } from '@/domain/services/plan-category-assignment';
import { Money } from '@/domain/value-objects/money';
import { CategoryBudgetModal } from '@/presentation/components/budget/category-budget-modal';
import { BudgetStatusBanner } from '@/presentation/components/budget/budget-status-banner';
import { CategoryGroupCard } from '@/presentation/components/categories/category-group-card';
import { MonthYearPickerModal } from '@/presentation/components/common/month-year-picker-modal';
import { NameInputModal } from '@/presentation/components/common/name-input-modal';
import { OverflowMenu } from '@/presentation/components/common/overflow-menu';
import { useBudgetOverview } from '@/presentation/hooks/use-budget-overview';
import { usePrefetchTransactionReferenceData } from '@/presentation/hooks/use-prefetch-transaction-reference-data';
import { useTranslation } from '@/presentation/localization/localization-provider';
import {
  MAIN_SCREEN_HEADER_HEIGHT,
  MAIN_SCREEN_HORIZONTAL_PADDING,
} from '@/presentation/layout/main-screen-layout';
import { routes } from '@/presentation/navigation/routes';
import type { TranslationKey } from '@/presentation/localization/translations';
import { usePreferences } from '@/presentation/preferences/preferences-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { formatMoney } from '@/presentation/utils/money';

type NameEditor =
  | Readonly<{ kind: 'create-group' }>
  | Readonly<{ kind: 'create-category'; groupId: string }>
  | Readonly<{ kind: 'rename-group'; id: string; name: string }>;

function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(month: string, language: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(language, {
    month: 'short',
    year: 'numeric',
  }).format(new Date(year ?? 0, (monthNumber ?? 1) - 1, 1));
}

function todayKey(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function BudgetScreen() {
  usePrefetchTransactionReferenceData();
  const router = useRouter();
  const { language, t } = useTranslation();
  const { preferences } = usePreferences();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [month, setMonth] = useState(monthKey);
  const {
    budget,
    targets,
    snoozes,
    error,
    loading,
    refresh,
    createGroup,
    createCategory,
    renameGroup,
    assign,
    setTargetSnoozed,
  } = useBudgetOverview(month);
  const [selectingMonth, setSelectingMonth] = useState(false);
  const [nameEditor, setNameEditor] = useState<NameEditor | null>(null);
  const [categoryEditorId, setCategoryEditorId] = useState<string | null>(null);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState(
    () => new Set<string>(),
  );
  const monthLabel = useMemo(
    () => formatMonth(month, language),
    [language, month],
  );
  const groups = useMemo(
    () =>
      budget?.groups.map(({ group, categories }) => ({
        group,
        categories: categories.map(({ category }) => category),
      })) ?? null,
    [budget],
  );
  const valuesByCategoryId = useMemo(
    () =>
      new Map(
        budget?.groups.flatMap(({ categories }) =>
          categories.map((values) => [values.category.id, values] as const),
        ) ?? [],
      ),
    [budget],
  );
  const budgetCategories = useMemo(
    () => budget?.groups.flatMap(({ categories }) => categories) ?? [],
    [budget],
  );
  const targetsByCategoryId = useMemo(
    () => new Map(targets?.map((target) => [target.categoryId, target]) ?? []),
    [targets],
  );
  const snoozedCategoryIds = useMemo(
    () => new Set(snoozes?.map((snooze) => snooze.categoryId) ?? []),
    [snoozes],
  );
  const fundingByCategoryId = useMemo(
    () =>
      new Map(
        budgetCategories.map((values) => {
          const target = targetsByCategoryId.get(values.category.id);
          return [
            values.category.id,
            calculateCategoryFundingState({
              values,
              ...(target ? { target } : {}),
              targetSnoozed: snoozedCategoryIds.has(values.category.id),
              month,
              today: todayKey(),
            }),
          ] as const;
        }),
      ),
    [budgetCategories, month, snoozedCategoryIds, targetsByCategoryId],
  );
  const categoryEditor = categoryEditorId
    ? (valuesByCategoryId.get(categoryEditorId) ?? null)
    : null;
  const firstDeficitMonth = budget?.funding.firstDeficitMonth;
  const primaryBudgetStatus = useMemo(() => {
    if (!budget) return null;
    switch (budget.funding.status) {
      case 'assigned-too-much':
        return {
          actionLabel: t('budget.assignedTooMuch'),
          label: formatMoney(budget.funding.assignedTooMuch),
          tone: 'negative' as const,
        };
      case 'future-assignments':
        return {
          actionLabel: t('budget.futureAssignmentsAvailable'),
          label: formatMoney(budget.funding.futureAssignmentsAvailable),
          tone: 'warning' as const,
        };
      case 'ready-to-assign':
        return {
          actionLabel: t('budget.readyToAssign'),
          label: formatMoney(budget.funding.readyToAssign),
          tone: 'positive' as const,
        };
    }
  }, [budget, t]);

  async function submitName(name: string) {
    if (!nameEditor) return;

    switch (nameEditor.kind) {
      case 'create-group':
        await createGroup(name);
        break;
      case 'create-category':
        await createCategory(nameEditor.groupId, name);
        break;
      case 'rename-group':
        await renameGroup(nameEditor.id, name);
        break;
    }
  }

  function openCategoryDetails(
    values: BudgetCategoryValues,
    dismissOverlay?: () => void,
  ) {
    dismissOverlay?.();
    requestAnimationFrame(() => {
      router.push(routes.category(values.category.id, month));
    });
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text numberOfLines={1} style={styles.title}>
            {preferences.budgetName}
          </Text>
          <Pressable
            accessibilityLabel={t('budget.chooseMonth')}
            onPress={() => setSelectingMonth(true)}
            style={styles.monthSelector}
          >
            <Text style={styles.month}>{monthLabel}</Text>
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="chevron-down-circle"
              size={21}
            />
          </Pressable>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel={t('budget.edit')}
            accessibilityRole="button"
            onPress={() => router.push(routes.editBudget(month))}
            style={styles.editButton}
          >
            <MaterialCommunityIcons
              color={theme.colors.primary}
              name="pencil-outline"
              size={23}
            />
          </Pressable>
          <OverflowMenu
            items={[
              {
                label: t('budget.edit'),
                onPress: () => router.push(routes.editBudget(month)),
              },
            ]}
          />
        </View>
      </View>

      {budget && primaryBudgetStatus ? (
        <View style={styles.primaryBannerContainer}>
          <BudgetStatusBanner
            actionLabel={primaryBudgetStatus.actionLabel}
            label={primaryBudgetStatus.label}
            prominence="primary"
            tone={primaryBudgetStatus.tone}
          />
        </View>
      ) : null}

      <FlatList
        contentContainerStyle={styles.content}
        data={groups ?? []}
        keyExtractor={(summary) => summary.group.id}
        ListEmptyComponent={
          groups?.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>
                {t('budget.createFirstGroup')}
              </Text>
              <Text style={styles.emptyDescription}>
                {t('budget.createFirstGroupHint')}
              </Text>
              <Pressable
                onPress={() => setNameEditor({ kind: 'create-group' })}
                style={styles.emptyAction}
              >
                <Text style={styles.emptyActionText}>
                  {t('budget.createGroup')}
                </Text>
              </Pressable>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <>
            {budget && primaryBudgetStatus ? (
              <>
                {budget.funding.status === 'future-assignments' &&
                budget.funding.futureAssignmentsUsed.cents > 0 &&
                firstDeficitMonth ? (
                  <View>
                    <BudgetStatusBanner
                      actionLabel={t('budget.review')}
                      label={t('budget.usingFutureAssignments', {
                        amount: formatMoney(
                          budget.funding.futureAssignmentsUsed,
                        ),
                      })}
                      onPress={() => setMonth(firstDeficitMonth)}
                      tone="notice"
                    />
                  </View>
                ) : null}
                {budget.uncategorized.transactionCount > 0 ? (
                  <View style={styles.secondaryBanner}>
                    <BudgetStatusBanner
                      actionLabel={t('budget.review')}
                      label={`${formatMoney(budget.uncategorized.amount)} · ${t(
                        budget.uncategorized.transactionCount === 1
                          ? 'budget.newTransactionCount'
                          : 'budget.newTransactionsCount',
                        { count: budget.uncategorized.transactionCount },
                      )}`}
                      onPress={() =>
                        router.navigate(routes.uncategorizedTransactions())
                      }
                      tone="notice"
                    />
                  </View>
                ) : null}
              </>
            ) : null}

            {error ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            ) : null}

            {loading && !budget ? (
              <ActivityIndicator
                accessibilityLabel={t('common.loading')}
                color={theme.colors.primary}
              />
            ) : null}
          </>
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => void refresh()}
            refreshing={loading && budget !== null}
          />
        }
        renderItem={({ item: summary }) => (
          <CategoryGroupCard
            expanded={!collapsedGroupIds.has(summary.group.id)}
            onToggleExpanded={() =>
              setCollapsedGroupIds((current) => {
                const next = new Set(current);
                if (next.has(summary.group.id)) next.delete(summary.group.id);
                else next.add(summary.group.id);
                return next;
              })
            }
            fundingByCategoryId={fundingByCategoryId}
            onSelectCategory={(values) =>
              setCategoryEditorId(values.category.id)
            }
            summary={summary}
            valuesByCategoryId={valuesByCategoryId}
          />
        )}
      />

      <Pressable
        accessibilityLabel={t('transactions.add')}
        onPress={() => router.push(routes.newTransaction())}
        style={styles.fab}
      >
        <Text style={styles.fabText}>+ {t('budget.addTransaction')}</Text>
      </Pressable>

      {nameEditor ? (
        <NameInputModal
          initialValue={
            nameEditor.kind === 'rename-group' ? nameEditor.name : undefined
          }
          label={
            nameEditor.kind.includes('group')
              ? t('budget.groupName')
              : t('budget.categoryName')
          }
          onDismiss={() => setNameEditor(null)}
          onSubmit={submitName}
          submitLabel={
            nameEditor.kind === 'create-group'
              ? t('budget.createGroup')
              : nameEditor.kind === 'create-category'
                ? t('budget.createCategory')
                : t('common.save')
          }
          title={t(editorTitleKey(nameEditor))}
        />
      ) : null}

      {categoryEditor ? (
        <CategoryBudgetModal
          funding={fundingByCategoryId.get(categoryEditor.category.id)!}
          key={`${categoryEditor.category.id}-${categoryEditor.assigned.cents}`}
          values={categoryEditor}
          readyToAssignCents={budget?.funding.assignableNow.cents ?? 0}
          monthLabel={monthLabel}
          onDetails={() =>
            openCategoryDetails(categoryEditor, () => setCategoryEditorId(null))
          }
          onDismiss={() => setCategoryEditorId(null)}
          onMoveMoney={() => {
            router.push(routes.moveBudget(month, categoryEditor.category.id));
            setCategoryEditorId(null);
          }}
          onSave={(amountCents) =>
            assign(categoryEditor.category.id, amountCents)
          }
          onSmartAssign={async () => {
            const funding = fundingByCategoryId.get(categoryEditor.category.id);
            if (!funding || funding.requiredAssignment.cents <= 0) return;
            const assignmentPlan = planCategoryAssignment(
              funding.requiredAssignment,
              budget?.funding.assignableNow ?? Money.zero(),
            );
            if (assignmentPlan.kind === 'assign-directly') {
              await assign(
                categoryEditor.category.id,
                categoryEditor.assigned.cents + assignmentPlan.amountCents,
              );
              return;
            }
            if (assignmentPlan.kind === 'none') return;
            setCategoryEditorId(null);
            router.push(
              routes.moveBudget(
                month,
                categoryEditor.category.id,
                assignmentPlan.amountCents,
              ),
            );
          }}
          onToggleSnooze={() => {
            const funding = fundingByCategoryId.get(categoryEditor.category.id);
            return setTargetSnoozed(
              categoryEditor.category.id,
              !funding?.targetSnoozed,
            );
          }}
        />
      ) : null}

      {selectingMonth ? (
        <MonthYearPickerModal
          onDismiss={() => setSelectingMonth(false)}
          onSelect={setMonth}
          value={month}
        />
      ) : null}
    </SafeAreaView>
  );
}

function editorTitleKey(editor: NameEditor): TranslationKey {
  switch (editor.kind) {
    case 'create-group':
      return 'budget.newGroup';
    case 'create-category':
      return 'budget.newCategory';
    case 'rename-group':
      return 'budget.renameGroup';
  }
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    safeArea: { flex: 1, backgroundColor: theme.colors.background },
    header: {
      minHeight: MAIN_SCREEN_HEADER_HEIGHT,
      paddingHorizontal: MAIN_SCREEN_HORIZONTAL_PADDING,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerCopy: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    title: {
      color: theme.colors.text,
      fontSize: 24,
      fontWeight: '700',
      letterSpacing: -0.6,
    },
    monthSelector: {
      minHeight: 38,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: 13,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    month: {
      color: theme.colors.text,
      fontSize: 15,
      fontWeight: '700',
    },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    editButton: {
      minHeight: 40,
      paddingHorizontal: 12,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
    },
    content: {
      width: '100%',
      maxWidth: 820,
      paddingHorizontal: 12,
      paddingTop: 10,
      paddingBottom: 120,
      alignSelf: 'center',
      gap: 8,
    },
    primaryBannerContainer: {
      width: '100%',
      maxWidth: 820,
      paddingHorizontal: 12,
      paddingTop: 10,
      alignSelf: 'center',
    },
    error: {
      padding: 12,
      color: theme.colors.negative,
      backgroundColor: theme.colors.negativeMuted,
      borderRadius: 10,
      fontSize: 14,
    },
    secondaryBanner: { marginTop: 6 },
    emptyState: { paddingVertical: 64, alignItems: 'center', gap: 10 },
    emptyTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
    emptyDescription: {
      color: theme.colors.textMuted,
      fontSize: 15,
      textAlign: 'center',
    },
    emptyAction: {
      minHeight: 46,
      paddingHorizontal: 18,
      marginTop: 12,
      borderColor: theme.colors.primary,
      borderRadius: 23,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyActionText: {
      color: theme.colors.primary,
      fontSize: 14,
      fontWeight: '700',
    },
    fab: {
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
    fabText: { color: theme.colors.onPrimary, fontSize: 14, fontWeight: '700' },
  });
