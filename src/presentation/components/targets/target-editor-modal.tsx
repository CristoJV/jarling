import { useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { SetCategoryTargetInput } from '@/application/use-cases/targets/set-category-target';
import {
  type CategoryTarget,
  type CustomFundingMode,
  type IsoDayOfWeek,
  type TargetKind,
  type WeeklyFundingMode,
} from '@/domain/entities/category-target';
import { Money } from '@/domain/value-objects/money';
import { DatePickerModal } from '@/presentation/components/common/date-picker-modal';
import { MoneyKeypad } from '@/presentation/components/common/money-keypad';
import {
  SelectionModal,
  type SelectionOption,
} from '@/presentation/components/common/selection-modal';
import { formatMoney } from '@/presentation/utils/money';

const targetTypes: readonly Readonly<{ kind: TargetKind; label: string }>[] = [
  { kind: 'weekly', label: 'Weekly' },
  { kind: 'monthly', label: 'Monthly' },
  { kind: 'yearly', label: 'Yearly' },
  { kind: 'custom', label: 'Custom' },
];
const days: readonly Readonly<{ value: IsoDayOfWeek; label: string }>[] = [
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
  { value: 7, label: 'Sun' },
];
const monthlyDays: readonly SelectionOption<string>[] = [
  { value: '0', label: 'Last Day' },
  ...Array.from({ length: 31 }, (_, index) => ({
    value: String(index + 1),
    label: ordinal(index + 1),
  })),
];
const customModes: readonly Readonly<{
  value: CustomFundingMode;
  title: string;
  description: string;
}>[] = [
  {
    value: 'set_aside',
    title: 'Set aside',
    description:
      'Use for bills and subscriptions. Add this amount to the category regardless of its current balance.',
  },
  {
    value: 'fill_up_to',
    title: 'Fill up to',
    description:
      'Use for flexible spending. Refill the category up to this amount as money is spent.',
  },
  {
    value: 'balance',
    title: 'Have a balance of',
    description:
      'Use for savings over time. Build and maintain this available balance.',
  },
];

type TargetEditorModalProps = Readonly<{
  categoryId: string;
  categoryName: string;
  target?: CategoryTarget;
  onDismiss: () => void;
  onSave: (input: SetCategoryTargetInput) => Promise<void>;
  onDelete: (categoryId: string) => Promise<void>;
}>;

function today(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function ordinal(day: number): string {
  const suffix =
    day % 10 === 1 && day % 100 !== 11
      ? 'st'
      : day % 10 === 2 && day % 100 !== 12
        ? 'nd'
        : day % 10 === 3 && day % 100 !== 13
          ? 'rd'
          : 'th';
  return `${day}${suffix}`;
}

function dateLabel(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

export function TargetEditorModal({
  categoryId,
  categoryName,
  target,
  onDismiss,
  onSave,
  onDelete,
}: TargetEditorModalProps) {
  const [kind, setKind] = useState<TargetKind>(target?.kind ?? 'weekly');
  const [amountCents, setAmountCents] = useState(target?.amount.cents ?? 0);
  const [dayOfWeek, setDayOfWeek] = useState<IsoDayOfWeek>(
    target?.dayOfWeek ?? 6,
  );
  const [weeklyFundingMode, setWeeklyFundingMode] = useState<WeeklyFundingMode>(
    target?.weeklyFundingMode ?? 'set_aside',
  );
  const [dayOfMonth, setDayOfMonth] = useState(target?.dayOfMonth ?? 0);
  const [targetDate, setTargetDate] = useState(target?.targetDate ?? today());
  const [customFundingMode, setCustomFundingMode] = useState<CustomFundingMode>(
    target?.customFundingMode ?? 'set_aside',
  );
  const [selectingMonthlyDay, setSelectingMonthlyDay] = useState(false);
  const [selectingDate, setSelectingDate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const amount = formatMoney(Money.fromCents(amountCents));

  async function submit() {
    if (amountCents <= 0) {
      setError('Introduce un importe mayor que cero.');
      return;
    }
    const common = { categoryId, amountCents } as const;
    const input: SetCategoryTargetInput =
      kind === 'weekly'
        ? { ...common, kind, dayOfWeek, weeklyFundingMode }
        : kind === 'monthly'
          ? { ...common, kind, dayOfMonth }
          : kind === 'yearly'
            ? { ...common, kind, targetDate }
            : { ...common, kind, customFundingMode };
    setSubmitting(true);
    setError(null);
    try {
      await onSave(input);
      onDismiss();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  }

  function requestDelete() {
    Alert.alert(
      'Delete target',
      `The target for ${categoryName} will be removed. Budget amounts will not change.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () =>
            void onDelete(categoryId)
              .then(onDismiss)
              .catch((cause: unknown) =>
                setError(
                  cause instanceof Error
                    ? cause.message
                    : 'No se pudo eliminar.',
                ),
              ),
        },
      ],
    );
  }

  return (
    <Modal animationType="slide" onRequestClose={onDismiss} visible>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Back"
            hitSlop={10}
            onPress={onDismiss}
            style={styles.back}
          >
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text numberOfLines={1} style={styles.title}>
            {categoryName}
          </Text>
          <View style={styles.headerSpacer} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.card}>
            <View style={styles.segmented}>
              {targetTypes.map((option) => (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: kind === option.kind }}
                  key={option.kind}
                  onPress={() => setKind(option.kind)}
                  style={[
                    styles.segment,
                    kind === option.kind && styles.segmentSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.segmentText,
                      kind === option.kind && styles.segmentTextSelected,
                    ]}
                  >
                    {option.label}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.fieldLabel}>
              {kind === 'custom' ? 'Amount' : 'I need'}
            </Text>
            <Text style={styles.amount}>{amount}</Text>

            {kind === 'weekly' ? (
              <>
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>Every</Text>
                  <View style={styles.dayGrid}>
                    {days.map((day) => (
                      <ChoiceChip
                        key={day.value}
                        label={day.label}
                        selected={dayOfWeek === day.value}
                        onPress={() => setDayOfWeek(day.value)}
                      />
                    ))}
                  </View>
                </View>
                <View style={styles.fieldSection}>
                  <Text style={styles.fieldLabel}>Next month I want to</Text>
                  <ModeRow
                    selected={weeklyFundingMode === 'set_aside'}
                    title={`Set aside another ${amount}/week`}
                    onPress={() => setWeeklyFundingMode('set_aside')}
                  />
                  <ModeRow
                    selected={weeklyFundingMode === 'refill_up_to'}
                    title={`Refill up to ${amount}/week`}
                    onPress={() => setWeeklyFundingMode('refill_up_to')}
                  />
                </View>
              </>
            ) : null}

            {kind === 'monthly' ? (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>By</Text>
                <Pressable
                  onPress={() => setSelectingMonthlyDay(true)}
                  style={styles.selector}
                >
                  <Text style={styles.selectorText}>
                    {dayOfMonth === 0 ? 'Last Day' : ordinal(dayOfMonth)}
                  </Text>
                  <Text style={styles.selectorArrow}>›</Text>
                </Pressable>
              </View>
            ) : null}

            {kind === 'yearly' ? (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>By</Text>
                <Pressable
                  onPress={() => setSelectingDate(true)}
                  style={styles.selector}
                >
                  <Text style={styles.selectorText}>
                    {dateLabel(targetDate)}
                  </Text>
                  <Text style={styles.selectorArrow}>›</Text>
                </Pressable>
              </View>
            ) : null}

            {kind === 'custom' ? (
              <View style={styles.fieldSection}>
                <Text style={styles.fieldLabel}>I want to</Text>
                {customModes.map((mode) => (
                  <ModeRow
                    key={mode.value}
                    selected={customFundingMode === mode.value}
                    title={mode.title}
                    description={mode.description}
                    onPress={() => setCustomFundingMode(mode.value)}
                  />
                ))}
              </View>
            ) : null}

            <MoneyKeypad onChange={setAmountCents} valueCents={amountCents} />
          </View>
          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}
          <Pressable
            disabled={submitting}
            onPress={() => void submit()}
            style={[styles.save, submitting && styles.disabled]}
          >
            <Text style={styles.saveText}>
              {submitting ? 'Saving…' : target ? 'Save Target' : 'Set Target'}
            </Text>
          </Pressable>
          {target ? (
            <Pressable onPress={requestDelete} style={styles.deleteButton}>
              <Text style={styles.deleteText}>Delete Target</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </SafeAreaView>
      {selectingMonthlyDay ? (
        <SelectionModal
          title="Monthly target day"
          options={monthlyDays}
          selectedValue={String(dayOfMonth)}
          onSelect={(value) => setDayOfMonth(Number(value))}
          onDismiss={() => setSelectingMonthlyDay(false)}
        />
      ) : null}
      {selectingDate ? (
        <DatePickerModal
          title="Yearly target date"
          value={targetDate}
          onChange={setTargetDate}
          onDismiss={() => setSelectingDate(false)}
        />
      ) : null}
    </Modal>
  );
}

function ChoiceChip({
  label,
  selected,
  onPress,
}: Readonly<{ label: string; selected: boolean; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.day, selected && styles.daySelected]}
    >
      <Text style={[styles.dayText, selected && styles.dayTextSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

function ModeRow({
  title,
  description,
  selected,
  onPress,
}: Readonly<{
  title: string;
  description?: string;
  selected: boolean;
  onPress: () => void;
}>) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.mode, selected && styles.modeSelected]}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected ? <View style={styles.radioDot} /> : null}
      </View>
      <View style={styles.modeCopy}>
        <Text style={styles.modeTitle}>{title}</Text>
        {description ? (
          <Text style={styles.modeDescription}>{description}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f8f6' },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#315a3e', fontSize: 38, lineHeight: 40 },
  title: { flex: 1, color: '#18201a', fontSize: 23, fontWeight: '700' },
  headerSpacer: { width: 44 },
  content: {
    width: '100%',
    maxWidth: 680,
    padding: 20,
    paddingBottom: 42,
    alignSelf: 'center',
  },
  card: {
    padding: 18,
    backgroundColor: '#fff',
    borderColor: '#e1e5df',
    borderRadius: 24,
    borderWidth: 1,
  },
  segmented: {
    marginBottom: 24,
    borderColor: '#8a968d',
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  segment: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: { backgroundColor: '#dce9df' },
  segmentText: { color: '#5e6961', fontSize: 12, fontWeight: '600' },
  segmentTextSelected: { color: '#24492f', fontWeight: '800' },
  fieldLabel: { color: '#737e76', fontSize: 13, fontWeight: '700' },
  amount: {
    paddingVertical: 8,
    color: '#18201a',
    fontSize: 38,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  fieldSection: {
    paddingVertical: 16,
    borderTopColor: '#e6e9e5',
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  day: {
    minWidth: 54,
    minHeight: 42,
    paddingHorizontal: 10,
    backgroundColor: '#f1f4f1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  daySelected: { backgroundColor: '#315a3e' },
  dayText: { color: '#5c685f', fontSize: 13, fontWeight: '600' },
  dayTextSelected: { color: '#fff', fontWeight: '800' },
  selector: {
    minHeight: 54,
    paddingHorizontal: 14,
    backgroundColor: '#f1f4f1',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorText: { color: '#253028', fontSize: 16, fontWeight: '700' },
  selectorArrow: { color: '#315a3e', fontSize: 27 },
  mode: {
    padding: 13,
    backgroundColor: '#f4f6f3',
    borderColor: '#e1e6e1',
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },
  modeSelected: { backgroundColor: '#eef5ef', borderColor: '#315a3e' },
  radio: {
    width: 20,
    height: 20,
    marginTop: 1,
    borderColor: '#8b958d',
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: { borderColor: '#315a3e' },
  radioDot: {
    width: 10,
    height: 10,
    backgroundColor: '#315a3e',
    borderRadius: 5,
  },
  modeCopy: { flex: 1 },
  modeTitle: { color: '#253028', fontSize: 15, fontWeight: '800' },
  modeDescription: {
    marginTop: 4,
    color: '#6f7b72',
    fontSize: 12,
    lineHeight: 17,
  },
  error: {
    padding: 12,
    marginTop: 12,
    color: '#b42318',
    backgroundColor: '#fef3f2',
    borderRadius: 12,
    fontSize: 13,
  },
  save: {
    minHeight: 54,
    marginTop: 16,
    backgroundColor: '#315a3e',
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { color: '#fff', fontSize: 17, fontWeight: '800' },
  deleteButton: {
    minHeight: 54,
    marginTop: 12,
    backgroundColor: '#8d1c2e',
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  disabled: { opacity: 0.55 },
});
