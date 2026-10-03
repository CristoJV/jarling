import { useCallback } from 'react';

import type { SetCategoryTargetInput } from '@/application/use-cases/targets/set-category-target';
import type { CategoryTarget } from '@/domain/entities/category-target';
import { useApplication } from '@/presentation/contexts/application-context';
import { useFocusedResource } from '@/presentation/hooks/use-focused-resource';

export function useTargets() {
  const application = useApplication();
  const load = useCallback(
    () => application.targets.getAll.execute(),
    [application],
  );
  const {
    data: targets,
    error,
    loading,
    refresh,
    reportError,
    clearError,
  } = useFocusedResource<readonly CategoryTarget[]>(load);

  const setTarget = useCallback(
    async (input: SetCategoryTargetInput) => {
      clearError();
      try {
        await application.targets.set.execute(input);
        await refresh();
      } catch (cause) {
        const message = reportError(cause);
        throw new Error(message, { cause });
      }
    },
    [application, clearError, refresh, reportError],
  );

  const deleteTarget = useCallback(
    async (categoryId: string) => {
      clearError();
      try {
        await application.targets.delete.execute(categoryId);
        await refresh();
      } catch (cause) {
        const message = reportError(cause);
        throw new Error(message, { cause });
      }
    },
    [application, clearError, refresh, reportError],
  );

  return { targets, error, loading, refresh, setTarget, deleteTarget };
}
