import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { SetCategoryTargetInput } from '@/application/use-cases/targets/set-category-target';
import type { CategoryTarget } from '@/domain/entities/category-target';
import { useApplication } from '@/presentation/contexts/application-context';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export function useTargets() {
  const application = useApplication();
  const [targets, setTargets] = useState<readonly CategoryTarget[] | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setTargets(await application.targets.getAll.execute());
    } catch (cause) {
      setError(domainErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [application]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      application.targets.getAll.execute().then(
        (result) => {
          if (active) {
            setTargets(result);
            setLoading(false);
          }
        },
        (cause: unknown) => {
          if (active) {
            setError(domainErrorMessage(cause));
            setLoading(false);
          }
        },
      );
      return () => {
        active = false;
      };
    }, [application]),
  );

  const setTarget = useCallback(
    async (input: SetCategoryTargetInput) => {
      setError(null);
      try {
        await application.targets.set.execute(input);
        await refresh();
      } catch (cause) {
        const message = domainErrorMessage(cause);
        setError(message);
        throw new Error(message, { cause });
      }
    },
    [application, refresh],
  );

  const deleteTarget = useCallback(
    async (categoryId: string) => {
      setError(null);
      try {
        await application.targets.delete.execute(categoryId);
        await refresh();
      } catch (cause) {
        const message = domainErrorMessage(cause);
        setError(message);
        throw new Error(message, { cause });
      }
    },
    [application, refresh],
  );

  return { targets, error, loading, refresh, setTarget, deleteTarget };
}
