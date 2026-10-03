import { useCallback } from 'react';

import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { ReorderDirection } from '@/application/use-cases/categories/reorder-category-groups';
import { useApplication } from '@/presentation/contexts/application-context';
import { invalidateTransactionReferenceData } from '@/presentation/cache/transaction-reference-data';
import { useFocusedResource } from '@/presentation/hooks/use-focused-resource';

export function useCategories() {
  const application = useApplication();
  const load = useCallback(
    () => application.categories.getGroups.execute(),
    [application],
  );
  const {
    data: groups,
    error,
    loading,
    refresh,
    reportError,
    clearError,
  } = useFocusedResource<readonly CategoryGroupSummary[]>(load);

  const mutate = useCallback(
    async (operation: () => Promise<unknown>, rethrow: boolean) => {
      clearError();

      try {
        await operation();
        invalidateTransactionReferenceData();
        await refresh();
      } catch (cause) {
        const message = reportError(cause);

        if (rethrow) {
          throw new Error(message, { cause });
        }
      }
    },
    [clearError, refresh, reportError],
  );

  const createGroup = useCallback(
    (name: string) =>
      mutate(() => application.categories.createGroup.execute(name), true),
    [application, mutate],
  );

  const createCategory = useCallback(
    (groupId: string, name: string) =>
      mutate(
        () => application.categories.create.execute({ groupId, name }),
        true,
      ),
    [application, mutate],
  );

  const renameGroup = useCallback(
    (groupId: string, name: string) =>
      mutate(
        () => application.categories.renameGroup.execute(groupId, name),
        true,
      ),
    [application, mutate],
  );

  const renameCategory = useCallback(
    (categoryId: string, name: string) =>
      mutate(
        () => application.categories.rename.execute(categoryId, name),
        true,
      ),
    [application, mutate],
  );

  const reorderGroup = useCallback(
    (groupId: string, direction: ReorderDirection) =>
      mutate(
        () => application.categories.reorderGroups.execute(groupId, direction),
        false,
      ),
    [application, mutate],
  );

  const reorderCategory = useCallback(
    (categoryId: string, direction: ReorderDirection) =>
      mutate(
        () => application.categories.reorder.execute(categoryId, direction),
        false,
      ),
    [application, mutate],
  );

  const setCategoryHidden = useCallback(
    (categoryId: string, hidden: boolean) =>
      mutate(
        () => application.categories.setHidden.execute(categoryId, hidden),
        false,
      ),
    [application, mutate],
  );

  return {
    groups,
    error,
    loading,
    refresh,
    createGroup,
    createCategory,
    renameGroup,
    renameCategory,
    reorderGroup,
    reorderCategory,
    setCategoryHidden,
  };
}
