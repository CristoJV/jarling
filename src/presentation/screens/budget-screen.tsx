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
import { calculateBudgetCategoryTargetProgress } from '@/domain/services/calculate-target-progress';
import { CategoryBudgetModal } from '@/presentation/components/budget/category-budget-modal';
import { CategoryGroupCard } from '@/presentation/components/categories/category-group-card';
import { MonthYearPickerModal } from '@/presentation/components/common/month-year-picker-modal';
import { NameInputModal } from '@/presentation/components/common/name-input-modal';
import { OverflowMenu } from '@/presentation/components/common/overflow-menu';
import { useBudget } from '@/presentation/hooks/use-budget';
import { useCategories } from '@/presentation/hooks/use-categories';
import { useTargets } from '@/presentation/hooks/use-targets';
import { usePrefetchTransactionReferenceData } from '@/presentation/hooks/use-prefetch-transaction-reference-data';
import { useTranslation } from '@/presentation/localization/localization-provider';
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
    groups,
    error: categoryError,
    loading: categoriesLoading,
    refresh: refreshCategories,
    createGroup,
    createCategory,
    renameGroup,
  } = useCategories();
  const {
    budget,
    error: budgetError,
    loading: budgetLoading,
    refresh: refreshBudget,
    assign,
  } = useBudget(month);
  const {
    targets,
    error: targetError,
    loading: targetsLoading,
    refresh: refreshTargets,
  } = useTargets();
  const [selectingMonth, setSelectingMonth] = useState(false);
  const [nameEditor, setNameEditor] = useState<NameEditor | null>(null);
  const [categoryEditor, setCategoryEditor] =
    useState<BudgetCategoryValues | null>(null);
  const [collapsedGroupIds, setCollapsedGroupIds] = useState(
    () => new Set<string>(),
  );
  const monthLabel = useMemo(
    () => formatMonth(month, language),
    [language, month],
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
  const progressByCategoryId = useMemo(
    () =>
      new Map(
        budgetCategories.flatMap((values) => {
          const target = targetsByCategoryId.get(values.category.id);
          return target
            ? [
                [
                  values.category.id,
                  calculateBudgetCategoryTargetProgress({
                    target,
                    values,
                    month,
                    today: todayKey(),
                  }),
                ] as const,
              ]
            : [];
        }),
      ),
    [budgetCategories, month, targetsByCategoryId],
  );

  async function refreshAll() {
    await Promise.all([refreshCategories(), refreshBudget(), refreshTargets()]);
  }

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
    await refreshBudget();
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
            {budget ? (
              <View
                style={[
                  styles.rtaCard,
                  budget.readyToAssign.cents < 0 && styles.rtaCardNegative,
                ]}
              >
                <Text
                  style={[
                    styles.rtaValue,
                    budget.readyToAssign.cents < 0 && styles.rtaNegative,
                  ]}
                >
                  {formatMoney(budget.readyToAssign)}
                </Text>
                <Text style={styles.rtaLabel}>{t('budget.readyToAssign')}</Text>
              </View>
            ) : null}

            <View style={styles.sectionHeading}>
              <View>
                <Text style={styles.sectionTitle}>
                  {t('budget.categories')}
                </Text>
                <Text style={styles.sectionDescription}>
                  {t('budget.categoryHint')}
                </Text>
              </View>
            </View>

            {categoryError || budgetError || targetError ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {categoryError ?? budgetError ?? targetError}
              </Text>
            ) : null}

            {(categoriesLoading || budgetLoading || targetsLoading) &&
            !groups ? (
              <ActivityIndicator
                accessibilityLabel={t('common.loading')}
                color={theme.colors.primary}
              />
            ) : null}
          </>
        }
        refreshControl={
          <RefreshControl
            onRefresh={() => void refreshAll()}
            refreshing={
              (categoriesLoading || budgetLoading || targetsLoading) &&
              groups !== null
            }
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
            onSelectCategory={setCategoryEditor}
            progressByCategoryId={progressByCategoryId}
            summary={summary}
            targetsByCategoryId={targetsByCategoryId}
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
            nameEditor.kind.startsWith('create')
              ? t('budget.createGroup')
              : t('common.save')
          }
          title={t(editorTitleKey(nameEditor))}
        />
      ) : null}

      {categoryEditor ? (
        <CategoryBudgetModal
          values={categoryEditor}
          monthLabel={monthLabel}
          onDetails={() =>
            openCategoryDetails(categoryEditor, () => setCategoryEditor(null))
          }
          onDismiss={() => setCategoryEditor(null)}
          onMoveMoney={() => {
            router.push(routes.moveBudget(month, categoryEditor.category.id));
            setCategoryEditor(null);
          }}
          onSave={(amountCents) =>
            assign(categoryEditor.category.id, amountCents)
          }
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
      minHeight: 82,
      paddingHorizontal: 20,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerCopy: { flexDirection: 'row', alignItems: 'center', gap: 16 },
    title: {
      color: theme.colors.text,
      fontSize: 28,
      fontWeight: '700',
      letterSpacing: -0.6,
    },
    monthSelector: {
      minHeight: 42,
      paddingHorizontal: 12,
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
      padding: 20,
      paddingBottom: 120,
      alignSelf: 'center',
      gap: 14,
    },
    rtaCard: {
      minHeight: 74,
      paddingHorizontal: 22,
      backgroundColor: theme.colors.positiveMuted,
      borderRadius: 37,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    rtaCardNegative: { backgroundColor: theme.colors.negativeMuted },
    rtaLabel: {
      color: theme.colors.positive,
      fontSize: 15,
      fontWeight: '700',
    },
    rtaValue: {
      color: theme.colors.positive,
      fontSize: 28,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    rtaNegative: { color: theme.colors.negative },
    sectionHeading: {
      marginTop: 4,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 16,
    },
    sectionTitle: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
    sectionDescription: {
      maxWidth: 430,
      marginTop: 3,
      color: theme.colors.textMuted,
      fontSize: 12,
    },
    error: {
      padding: 12,
      color: theme.colors.negative,
      backgroundColor: theme.colors.negativeMuted,
      borderRadius: 10,
      fontSize: 14,
    },
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
