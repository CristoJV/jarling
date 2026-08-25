import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { calculateBudgetCategoryTargetProgress } from '@/domain/services/calculate-target-progress';
import { EditBudgetView } from '@/presentation/components/budget/edit-budget-view';
import { NameInputModal } from '@/presentation/components/common/name-input-modal';
import { useBudget } from '@/presentation/hooks/use-budget';
import { useCategories } from '@/presentation/hooks/use-categories';
import { useTargets } from '@/presentation/hooks/use-targets';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { TranslationKey } from '@/presentation/localization/translations';
import { routes } from '@/presentation/navigation/routes';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

type NameEditor =
  | Readonly<{ kind: 'create-group' }>
  | Readonly<{ kind: 'create-category'; groupId: string }>
  | Readonly<{ kind: 'rename-group'; id: string; name: string }>;

export function EditBudgetScreen() {
  const { month = currentMonth() } = useLocalSearchParams<{ month?: string }>();
  const router = useRouter();
  const { language, t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { groups, createGroup, createCategory, renameGroup } = useCategories();
  const { budget, refresh: refreshBudget } = useBudget(month);
  const { targets } = useTargets();
  const [editor, setEditor] = useState<NameEditor | null>(null);

  const values = useMemo(
    () => budget?.groups.flatMap(({ categories }) => categories) ?? [],
    [budget],
  );
  const valuesByCategoryId = useMemo(
    () => new Map(values.map((item) => [item.category.id, item] as const)),
    [values],
  );
  const targetsByCategoryId = useMemo(
    () => new Map(targets?.map((target) => [target.categoryId, target]) ?? []),
    [targets],
  );
  const progressByCategoryId = useMemo(
    () =>
      new Map(
        values.flatMap((item) => {
          const target = targetsByCategoryId.get(item.category.id);
          return target
            ? [
                [
                  item.category.id,
                  calculateBudgetCategoryTargetProgress({
                    target,
                    values: item,
                    month,
                    today: todayKey(),
                  }),
                ] as const,
              ]
            : [];
        }),
      ),
    [month, targetsByCategoryId, values],
  );

  async function submitName(name: string) {
    if (!editor) return;
    if (editor.kind === 'create-group') await createGroup(name);
    else if (editor.kind === 'create-category')
      await createCategory(editor.groupId, name);
    else await renameGroup(editor.id, name);
    await refreshBudget();
  }

  if (!groups || !budget || !targets) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={theme.colors.primary} size="large" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <EditBudgetView
        groups={groups}
        monthLabel={formatMonth(month, language)}
        onAddCategory={(groupId) =>
          setEditor({ kind: 'create-category', groupId })
        }
        onAddGroup={() => setEditor({ kind: 'create-group' })}
        onDismiss={() => router.back()}
        onRenameGroup={(id, name) =>
          setEditor({ kind: 'rename-group', id, name })
        }
        onSelectCategory={(item) =>
          router.push(routes.category(item.category.id, month))
        }
        progressByCategoryId={progressByCategoryId}
        targetsByCategoryId={targetsByCategoryId}
        valuesByCategoryId={valuesByCategoryId}
      />
      {editor ? (
        <NameInputModal
          initialValue={
            editor.kind === 'rename-group' ? editor.name : undefined
          }
          label={
            editor.kind.includes('group')
              ? t('budget.groupName')
              : t('budget.categoryName')
          }
          onDismiss={() => setEditor(null)}
          onSubmit={submitName}
          placement="center"
          submitLabel={
            editor.kind === 'create-group'
              ? t('budget.createGroup')
              : editor.kind === 'create-category'
                ? t('budget.createCategory')
                : t('common.save')
          }
          title={t(editorTitleKey(editor))}
        />
      ) : null}
    </View>
  );
}

function currentMonth(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function todayKey(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function formatMonth(month: string, language: string): string {
  const [year, number] = month.split('-').map(Number);
  return new Intl.DateTimeFormat(language, {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year ?? 0, (number ?? 1) - 1, 1));
}

function editorTitleKey(editor: NameEditor): TranslationKey {
  if (editor.kind === 'create-group') return 'budget.newGroup';
  if (editor.kind === 'create-category') return 'budget.newCategory';
  return 'budget.renameGroup';
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    screen: { flex: 1, backgroundColor: theme.colors.background },
    loading: {
      flex: 1,
      backgroundColor: theme.colors.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
