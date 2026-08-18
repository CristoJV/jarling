import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AccountRow } from '@/presentation/components/accounts/account-row';
import { CreateAccountModal } from '@/presentation/components/accounts/create-account-modal';
import { OverflowMenu } from '@/presentation/components/common/overflow-menu';
import { useAccounts } from '@/presentation/hooks/use-accounts';
import { formatMoney } from '@/presentation/utils/money';

export function AccountsScreen() {
  const { overview, error, loading, refresh, createAccount, closeAccount } =
    useAccounts();
  const [createModalVisible, setCreateModalVisible] = useState(false);

  function confirmClose(accountId: string, accountName: string) {
    Alert.alert(
      'Cerrar cuenta',
      `Se conservará todo el historial de ${accountName}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar cuenta',
          style: 'destructive',
          onPress: () => void closeAccount(accountId),
        },
      ],
    );
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Text style={styles.title}>Accounts</Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Añadir una cuenta"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => setCreateModalVisible(true)}
            style={styles.addButton}
          >
            <Text style={styles.addButtonText}>+</Text>
          </Pressable>
          <OverflowMenu />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            onRefresh={() => void refresh()}
            refreshing={loading && overview !== null}
          />
        }
      >
        {overview ? (
          <View style={styles.totalCard}>
            <Text style={styles.totalLabel}>TOTAL ON-BUDGET</Text>
            <Text style={styles.totalValue}>
              {formatMoney(overview.onBudgetTotal)}
            </Text>
          </View>
        ) : null}

        {error ? (
          <Text accessibilityLiveRegion="polite" style={styles.error}>
            {error}
          </Text>
        ) : null}

        {loading && !overview ? (
          <ActivityIndicator
            accessibilityLabel="Cargando cuentas"
            color="#294d36"
          />
        ) : null}

        {overview?.accounts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>Todavía no hay cuentas</Text>
            <Text style={styles.emptyDescription}>
              Añade el dinero que ya tienes para empezar a presupuestarlo.
            </Text>
            <Pressable
              onPress={() => setCreateModalVisible(true)}
              style={styles.emptyAction}
            >
              <Text style={styles.emptyActionText}>Crear primera cuenta</Text>
            </Pressable>
          </View>
        ) : null}

        {overview?.accounts.map((summary) => (
          <AccountRow
            key={summary.account.id}
            onClose={(accountId) =>
              confirmClose(accountId, summary.account.name)
            }
            summary={summary}
          />
        ))}
      </ScrollView>

      <CreateAccountModal
        onCreate={createAccount}
        onDismiss={() => setCreateModalVisible(false)}
        visible={createModalVisible}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f7f7f5',
  },
  header: {
    minHeight: 68,
    paddingHorizontal: 24,
    borderBottomColor: '#dfe3dc',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#18201a',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.6,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  addButton: {
    width: 42,
    height: 42,
    backgroundColor: '#294d36',
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 29,
    fontWeight: '400',
    lineHeight: 32,
  },
  content: {
    width: '100%',
    maxWidth: 720,
    padding: 24,
    paddingBottom: 48,
    alignSelf: 'center',
  },
  totalCard: {
    padding: 20,
    marginBottom: 20,
    backgroundColor: '#e5ede7',
    borderRadius: 18,
    gap: 6,
  },
  totalLabel: {
    color: '#536057',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  totalValue: {
    color: '#1e3f2a',
    fontSize: 32,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    letterSpacing: -0.7,
  },
  error: {
    padding: 12,
    marginBottom: 12,
    color: '#b42318',
    backgroundColor: '#fef3f2',
    borderRadius: 10,
    fontSize: 14,
  },
  emptyState: {
    paddingVertical: 64,
    alignItems: 'center',
    gap: 10,
  },
  emptyTitle: {
    color: '#253028',
    fontSize: 20,
    fontWeight: '700',
  },
  emptyDescription: {
    maxWidth: 330,
    color: '#687268',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  emptyAction: {
    minHeight: 46,
    paddingHorizontal: 18,
    marginTop: 12,
    borderColor: '#294d36',
    borderRadius: 23,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyActionText: {
    color: '#294d36',
    fontSize: 14,
    fontWeight: '700',
  },
});
