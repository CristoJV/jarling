import type { SQLiteDatabase } from 'expo-sqlite';
import { useMemo, type PropsWithChildren } from 'react';

import { createApplication } from '@/bootstrap/composition/create-application';
import { ApplicationContext } from '@/presentation/contexts/application-context';

type Props = PropsWithChildren<Readonly<{ database: SQLiteDatabase }>>;

export function ApplicationProvider({ children, database }: Props) {
  const application = useMemo(() => createApplication(database), [database]);

  return (
    <ApplicationContext.Provider value={application}>
      {children}
    </ApplicationContext.Provider>
  );
}
