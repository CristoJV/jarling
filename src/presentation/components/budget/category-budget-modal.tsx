import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRef, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import type { CategoryFundingState } from '@/domain/services/calculate-category-funding-state';
import { Money } from '@/domain/value-objects/money';
import { BlinkingCursor } from '@/presentation/components/common/blinking-cursor';
import {
  MoneyKeypad,
  type MoneyCalculatorExpression,
  type MoneyKeypadHandle,
} from '@/presentation/components/common/money-keypad';
import { AnimatedBottomSheetModal } from '@/presentation/components/common/animated-bottom-sheet-modal';
import { SafeBottomSheet } from '@/presentation/components/common/safe-bottom-sheet';
import { formatMoney } from '@/presentation/utils/money';
import { targetSnoozeAction } from '@/presentation/utils/target-snooze-action';
import { CATEGORY_CALCULATOR_BUTTON_HEIGHT } from '@/presentation/layout/category-calculator-layout';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { categoryDisplayName } from '@/presentation/utils/category-name';
import { applySmartAssignToDraft } from '@/presentation/utils/smart-assign-draft';

type CategoryBudgetModalProps = Readonly<{
  values: BudgetCategoryValues;
  fundingForAssigned: (amountCents: number) => CategoryFundingState;
  monthLabel: string;
  onDismiss: () => void;
  onDetails: () => void;
  onMoveMoney: () => void;
  onSave: (amountCents: number) => Promise<void>;
  onToggleSnooze: () => Promise<void>;
}>;

