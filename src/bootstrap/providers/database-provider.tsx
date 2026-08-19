import type { SQLiteDatabase } from 'expo-sqlite';
import { useEffect, useState, type PropsWithChildren } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { openApplicationDatabase } from '@/bootstrap/composition/open-application-database';
import { ApplicationProvider } from '@/bootstrap/providers/application-provider';
import { DatabaseErrorScreen } from '@/presentation/components/common/database-error-screen';

type ProviderState =
  | Readonly<{ status: 'loading' }>
  | Readonly<{ status: 'ready'; database: SQLiteDatabase }>
  | Readonly<{ status: 'error' }>;

export function DatabaseProvider({ children }: PropsWithChildren) {
  const [state, setState] = useState<ProviderState>({ status: 'loading' });
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    let database: SQLiteDatabase | null = null;

    async function start() {
      try {
        database = await openApplicationDatabase();
        if (!active) {
          await database.closeAsync();
          database = null;
          return;
        }
        setState({ status: 'ready', database });
      } catch {
        if (database) {
          await database.closeAsync().catch(() => undefined);
          database = null;
        }
        if (active) setState({ status: 'error' });
      }
    }

    void start();
    return () => {
      active = false;
      if (database) {
        void database.closeAsync().catch(() => undefined);
        database = null;
      }
    };
  }, [revision]);

  if (state.status === 'loading') {
    return (
      <View style={styles.loading}>
        <ActivityIndicator />
      </View>
    );
  }
  if (state.status === 'error') {
    return (
      <DatabaseErrorScreen
        onRetry={() => {
          setState({ status: 'loading' });
          setRevision((value) => value + 1);
        }}
      />
    );
  }

  return (
    <ApplicationProvider database={state.database}>
      {children}
    </ApplicationProvider>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
