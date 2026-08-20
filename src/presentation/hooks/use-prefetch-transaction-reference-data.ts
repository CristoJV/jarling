import { useEffect } from 'react';

import { prefetchTransactionReferenceData } from '@/presentation/cache/transaction-reference-data';
import { useApplication } from '@/presentation/contexts/application-context';

export function usePrefetchTransactionReferenceData(): void {
  const application = useApplication();
  useEffect(() => prefetchTransactionReferenceData(application), [application]);
}
