import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  appendMoneyDigit,
  removeMoneyDigit,
  toggleMoneySign,
} from '@/presentation/utils/money';
import {
  calculateMoneyOperation,
  type MoneyOperator,
} from '@/presentation/utils/money-calculator';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

type MoneyKeypadProps = Readonly<{
  valueCents: number;
  onChange: (valueCents: number) => void;
  allowNegative?: boolean;
  calculator?: boolean;
  onDone?: () => void;
}>;

export function MoneyKeypad({
  valueCents,
  onChange,
  allowNegative = false,
  calculator = false,
  onDone,
}: MoneyKeypadProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [pending, setPending] = useState<
    Readonly<{ leftCents: number; operator: MoneyOperator }> | undefined
  >();

  function chooseOperator(operator: MoneyOperator) {
    setPending({ leftCents: valueCents, operator });
    onChange(0);
  }

  function evaluate() {
    if (!pending) return;
    const calculated = calculateMoneyOperation(
      pending.leftCents,
      valueCents,
      pending.operator,
    );
    onChange(allowNegative ? calculated : Math.max(0, calculated));
    setPending(undefined);
  }

  function finish() {
    if (pending) evaluate();
    onDone?.();
  }

  if (calculator) {
    return (
      <View
        accessibilityLabel={t('transactions.amount')}
        style={styles.calculator}
      >
        <View style={styles.calculatorStatus}>
          <Text style={styles.calculatorStatusText}>
            {pending
              ? `${formatKeypadAmount(pending.leftCents)} ${pending.operator}`
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
              onPress={() => {
                setPending(undefined);
                onChange(0);
              }}
            />
            <Key third label="0" onPress={() => appendDigit(0)} />
            <Key
              third
              label="⌫"
              onPress={() => onChange(removeMoneyDigit(valueCents))}
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
            <Key full label="=" onPress={evaluate} />
            <Key full label={t('common.done')} onPress={finish} primary />
          </View>
        </View>
      </View>
    );
  }

  function appendDigit(digit: number) {
    onChange(appendMoneyDigit(valueCents, digit));
  }

  return (
    <View accessibilityLabel={t('transactions.amount')} style={styles.keypad}>
      {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((digit) => (
        <Key
          third
          key={digit}
          label={String(digit)}
          onPress={() => onChange(appendMoneyDigit(valueCents, digit))}
        />
      ))}
      {allowNegative ? (
        <Key
          third
          label="±"
          onPress={() => onChange(toggleMoneySign(valueCents))}
        />
      ) : (
        <Key third label="C" onPress={() => onChange(0)} />
      )}
      <Key
        third
        label="0"
        onPress={() => onChange(appendMoneyDigit(valueCents, 0))}
      />
      <Key
        third
        label="⌫"
        onPress={() => onChange(removeMoneyDigit(valueCents))}
      />
    </View>
  );
}

function formatKeypadAmount(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}

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
      height: 20,
      paddingHorizontal: 8,
      alignItems: 'flex-end',
    },
    calculatorStatusText: {
      color: theme.colors.textMuted,
      fontSize: 12,
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
