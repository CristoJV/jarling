import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import { calculateTargetProgress } from '@/domain/services/calculate-target-progress';
import { CategoryBudgetModal } from '@/presentation/components/budget/category-budget-modal';
import { EditBudgetModal } from '@/presentation/components/budget/edit-budget-modal';
import { MoveBudgetModal } from '@/presentation/components/budget/move-budget-modal';
import { CategoryDetailsModal } from '@/presentation/components/categories/category-details-modal';
import { CategoryGroupCard } from '@/presentation/components/categories/category-group-card';
import { MonthYearPickerModal } from '@/presentation/components/common/month-year-picker-modal';
import { NameInputModal } from '@/presentation/components/common/name-input-modal';
import { OverflowMenu } from '@/presentation/components/common/overflow-menu';
import { TargetEditorModal } from '@/presentation/components/targets/target-editor-modal';
import { useBudget } from '@/presentation/hooks/use-budget';
import { useCategories } from '@/presentation/hooks/use-categories';
import { useTargets } from '@/presentation/hooks/use-targets';
import { formatMoney } from '@/presentation/utils/money';

type NameEditor =
  | Readonly<{ kind: 'create-group' }>
  | Readonly<{ kind: 'create-category'; groupId: string }>
  | Readonly<{ kind: 'rename-group'; id: string; name: string }>
  | Readonly<{ kind: 'rename-category'; id: string; name: string }>;

const monthFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  year: 'numeric',
});

function monthKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-').map(Number);
  return monthFormatter.format(new Date(year ?? 0, (monthNumber ?? 1) - 1, 1));
}

