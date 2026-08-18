import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { SetCategoryTargetInput } from '@/application/use-cases/targets/set-category-target';
import type { CategoryTarget } from '@/domain/entities/category-target';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export function useTargets() {
  const application = useApplication();
  const { t } = useTranslation();
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
      setError(domainErrorMessage(cause, t));
    } finally {
      setLoading(false);
    }
  }, [application, t]);

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

  const setTarget = useCallback(
    async (input: SetCategoryTargetInput) => {
      setError(null);
      try {
        await application.targets.set.execute(input);
        await refresh();
      } catch (cause) {
        const message = domainErrorMessage(cause, t);
        setError(message);
        throw new Error(message, { cause });
      }
    },
    [application, refresh, t],
  );

  const deleteTarget = useCallback(
    async (categoryId: string) => {
      setError(null);
      try {
        await application.targets.delete.execute(categoryId);
        await refresh();
      } catch (cause) {
        const message = domainErrorMessage(cause, t);
        setError(message);
        throw new Error(message, { cause });
      }
    },
    [application, refresh, t],
  );

  return { targets, error, loading, refresh, setTarget, deleteTarget };
}
