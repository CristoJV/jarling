import { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import { Money } from '@/domain/value-objects/money';
import { MoneyKeypad } from '@/presentation/components/common/money-keypad';
import { formatMoney } from '@/presentation/utils/money';

type MoveBudgetModalProps = Readonly<{
  categories: readonly BudgetCategoryValues[];
  initialTarget?: BudgetCategoryValues;
  monthLabel: string;
  onDismiss: () => void;
  onMove: (
    sourceCategoryId: string,
    targetCategoryId: string,
    amountCents: number,
  ) => Promise<void>;
}>;

export function MoveBudgetModal({
  categories,
  initialTarget,
  monthLabel,
  onDismiss,
  onMove,
}: MoveBudgetModalProps) {
  const suggestedSource = categories.find(
    ({ category, available }) =>
      category.id !== initialTarget?.category.id &&
      available.cents > 0 &&
      !category.hidden,
  );
  const suggestedTarget =
    initialTarget ??
    categories.find(
      ({ category }) =>
        !category.hidden && category.id !== suggestedSource?.category.id,
    );
  const [sourceId, setSourceId] = useState(suggestedSource?.category.id ?? '');
  const [targetId, setTargetId] = useState(suggestedTarget?.category.id ?? '');
  const [amountCents, setAmountCents] = useState(
    initialTarget && initialTarget.available.cents < 0
      ? Math.abs(initialTarget.available.cents)
      : 0,
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const visibleCategories = useMemo(
    () => categories.filter(({ category }) => !category.hidden),
    [categories],
  );

  async function submit() {
    if (amountCents <= 0 || !sourceId || !targetId || sourceId === targetId) {
      setError('Elige dos categorías distintas y un importe positivo.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onMove(sourceId, targetId, amountCents);
      onDismiss();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo mover el dinero.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal animationType="slide" onRequestClose={onDismiss} transparent visible>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Mover presupuesto</Text>
              <Text style={styles.subtitle}>{monthLabel}</Text>
            </View>
            <Pressable onPress={onDismiss}>
              <Text style={styles.dismiss}>Cancelar</Text>
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.form}>
            <CategoryChoices
              categories={visibleCategories}
              label="Desde"
              onSelect={setSourceId}
              selectedId={sourceId}
              showAvailable
            />
            <CategoryChoices
              categories={visibleCategories}
              label="Hacia"
              onSelect={setTargetId}
              selectedId={targetId}
            />
            <View style={styles.field}>
              <Text style={styles.label}>Importe</Text>
              <Text accessibilityLabel="Importe a mover" style={styles.input}>
                {formatMoney(Money.fromCents(amountCents))}
              </Text>
              <MoneyKeypad onChange={setAmountCents} valueCents={amountCents} />
            </View>
            {error ? <Text style={styles.error}>{error}</Text> : null}
            <Pressable
              disabled={submitting}
              onPress={() => void submit()}
              style={[styles.submit, submitting && styles.disabled]}
            >
              <Text style={styles.submitText}>
                {submitting ? 'Moviendo…' : 'Mover dinero'}
              </Text>
            </Pressable>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function CategoryChoices({
  categories,
  label,
  selectedId,
  showAvailable = false,
  onSelect,
}: Readonly<{
  categories: readonly BudgetCategoryValues[];
  label: string;
  selectedId: string;
  showAvailable?: boolean;
  onSelect: (categoryId: string) => void;
}>) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choices}>
        {categories.map(({ category, available }) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ selected: selectedId === category.id }}
            key={category.id}
            onPress={() => onSelect(category.id)}
            style={[
              styles.choice,
              selectedId === category.id && styles.choiceSelected,
            ]}
          >
            <Text
              style={[
                styles.choiceName,
                selectedId === category.id && styles.choiceNameSelected,
              ]}
            >
              {category.name}
            </Text>
            {showAvailable ? (
              <Text style={styles.choiceAmount}>{formatMoney(available)}</Text>
            ) : null}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(18, 24, 20, 0.42)',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    minHeight: 72,
    paddingHorizontal: 24,
    borderBottomColor: '#e6e8e4',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: '#18201a', fontSize: 21, fontWeight: '700' },
  subtitle: {
    marginTop: 3,
    color: '#687268',
    fontSize: 12,
    textTransform: 'capitalize',
  },
  dismiss: { color: '#4f6b58', fontSize: 15, fontWeight: '600' },
  form: { padding: 24, paddingBottom: 44, gap: 24 },
  field: { gap: 9 },
  label: { color: '#253028', fontSize: 14, fontWeight: '700' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderColor: '#d9ded8',
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
  },
  choiceSelected: { backgroundColor: '#e1ebe3', borderColor: '#6c8c75' },
  choiceName: { color: '#576159', fontSize: 13, fontWeight: '600' },
  choiceNameSelected: { color: '#23452e' },
  choiceAmount: {
    marginTop: 2,
    color: '#687268',
    fontSize: 10,
    fontVariant: ['tabular-nums'],
  },
  input: {
    paddingVertical: 8,
    color: '#18201a',
    fontSize: 34,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    textAlign: 'center',
  },
  error: { color: '#b42318', fontSize: 14, lineHeight: 20 },
  submit: {
    minHeight: 52,
    backgroundColor: '#294d36',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: { color: '#ffffff', fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.55 },
});