export function CategoryBudgetModal({
  values,
  fundingForAssigned,
  monthLabel,
  onDismiss,
  onDetails,
  onMoveMoney,
  onSave,
  onToggleSnooze,
}: CategoryBudgetModalProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createStyles);
  const keypadRef = useRef<MoneyKeypadHandle>(null);
  const [amountCents, setAmountCents] = useState(values.assigned.cents);
  const [amountExpression, setAmountExpression] =
    useState<MoneyCalculatorExpression | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [snoozeSubmitting, setSnoozeSubmitting] = useState(false);

  const funding = fundingForAssigned(amountCents);
  const requiredCents = funding.requiredAssignment.cents;
  const snoozeAction = targetSnoozeAction(funding);
  const hasContextualActions = requiredCents > 0 || snoozeAction !== null;

  async function submit(valueCents = amountCents) {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      await onSave(valueCents);
      onDismiss();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('form.couldNotSave'));
    } finally {
      setSubmitting(false);
    }
  }

  function applySmartAssign() {
    const currentDraft = keypadRef.current?.resolve() ?? amountCents;
    const currentFunding = fundingForAssigned(currentDraft);
    setAmountCents(applySmartAssignToDraft(currentDraft, currentFunding));
    setAmountExpression(null);
  }

  async function toggleSnooze() {
    if (snoozeSubmitting) return;
    setSnoozeSubmitting(true);
    setError(null);
    try {
      await onToggleSnooze();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('form.couldNotSave'));
    } finally {
      setSnoozeSubmitting(false);
    }
  }

  return (
    <AnimatedBottomSheetModal onDismiss={onDismiss}>
      <SafeBottomSheet
        style={[styles.sheet, { maxHeight: height - insets.top - 8 }]}
      >
        <View style={styles.header}>
          <View>
            <Text numberOfLines={1} style={styles.title}>
              {categoryDisplayName(values.category, t)}
            </Text>
            <Text style={styles.subtitle}>{monthLabel}</Text>
          </View>
          <Pressable hitSlop={10} onPress={onDismiss}>
            <Text style={styles.dismiss}>{t('common.close')}</Text>
          </Pressable>
        </View>
        <View style={styles.content}>
          <Text style={styles.amountLabel}>
            {t('budget.assigned').toUpperCase()}
          </Text>
          <View style={styles.amountField}>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.58}
              numberOfLines={1}
              style={styles.amount}
            >
              {amountExpression
                ? `${formatMoney(Money.fromCents(amountExpression.leftCents))} ${amountExpression.operator} ${formatMoney(Money.fromCents(amountExpression.rightCents))}`
                : formatMoney(Money.fromCents(amountCents))}
            </Text>
            <BlinkingCursor height={38} />
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                keypadRef.current?.resolve();
                onMoveMoney();
              }}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.actionPressed,
              ]}
            >
              <View style={styles.actionIconButton}>
                <MaterialCommunityIcons
                  color={theme.colors.primary}
                  name="swap-horizontal"
                  size={27}
                />
              </View>
              <Text style={styles.actionText}>{t('budget.moveMoney')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                keypadRef.current?.resolve();
                onDetails();
              }}
              style={({ pressed }) => [
                styles.action,
                pressed && styles.actionPressed,
              ]}
            >
              <View style={styles.actionIconButton}>
                <MaterialCommunityIcons
                  color={theme.colors.primary}
                  name="dots-horizontal"
                  size={29}
                />
              </View>
              <Text style={styles.actionText}>{t('budget.details')}</Text>
            </Pressable>
          </View>

          {hasContextualActions ? (
            <View style={styles.contextualActions}>
              {requiredCents > 0 ? (
                <Pressable
                  onPress={applySmartAssign}
                  style={({ pressed }) => [
                    styles.assignAction,
                    pressed && styles.actionPressed,
                  ]}
                >
                  <Text numberOfLines={2} style={styles.assignActionText}>
                    {t(
                      funding.assignmentReason === 'overspending'
                        ? 'budget.assignToCoverOverspending'
                        : 'budget.assignToReachTarget',
                      {
                        amount: formatMoney(funding.requiredAssignment),
                      },
                    )}
                  </Text>
                </Pressable>
              ) : null}
              {snoozeAction ? (
                <Pressable
                  accessibilityLabel={t(
                    snoozeAction === 'cancel'
                      ? 'targets.unsnoozeThisMonth'
                      : 'targets.snoozeThisMonth',
                  )}
                  disabled={snoozeSubmitting}
                  onPress={() => void toggleSnooze()}
                  style={({ pressed }) => [
                    styles.snoozeAction,
                    requiredCents === 0 && styles.snoozeActionFull,
                    pressed && styles.actionPressed,
                  ]}
                >
                  <MaterialCommunityIcons
                    color={theme.colors.primary}
                    name={snoozeAction === 'cancel' ? 'sleep-off' : 'sleep'}
                    size={23}
                  />
                  {requiredCents === 0 && snoozeAction === 'cancel' ? (
                    <Text style={styles.snoozeLabel}>
                      {t('targets.unsnoozeThisMonth')}
                    </Text>
                  ) : null}
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {error ? <Text style={styles.error}>{error}</Text> : null}
          <MoneyKeypad
            calculator
            onChange={setAmountCents}
            onDone={(value) => void submit(value)}
            onExpressionChange={setAmountExpression}
            ref={keypadRef}
            valueCents={amountCents}
          />
        </View>
      </SafeBottomSheet>
    </AnimatedBottomSheetModal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sheet: {
      backgroundColor: theme.colors.surfaceElevated,
      borderTopLeftRadius: 26,
      borderTopRightRadius: 26,
      overflow: 'hidden',
    },
    header: {
      minHeight: 72,
      paddingHorizontal: 22,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      maxWidth: 270,
      color: theme.colors.text,
      fontSize: 21,
      fontWeight: '700',
    },
    subtitle: { marginTop: 2, color: theme.colors.textMuted, fontSize: 12 },
    dismiss: { color: theme.colors.primary, fontSize: 14, fontWeight: '700' },
    content: { flexShrink: 1, padding: 14, alignItems: 'center' },
    amountLabel: {
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '800',
      letterSpacing: 1.1,
    },
    amountField: {
      minHeight: 50,
      marginTop: 5,
      marginBottom: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    amount: {
      color: theme.colors.text,
      fontSize: 36,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    actions: {
      width: '100%',
      marginBottom: 10,
      flexDirection: 'row',
      gap: 10,
    },
    action: {
      flex: 1,
      minHeight: CATEGORY_CALCULATOR_BUTTON_HEIGHT + 16,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    actionIconButton: {
      width: '100%',
      height: CATEGORY_CALCULATOR_BUTTON_HEIGHT,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    actionText: {
      color: theme.colors.textSecondary,
      fontSize: 11,
      fontWeight: '700',
    },
    contextualActions: {
      width: '100%',
      marginBottom: 8,
      flexDirection: 'row',
      gap: 8,
    },
    assignAction: {
      height: CATEGORY_CALCULATOR_BUTTON_HEIGHT,
      flex: 9,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.radii.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },
    assignActionText: {
      color: theme.colors.onPrimary,
      fontSize: 13,
      fontWeight: '800',
      textAlign: 'center',
    },
    snoozeAction: {
      height: CATEGORY_CALCULATOR_BUTTON_HEIGHT,
      flex: 1,
      minWidth: 48,
      backgroundColor: theme.colors.surfaceMuted,
      borderRadius: theme.radii.pill,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },
    snoozeActionFull: { flex: 1 },
    snoozeLabel: {
      color: theme.colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },
    actionPressed: { opacity: 0.75 },
    error: {
      width: '100%',
      marginBottom: 10,
      color: theme.colors.negative,
      fontSize: 13,
    },
  });