function todayKey(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function BudgetScreen() {
  const router = useRouter();
  const [month, setMonth] = useState(monthKey);
  const {
    groups,
    error: categoryError,
    loading: categoriesLoading,
    refresh: refreshCategories,
    createGroup,
    createCategory,
    renameGroup,
    renameCategory,
    setCategoryHidden,
  } = useCategories();
  const {
    budget,
    error: budgetError,
    loading: budgetLoading,
    refresh: refreshBudget,
    assign,
    move,
  } = useBudget(month);
  const {
    targets,
    error: targetError,
    loading: targetsLoading,
    refresh: refreshTargets,
    setTarget,
    deleteTarget,
  } = useTargets();
  const [editingBudget, setEditingBudget] = useState(false);
  const [selectingMonth, setSelectingMonth] = useState(false);
  const [nameEditor, setNameEditor] = useState<NameEditor | null>(null);
  const [categoryEditor, setCategoryEditor] =
    useState<BudgetCategoryValues | null>(null);
  const [categoryDetails, setCategoryDetails] =
    useState<BudgetCategoryValues | null>(null);
  const [targetEditor, setTargetEditor] = useState<BudgetCategoryValues | null>(
    null,
  );
  const [moveTarget, setMoveTarget] = useState<BudgetCategoryValues | null>(
    null,
  );
  const monthLabel = useMemo(() => formatMonth(month), [month]);
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
                  calculateTargetProgress({
                    target,
                    assigned: values.assigned,
                    available: values.available,
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
      case 'rename-category':
        await renameCategory(nameEditor.id, name);
        break;
    }
    await refreshBudget();
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>Budget</Text>
          <Pressable
            accessibilityLabel="Choose budget month"
            onPress={() => setSelectingMonth(true)}
            style={styles.monthSelector}
          >
            <Text style={styles.month}>{monthLabel}</Text>
            <Text style={styles.monthArrow}>⌄</Text>
          </Pressable>
        </View>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => setEditingBudget(true)}
            style={styles.editButton}
          >
            <Text style={styles.editButtonText}>Edit</Text>
          </Pressable>
          <OverflowMenu
            items={[
              {
                label: 'Edit Budget',
                onPress: () => setEditingBudget(true),
              },
            ]}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void refreshAll()}
            refreshing={
              (categoriesLoading || budgetLoading || targetsLoading) &&
              groups !== null
            }
          />
        }
      >
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
            <Text style={styles.rtaLabel}>Ready to Assign ›</Text>
          </View>
        ) : null}

        <View style={styles.sectionHeading}>
          <View>
            <Text style={styles.sectionTitle}>Categorías</Text>
            <Text style={styles.sectionDescription}>
              Tap a category to assign, move money or view details.
            </Text>
          </View>
        </View>

        {categoryError || budgetError || targetError ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {categoryError ?? budgetError ?? targetError}
          </Text>
        ) : null}

        {(categoriesLoading || budgetLoading || targetsLoading) && !groups ? (
          <ActivityIndicator
            accessibilityLabel="Cargando presupuesto"
            color="#294d36"
          />
        ) : null}

        {groups?.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Crea tu primer grupo</Text>
            <Text style={styles.emptyDescription}>
              Por ejemplo: Necesidades, Deseos o Ahorro.
            </Text>
            <Pressable
              onPress={() => setNameEditor({ kind: 'create-group' })}
              style={styles.emptyAction}
            >
              <Text style={styles.emptyActionText}>Crear grupo</Text>
            </Pressable>
          </View>
        ) : null}

        {groups?.map((summary) => (
          <CategoryGroupCard
            key={summary.group.id}
            onSelectCategory={setCategoryEditor}
            progressByCategoryId={progressByCategoryId}
            summary={summary}
            targetsByCategoryId={targetsByCategoryId}
            valuesByCategoryId={valuesByCategoryId}
          />
        ))}
      </ScrollView>

      <Pressable
        accessibilityLabel="Añadir transacción"
        onPress={() =>
          router.push({ pathname: '/transactions', params: { create: '1' } })
        }
        style={styles.fab}
      >
        <Text style={styles.fabText}>+ Transaction</Text>
      </Pressable>

      {editingBudget && groups ? (
        <EditBudgetModal
          groups={groups}
          monthLabel={monthLabel}
          onAddGroup={() => setNameEditor({ kind: 'create-group' })}
          onAddCategory={(groupId) =>
            setNameEditor({ kind: 'create-category', groupId })
          }
          onDismiss={() => setEditingBudget(false)}
          onRenameGroup={(id, name) =>
            setNameEditor({ kind: 'rename-group', id, name })
          }
          onSelectCategory={setCategoryDetails}
          progressByCategoryId={progressByCategoryId}
          targetsByCategoryId={targetsByCategoryId}
          valuesByCategoryId={valuesByCategoryId}
        />
      ) : null}

      {nameEditor ? (
        <NameInputModal
          initialValue={
            nameEditor.kind === 'rename-group' ||
            nameEditor.kind === 'rename-category'
              ? nameEditor.name
              : undefined
          }
          label={
            nameEditor.kind.includes('group')
              ? 'Nombre del grupo'
              : 'Nombre de la categoría'
          }
          onDismiss={() => setNameEditor(null)}
          onSubmit={submitName}
          submitLabel={
            nameEditor.kind.startsWith('create') ? 'Crear' : 'Guardar'
          }
          title={editorTitle(nameEditor)}
        />
      ) : null}

      {categoryDetails ? (
        <CategoryDetailsModal
          onDismiss={() => setCategoryDetails(null)}
          onEditTarget={() => {
            setTargetEditor(categoryDetails);
            setCategoryDetails(null);
          }}
          onRename={() => {
            setCategoryDetails(null);
            setNameEditor({
              kind: 'rename-category',
              id: categoryDetails.category.id,
              name: categoryDetails.category.name,
            });
          }}
          onToggleHidden={() => {
            void setCategoryHidden(
              categoryDetails.category.id,
              !categoryDetails.category.hidden,
            ).then(async () => {
              await refreshBudget();
              setCategoryDetails(null);
            });
          }}
          target={targetsByCategoryId.get(categoryDetails.category.id)}
          values={categoryDetails}
        />
      ) : null}

      {targetEditor ? (
        <TargetEditorModal
          categoryId={targetEditor.category.id}
          categoryName={targetEditor.category.name}
          onDelete={deleteTarget}
          onDismiss={() => setTargetEditor(null)}
          onSave={setTarget}
          target={targetsByCategoryId.get(targetEditor.category.id)}
        />
      ) : null}

      {categoryEditor ? (
        <CategoryBudgetModal
          values={categoryEditor}
          monthLabel={monthLabel}
          onDismiss={() => setCategoryEditor(null)}
          onMoveMoney={() => {
            setMoveTarget(categoryEditor);
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

      {moveTarget ? (
        <MoveBudgetModal
          categories={budgetCategories}
          initialTarget={moveTarget}
          monthLabel={monthLabel}
          onDismiss={() => setMoveTarget(null)}
          onMove={move}
        />
      ) : null}
    </SafeAreaView>
  );
}

function editorTitle(editor: NameEditor): string {
  switch (editor.kind) {
    case 'create-group':
      return 'Nuevo grupo';
    case 'create-category':
      return 'Nueva categoría';
    case 'rename-group':
      return 'Renombrar grupo';
    case 'rename-category':
      return 'Renombrar categoría';
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f7f5' },
  header: {
    minHeight: 82,
    paddingHorizontal: 20,
    borderBottomColor: '#dfe3dc',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerCopy: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  title: {
    color: '#18201a',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  monthSelector: {
    minHeight: 42,
    paddingHorizontal: 12,
    backgroundColor: '#edf1ed',
    borderRadius: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  month: {
    color: '#253028',
    fontSize: 15,
    fontWeight: '700',
  },
  monthArrow: {
    color: '#496451',
    fontSize: 17,
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  editButton: {
    minHeight: 40,
    paddingHorizontal: 12,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editButtonText: { color: '#315a3e', fontSize: 14, fontWeight: '700' },
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
    backgroundColor: '#cfe8d2',
    borderRadius: 37,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  rtaCardNegative: { backgroundColor: '#fde8e5' },
  rtaLabel: {
    color: '#285136',
    fontSize: 15,
    fontWeight: '700',
  },
  rtaValue: {
    color: '#1e5530',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  rtaNegative: { color: '#b42318' },
  sectionHeading: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  sectionTitle: { color: '#253028', fontSize: 20, fontWeight: '700' },
  sectionDescription: {
    maxWidth: 430,
    marginTop: 3,
    color: '#687268',
    fontSize: 12,
  },
  error: {
    padding: 12,
    color: '#b42318',
    backgroundColor: '#fef3f2',
    borderRadius: 10,
    fontSize: 14,
  },
  emptyState: { paddingVertical: 64, alignItems: 'center', gap: 10 },
  emptyTitle: { color: '#253028', fontSize: 20, fontWeight: '700' },
  emptyDescription: { color: '#687268', fontSize: 15, textAlign: 'center' },
  emptyAction: {
    minHeight: 46,
    paddingHorizontal: 18,
    marginTop: 12,
    borderColor: '#294d36',
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionText: { color: '#294d36', fontSize: 14, fontWeight: '700' },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 22,
    minHeight: 52,
    paddingHorizontal: 20,
    backgroundColor: '#294d36',
    borderRadius: 26,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
});
