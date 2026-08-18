import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { BudgetMonthValues } from '@/domain/services/calculate-budget-month';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export function useBudget(month: string) {
  const application = useApplication();
  const { t } = useTranslation();
  const [budget, setBudget] = useState<BudgetMonthValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setBudget(await application.budget.getMonth.execute(month));
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    } finally {
      setLoading(false);
    }
  }, [application, month, t]);

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
            setError(domainErrorMessage(cause, t));
            setLoading(false);
          }
        },
      );

      return () => {
        active = false;
      };
    }, [application, month, t]),
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
        const message = domainErrorMessage(cause, t);
        setError(message);
        throw new Error(message, { cause });
      }
    },
    [application, month, refresh, t],
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
        const message = domainErrorMessage(cause, t);
        setError(message);
        throw new Error(message, { cause });
      }
    },
    [application, month, refresh, t],
  );

  return { budget, error, loading, refresh, assign, move };
}
