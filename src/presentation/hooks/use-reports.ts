import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import type { ReportsSnapshot } from '@/domain/services/calculate-reports';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export function useReports(throughMonth: string) {
  const application = useApplication();
  const { t } = useTranslation();
  const [reports, setReports] = useState<ReportsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      setReports(await application.reports.get.execute(throughMonth));
    } catch (cause) {
      setError(domainErrorMessage(cause, t));
    } finally {
      setLoading(false);
    }
  }, [application, t, throughMonth]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { reports, error, loading, refresh };
}
