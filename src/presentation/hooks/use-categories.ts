import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { ReorderDirection } from '@/application/use-cases/categories/reorder-category-groups';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';
import { invalidateTransactionReferenceData } from '@/presentation/cache/transaction-reference-data';

export function useCategories() {
  const application = useApplication();
  const { t } = useTranslation();
  const [groups, setGroups] = useState<readonly CategoryGroupSummary[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);

    try {
      setGroups(await application.categories.getGroups.execute());
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    } finally {
      setLoading(false);
    }
  }, [application, t]);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      application.categories.getGroups.execute().then(
        (result) => {
          if (active) {
            setGroups(result);
            setLoading(false);
          }
        },
        (cause: unknown) => {
          if (active) {
            setError(domainErrorMessage(cause, t));
            setLoading(false);
          }
        },
      );

      return () => {
        active = false;
      };
    }, [application, t]),
  );

  const mutate = useCallback(
    async (operation: () => Promise<unknown>, rethrow: boolean) => {
      setError(null);

      try {
        await operation();
        invalidateTransactionReferenceData();
        await refresh();
      } catch (cause) {
        const message = domainErrorMessage(cause, t);
        setError(message);

        if (rethrow) {
          throw new Error(message, { cause });
        }
      }
    },
    [refresh, t],
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
