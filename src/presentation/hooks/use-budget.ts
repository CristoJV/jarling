import { useCallback } from 'react';

import type { BudgetMonthValues } from '@/domain/services/calculate-budget-month';
import type { BudgetLocation } from '@/application/use-cases/budget/move-budget';
import { useApplication } from '@/presentation/contexts/application-context';
import { useFocusedResource } from '@/presentation/hooks/use-focused-resource';

export function useBudget(month: string) {
  const application = useApplication();
  const load = useCallback(
    () => application.budget.getMonth.execute(month),
    [application, month],
  );
  const {
    data: budget,
    error,
    loading,
    refresh,
    reportError,
    clearError,
  } = useFocusedResource<BudgetMonthValues>(load);

  const assign = useCallback(
    async (categoryId: string, amountCents: number) => {
      clearError();
      try {
        await application.budget.assign.execute({
          categoryId,
          month,
          amountCents,
        });
        await refresh();
      } catch (cause) {
        const message = reportError(cause);
        throw new Error(message, { cause });
      }
    },
    [application, clearError, month, refresh, reportError],
  );

  const move = useCallback(
    async (
      source: BudgetLocation,
      target: BudgetLocation,
      amountCents: number,
    ) => {
      clearError();
      try {
        await application.budget.move.execute({
          source,
          target,
          month,
          amountCents,
        });
        await refresh();
      } catch (cause) {
        const message = reportError(cause);
        throw new Error(message, { cause });
      }
    },
    [application, clearError, month, refresh, reportError],
  );

  return { budget, error, loading, refresh, assign, move };
}
