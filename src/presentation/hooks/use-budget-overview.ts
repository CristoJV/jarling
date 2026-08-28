import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { CategoryTarget } from '@/domain/entities/category-target';
import type { CategoryTargetSnooze } from '@/domain/entities/category-target-snooze';
import type { BudgetMonthValues } from '@/domain/services/calculate-budget-month';
import { invalidateTransactionReferenceData } from '@/presentation/cache/transaction-reference-data';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

type BudgetOverview = Readonly<{
  budget: BudgetMonthValues;
  targets: readonly CategoryTarget[];
  snoozes: readonly CategoryTargetSnooze[];
}>;

export function useBudgetOverview(month: string) {
  const application = useApplication();
  const { t } = useTranslation();
  const request = useRef(0);
  const [data, setData] = useState<BudgetOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const requestId = ++request.current;
    setError(null);
    setLoading(true);
    try {
      const [budget, targets, snoozes] = await Promise.all([
        application.budget.getMonth.execute(month),
        application.targets.getAll.execute(),
        application.targets.getSnoozes.execute(month),
      ]);
      if (requestId === request.current) setData({ budget, targets, snoozes });
    } catch (cause) {
      if (requestId === request.current) {
        setError(domainErrorMessage(cause, t));
      }
    } finally {
      if (requestId === request.current) setLoading(false);
    }
  }, [application, month, t]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        request.current += 1;
      };
    }, [refresh]),
  );

  const mutate = useCallback(
    async (operation: () => Promise<unknown>) => {
      setError(null);
      try {
        await operation();
        invalidateTransactionReferenceData();
        await refresh();
      } catch (cause) {
        const message = domainErrorMessage(cause, t);
        setError(message);
        throw new Error(message, { cause });
      }
    },
    [refresh, t],
  );

  const createGroup = useCallback(
    (name: string) =>
      mutate(() => application.categories.createGroup.execute(name)),
    [application, mutate],
  );
  const createCategory = useCallback(
    (groupId: string, name: string) =>
      mutate(() => application.categories.create.execute({ groupId, name })),
    [application, mutate],
  );
  const renameGroup = useCallback(
    (groupId: string, name: string) =>
      mutate(() => application.categories.renameGroup.execute(groupId, name)),
    [application, mutate],
  );
  const assign = useCallback(
    (categoryId: string, amountCents: number) =>
      mutate(() =>
        application.budget.assign.execute({ categoryId, month, amountCents }),
      ),
    [application, month, mutate],
  );
  const setTargetSnoozed = useCallback(
    (categoryId: string, snoozed: boolean) =>
      mutate(() =>
        application.targets.setSnooze.execute({
          categoryId,
          month,
          snoozed,
        }),
      ),
    [application, month, mutate],
  );

  return {
    budget: data?.budget ?? null,
    targets: data?.targets ?? null,
    snoozes: data?.snoozes ?? null,
    error,
    loading,
    refresh,
    createGroup,
    createCategory,
    renameGroup,
    assign,
    setTargetSnoozed,
  };
}
