import { useCallback } from 'react';

import type { AccountsOverview } from '@/application/use-cases/accounts/get-accounts';
import { useApplication } from '@/presentation/contexts/application-context';
import { useFocusedResource } from '@/presentation/hooks/use-focused-resource';

export function useAccounts() {
  const application = useApplication();
  const load = useCallback(
    () => application.accounts.getAll.execute(),
    [application],
  );
  const {
    data: overview,
    error,
    loading,
    refresh,
  } = useFocusedResource<AccountsOverview>(load);

  return { overview, error, loading, refresh };
}
