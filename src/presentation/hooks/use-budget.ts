import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { BudgetMonthValues } from '@/domain/services/calculate-budget-month';
import { useApplication } from '@/presentation/contexts/application-context';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export function useBudget(month: string) {
  const application = useApplication();
  const [budget, setBudget] = useState<BudgetMonthValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setBudget(await application.budget.getMonth.execute(month));
    } catch (cause) {
      setError(domainErrorMessage(cause));
    } finally {
      setLoading(false);
    }
  }, [application, month]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      application.budget.getMonth.execute(month).then(
        (result) => {
          if (active) {
            setBudget(result);
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
    }, [application, month]),
  );

  const assign = useCallback(
    async (categoryId: string, amountCents: number) => {
      setError(null);
      try {
        await application.budget.assign.execute({
          categoryId,
          month,
          amountCents,
        });
        await refresh();
      } catch (cause) {
        const message = domainErrorMessage(cause);
        setError(message);
        throw new Error(message, { cause });
      }
    },
    [application, month, refresh],
  );

  const move = useCallback(
    async (
      sourceCategoryId: string,
      targetCategoryId: string,
      amountCents: number,
    ) => {
      setError(null);
      try {
        await application.budget.move.execute({
          sourceCategoryId,
          targetCategoryId,
          month,
          amountCents,
        });
        await refresh();
      } catch (cause) {
        const message = domainErrorMessage(cause);
        setError(message);
        throw new Error(message, { cause });
      }
    },
    [application, month, refresh],
  );

  return { budget, error, loading, refresh, assign, move };
}
