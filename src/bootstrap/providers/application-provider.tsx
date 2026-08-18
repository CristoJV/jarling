import { useSQLiteContext } from 'expo-sqlite';
import { useMemo, type PropsWithChildren } from 'react';

import { createApplication } from '@/bootstrap/composition/create-application';
import { ApplicationContext } from '@/presentation/contexts/application-context';

export function ApplicationProvider({ children }: PropsWithChildren) {
  const database = useSQLiteContext();
  const application = useMemo(() => createApplication(database), [database]);

  return (
    <ApplicationContext.Provider value={application}>
      {children}
    </ApplicationContext.Provider>
  );
}
