import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { ReconciliationPreview } from '@/application/use-cases/accounts/get-reconciliation';
import type { ReconcileAccountInput } from '@/application/use-cases/accounts/reconcile-account';
import { Money } from '@/domain/value-objects/money';
import { FullScreenModal } from '@/presentation/components/common/full-screen-modal';
import { MoneyKeypad } from '@/presentation/components/common/money-keypad';
import { formatMoney } from '@/presentation/utils/money';

type ReconciliationScreenProps = Readonly<{
  preview: ReconciliationPreview;
  onDismiss: () => void;
  onReconcile: (input: ReconcileAccountInput) => Promise<unknown>;
}>;

export function ReconciliationScreen({
  preview,
  onDismiss,
  onReconcile,
}: ReconciliationScreenProps) {
  const [actualBalanceCents, setActualBalanceCents] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const differenceCents = actualBalanceCents - preview.clearedBalance.cents;

  async function finish(createAdjustment: boolean) {
    setSubmitting(true);
    setError(null);
    try {
      await onReconcile({
        accountId: preview.account.id,
        actualBalanceCents,
        createAdjustment,
      });
      Alert.alert(
        'Cuenta conciliada',
        'Las transacciones confirmadas han quedado protegidas.',
        [{ text: 'OK', onPress: onDismiss }],
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo conciliar.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  function submit() {
    if (differenceCents === 0) {
      void finish(false);
      return;
    }
    Alert.alert(
      'Crear ajuste de conciliación',
      `Jarling creará un ajuste de ${formatMoney(Money.fromCents(differenceCents))} para igualar el saldo confirmado.`,
      [
        { text: 'Revisar', style: 'cancel' },
        {
          text: 'Ajustar y conciliar',
          onPress: () => void finish(true),
        },
      ],
    );
  }

  return (
    <FullScreenModal onRequestClose={onDismiss}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable hitSlop={10} onPress={onDismiss}>
            <Text style={styles.back}>‹</Text>
          </Pressable>
          <Text numberOfLines={1} style={styles.title}>
            Reconcile {preview.account.name}
          </Text>
          <View style={styles.spacer} />
        </View>

        <View style={styles.content}>
          <Text style={styles.question}>
            ¿Cuál es el saldo actual del banco?
          </Text>
          <Text style={styles.help}>
            Introduce el saldo confirmado, incluyendo únicamente movimientos ya
            reflejados por el banco.
          </Text>
          <Text style={styles.amount}>
            {formatMoney(Money.fromCents(actualBalanceCents))}
          </Text>

          <View style={styles.summary}>
            <SummaryRow
              label="Cleared en Jarling"
              value={formatMoney(preview.clearedBalance)}
            />
            <SummaryRow
              label="Working balance"
              value={formatMoney(preview.workingBalance)}
            />
            <SummaryRow
              label="Diferencia"
              strong
              value={formatMoney(Money.fromCents(differenceCents))}
            />
            <Text style={styles.counts}>
              {preview.clearedCount} confirmadas · {preview.unclearedCount}{' '}
              pendientes
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Pressable
            disabled={submitting}
            onPress={submit}
            style={[styles.reconcile, submitting && styles.disabled]}
          >
            <Text style={styles.reconcileText}>
              {differenceCents === 0
                ? 'Finish Reconciliation'
                : 'Create Adjustment & Reconcile'}
            </Text>
          </Pressable>
        </View>

        <MoneyKeypad
          allowNegative
          onChange={setActualBalanceCents}
          valueCents={actualBalanceCents}
        />
      </SafeAreaView>
    </FullScreenModal>
  );
}

function SummaryRow({
  label,
  value,
  strong = false,
}: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={[styles.summaryValue, strong && styles.summaryValueStrong]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f6f7f5' },
  header: {
    minHeight: 64,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  back: { width: 36, color: '#253028', fontSize: 42, lineHeight: 44 },
  title: { flex: 1, color: '#18201a', fontSize: 20, fontWeight: '800' },
  spacer: { width: 36 },
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'center' },
  question: {
    marginTop: 18,
    color: '#18201a',
    fontSize: 22,
    fontWeight: '800',
  },
  help: {
    maxWidth: 460,
    marginTop: 8,
    color: '#69736c',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  amount: {
    marginVertical: 24,
    color: '#1f5030',
    fontSize: 42,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  summary: {
    width: '100%',
    maxWidth: 520,
    padding: 18,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    gap: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  summaryLabel: { color: '#6a756d', fontSize: 13 },
  summaryValue: { color: '#253028', fontSize: 14, fontWeight: '700' },
  summaryValueStrong: { color: '#315a3e', fontSize: 16 },
  counts: { color: '#7b857e', fontSize: 11, textAlign: 'center' },
  error: { marginTop: 12, color: '#b42318', fontSize: 13 },
  reconcile: {
    width: '100%',
    maxWidth: 520,
    minHeight: 52,
    marginTop: 18,
    backgroundColor: '#315a3e',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reconcileText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
