import { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import { Money } from '@/domain/value-objects/money';
import { MoneyKeypad } from '@/presentation/components/common/money-keypad';
import { SafeBottomSheet } from '@/presentation/components/common/safe-bottom-sheet';
import { formatMoney } from '@/presentation/utils/money';

type CategoryBudgetModalProps = Readonly<{
  values: BudgetCategoryValues;
  monthLabel: string;
  onDismiss: () => void;
  onMoveMoney: () => void;
  onSave: (amountCents: number) => Promise<void>;
}>;

export function CategoryBudgetModal({
  values,
  monthLabel,
  onDismiss,
  onMoveMoney,
  onSave,
}: CategoryBudgetModalProps) {
  const [amountCents, setAmountCents] = useState(values.assigned.cents);
  const [showDetails, setShowDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await onSave(amountCents);
      onDismiss();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo asignar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onDismiss} transparent visible>
      <View style={styles.backdrop}>
        <SafeBottomSheet style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text numberOfLines={1} style={styles.title}>
                {values.category.name}
              </Text>
              <Text style={styles.subtitle}>{monthLabel}</Text>
            </View>
            <Pressable hitSlop={10} onPress={onDismiss}>
              <Text style={styles.dismiss}>Close</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.content}>
            <Text style={styles.amountLabel}>ASSIGNED</Text>
            <Text style={styles.amount}>
              {formatMoney(Money.fromCents(amountCents))}
            </Text>

            <View style={styles.actions}>
              <Pressable onPress={onMoveMoney} style={styles.action}>
                <Text style={styles.actionIcon}>→</Text>
                <Text style={styles.actionText}>Move Money</Text>
              </Pressable>
              <Pressable
                onPress={() => setShowDetails((current) => !current)}
                style={styles.action}
              >
                <Text style={styles.actionIcon}>•••</Text>
                <Text style={styles.actionText}>Details</Text>
              </Pressable>
            </View>

            {showDetails ? (
              <View style={styles.details}>
                <Detail label="Assigned" value={formatMoney(values.assigned)} />
                <Detail label="Activity" value={formatMoney(values.activity)} />
                <Detail
                  label="Available"
                  value={formatMoney(values.available)}
                />
              </View>
            ) : null}

            <MoneyKeypad onChange={setAmountCents} valueCents={amountCents} />
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              disabled={submitting}
              onPress={() => void submit()}
              style={[styles.save, submitting && styles.disabled]}
            >
              <Text style={styles.saveText}>
                {submitting ? 'Saving…' : 'Done'}
              </Text>
            </Pressable>
          </ScrollView>
        </SafeBottomSheet>
      </View>
    </Modal>
  );
}

function Detail({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 24, 20, 0.38)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '94%',
    backgroundColor: '#f7f8f6',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  header: {
    minHeight: 72,
    paddingHorizontal: 22,
    borderBottomColor: '#e1e5df',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { maxWidth: 270, color: '#18201a', fontSize: 21, fontWeight: '700' },
  subtitle: { marginTop: 2, color: '#687268', fontSize: 12 },
  dismiss: { color: '#315a3e', fontSize: 14, fontWeight: '700' },
  content: { padding: 22, paddingBottom: 38, alignItems: 'center' },
  amountLabel: {
    color: '#7b867e',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  amount: {
    marginTop: 5,
    marginBottom: 18,
    color: '#18201a',
    fontSize: 42,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  actions: { width: '100%', flexDirection: 'row', gap: 10 },
  action: {
    flex: 1,
    minHeight: 66,
    backgroundColor: '#e4eae5',
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: { color: '#315a3e', fontSize: 22, fontWeight: '800' },
  actionText: {
    marginTop: 2,
    color: '#39463d',
    fontSize: 12,
    fontWeight: '700',
  },
  details: {
    width: '100%',
    padding: 15,
    marginTop: 12,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detail: { alignItems: 'center', gap: 3 },
  detailLabel: { color: '#7a857d', fontSize: 10, fontWeight: '700' },
  detailValue: {
    color: '#253028',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  error: { width: '100%', marginTop: 10, color: '#b42318', fontSize: 13 },
  save: {
    width: '100%',
    minHeight: 52,
    marginTop: 8,
    backgroundColor: '#315a3e',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#ffffff', fontSize: 17, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
