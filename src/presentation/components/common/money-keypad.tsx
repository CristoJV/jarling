import { forwardRef, useImperativeHandle, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatMoney, toggleMoneySign } from '@/presentation/utils/money';
import {
  appendCalculatorDigit,
  chooseMoneyOperator,
  clearMoneyCalculator,
  createMoneyCalculatorState,
  removeCalculatorDigit,
  resolveMoneyCalculator,
  type MoneyCalculatorTransition,
  type MoneyOperator,
} from '@/presentation/utils/money-calculator';
import { Money } from '@/domain/value-objects/money';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

type MoneyKeypadProps = Readonly<{
  valueCents: number;
  onChange: (valueCents: number) => void;
  allowNegative?: boolean;
  calculator?: boolean;
  onDone?: (valueCents: number) => void;
  overwriteOnFirstDigit?: boolean;
  showDone?: boolean;
}>;

export type MoneyKeypadHandle = Readonly<{
  resolve: () => number;
}>;

export const MoneyKeypad = forwardRef<MoneyKeypadHandle, MoneyKeypadProps>(
  function MoneyKeypad(
    {
      valueCents,
      onChange,
      allowNegative = false,
      calculator = false,
      onDone,
      overwriteOnFirstDigit = true,
      showDone = true,
    },
    ref,
  ) {
    const { t } = useTranslation();
    const styles = useThemedStyles(createStyles);
    const [calculatorState, setCalculatorState] = useState(() =>
      createMoneyCalculatorState(overwriteOnFirstDigit),
    );

    function commit(transition: MoneyCalculatorTransition): number {
      const value = allowNegative
        ? transition.valueCents
        : Math.max(0, transition.valueCents);
      const state =
        transition.state.pending && value !== transition.valueCents
          ? {
              ...transition.state,
              pending: { ...transition.state.pending, leftCents: value },
            }
          : transition.state;
      setCalculatorState(state);
      onChange(value);
      return value;
    }

    function chooseOperator(operator: MoneyOperator) {
      commit(chooseMoneyOperator(calculatorState, valueCents, operator));
    }

    function resolve(): number {
      return commit(resolveMoneyCalculator(calculatorState, valueCents));
    }

    function finish() {
      const finalValue = resolve();
      onDone?.(finalValue);
    }

    function appendDigit(digit: number) {
      commit(appendCalculatorDigit(calculatorState, valueCents, digit));
    }

    useImperativeHandle(ref, () => ({ resolve }));

    if (calculator) {
      const pendingRightCents = calculatorState.overwriteInput ? 0 : valueCents;
      return (
        <View
          accessibilityLabel={t('transactions.amount')}
          style={styles.calculator}
        >
          <View style={styles.calculatorStatus}>
            <Text numberOfLines={1} style={styles.calculatorStatusText}>
              {calculatorState.pending
                ? `${formatMoney(Money.fromCents(calculatorState.pending.leftCents))} ${calculatorState.pending.operator} ${formatMoney(Money.fromCents(pendingRightCents))}`
                : ' '}
            </Text>
          </View>
          <View style={styles.calculatorBody}>
            <View style={styles.digitGrid}>
              {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((digit) => (
                <Key
                  third
                  key={digit}
                  label={String(digit)}
                  onPress={() => appendDigit(digit)}
                />
              ))}
              <Key
                third
                label="C"
                onPress={() => commit(clearMoneyCalculator())}
              />
              <Key third label="0" onPress={() => appendDigit(0)} />
              <Key
                third
                label="⌫"
                onPress={() =>
                  commit(removeCalculatorDigit(calculatorState, valueCents))
                }
              />
            </View>
            <View style={styles.operationGrid}>
              <Key
                emphasized
                half
                label="×"
                onPress={() => chooseOperator('×')}
              />
              <Key
                emphasized
                half
                label="÷"
                onPress={() => chooseOperator('÷')}
              />
              <Key
                emphasized
                half
                label="+"
                onPress={() => chooseOperator('+')}
              />
              <Key
                emphasized
                half
                label="−"
                onPress={() => chooseOperator('-')}
              />
              <Key full label="=" onPress={resolve} />
              {showDone ? (
                <Key full label={t('common.done')} onPress={finish} primary />
              ) : null}
            </View>
          </View>
        </View>
      );
    }

    return (
      <View accessibilityLabel={t('transactions.amount')} style={styles.keypad}>
        {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((digit) => (
          <Key
            third
            key={digit}
            label={String(digit)}
            onPress={() => appendDigit(digit)}
          />
        ))}
        {allowNegative ? (
          <Key
            third
            label="±"
            onPress={() => onChange(toggleMoneySign(valueCents))}
          />
        ) : (
          <Key third label="C" onPress={() => commit(clearMoneyCalculator())} />
        )}
        <Key third label="0" onPress={() => appendDigit(0)} />
        <Key
          third
          label="⌫"
          onPress={() =>
            commit(removeCalculatorDigit(calculatorState, valueCents))
          }
        />
      </View>
    );
  },
);

function Key({
  label,
  onPress,
  emphasized = false,
  full = false,
  half = false,
  primary = false,
  third = false,
}: Readonly<{
  label: string;
  onPress: () => void;
  emphasized?: boolean;
  full?: boolean;
  half?: boolean;
  primary?: boolean;
  third?: boolean;
}>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <Pressable
      accessibilityLabel={label === '⌫' ? t('common.delete') : label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        third && styles.keyThird,
        half && styles.keyHalf,
        full && styles.keyFull,
        emphasized && styles.keyEmphasized,
        primary && styles.keyPrimary,
        pressed && styles.keyPressed,
      ]}
    >
      <Text style={[styles.keyText, primary && styles.keyTextPrimary]}>
        {label}
      </Text>
    </Pressable>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    keypad: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    calculator: {
      width: '100%',
      paddingHorizontal: 10,
      paddingTop: 4,
      paddingBottom: 6,
      backgroundColor: theme.colors.surfaceElevated,
    },
    calculatorStatus: {
      height: 28,
      paddingHorizontal: 8,
      alignItems: 'flex-end',
    },
    calculatorStatusText: {
      color: theme.colors.textMuted,
      fontSize: 16,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
    },
    calculatorBody: { flexDirection: 'row' },
    digitGrid: { width: '72%', flexDirection: 'row', flexWrap: 'wrap' },
    operationGrid: { width: '28%', flexDirection: 'row', flexWrap: 'wrap' },
    key: {
      width: '100%',
      minHeight: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyHalf: { width: '50%' },
    keyFull: { width: '100%' },
    keyThird: { width: '33.3333%' },
    keyEmphasized: { backgroundColor: theme.colors.surfaceMuted },
    keyPrimary: { backgroundColor: theme.colors.primary },
    keyPressed: { backgroundColor: theme.colors.surfacePressed },
    keyText: {
      color: theme.colors.text,
      fontSize: 24,
      fontVariant: ['tabular-nums'],
      fontWeight: '500',
    },
    keyTextPrimary: {
      color: theme.colors.onPrimary,
      fontSize: 18,
      fontWeight: '800',
    },
  });
