import { SQLiteProvider } from 'expo-sqlite';
import type { PropsWithChildren } from 'react';

import { initializeApplicationDatabase } from '@/bootstrap/composition/initialize-application-database';
import { DATABASE_NAME } from '@/bootstrap/config/database';
import { ApplicationProvider } from '@/bootstrap/providers/application-provider';

export function DatabaseProvider({ children }: PropsWithChildren) {
  return (
    <SQLiteProvider
      databaseName={DATABASE_NAME}
      onInit={initializeApplicationDatabase}
    >
      <ApplicationProvider>{children}</ApplicationProvider>
    </SQLiteProvider>
  );
}
