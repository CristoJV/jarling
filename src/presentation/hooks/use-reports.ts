import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import type { ReportsSnapshot } from '@/domain/services/calculate-reports';
import type { SpendingIntervalUnit } from '@/domain/services/calculate-spending-report';
import { useApplication } from '@/presentation/contexts/application-context';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { domainErrorMessage } from '@/presentation/utils/domain-error-message';

export function useReports(
  throughDate: string,
  spendingInterval: SpendingIntervalUnit,
  spendingIntervalCount: number,
) {
  const application = useApplication();
  const { t } = useTranslation();
  const [reports, setReports] = useState<ReportsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const requestIdRef = useRef(0);

  const refresh = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setError(null);
    setLoading(true);
    try {
      const nextReports = await application.reports.get.execute({
        throughDate,
        spendingInterval,
        spendingIntervalCount,
      });
      if (requestIdRef.current === requestId) setReports(nextReports);
    } catch (cause) {
      if (requestIdRef.current === requestId) {
        setError(domainErrorMessage(cause, t));
      }
    } finally {
      if (requestIdRef.current === requestId) setLoading(false);
    }
  }, [application, spendingInterval, spendingIntervalCount, t, throughDate]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
      return () => {
        requestIdRef.current += 1;
      };
    }, [refresh]),
  );

  return { reports, error, loading, refresh };
}
