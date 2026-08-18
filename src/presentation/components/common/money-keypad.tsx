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
      <View accessibilityLabel="Teclado de importe" style={styles.calculator}>
        <View style={styles.calculatorStatus}>
          <Text style={styles.calculatorStatusText}>
            {pending
              ? `${formatKeypadAmount(pending.leftCents)} ${pending.operator}`
              : ' '}
          </Text>
        </View>
        <View style={styles.calculatorGrid}>
          {[7, 8, 9].map((digit) => (
            <Key
              key={digit}
              label={String(digit)}
              onPress={() => appendDigit(digit)}
            />
          ))}
          <Key emphasized label="÷" onPress={() => chooseOperator('÷')} />
          {[4, 5, 6].map((digit) => (
            <Key
              key={digit}
              label={String(digit)}
              onPress={() => appendDigit(digit)}
            />
          ))}
          <Key emphasized label="×" onPress={() => chooseOperator('×')} />
          {[1, 2, 3].map((digit) => (
            <Key
              key={digit}
              label={String(digit)}
              onPress={() => appendDigit(digit)}
            />
          ))}
          <Key emphasized label="−" onPress={() => chooseOperator('-')} />
          <Key
            label="C"
            onPress={() => {
              setPending(undefined);
              onChange(0);
            }}
          />
          <Key label="0" onPress={() => appendDigit(0)} />
          <Key
            label="⌫"
            onPress={() => onChange(removeMoneyDigit(valueCents))}
          />
          <Key emphasized label="+" onPress={() => chooseOperator('+')} />
          <Key label="=" onPress={evaluate} wide />
          <Key label="Done" onPress={finish} primary wide />
        </View>
      </View>
    );
  }

  function appendDigit(digit: number) {
    onChange(appendMoneyDigit(valueCents, digit));
  }

  return (
    <View accessibilityLabel="Teclado de importe" style={styles.keypad}>
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
  primary = false,
  third = false,
  wide = false,
}: Readonly<{
  label: string;
  onPress: () => void;
  emphasized?: boolean;
  primary?: boolean;
  third?: boolean;
  wide?: boolean;
}>) {
  return (
    <Pressable
      accessibilityLabel={label === '⌫' ? 'Borrar último dígito' : label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        third && styles.keyThird,
        wide && styles.keyWide,
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

const styles = StyleSheet.create({
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
    backgroundColor: '#edf0f4',
  },
  calculatorStatus: {
    height: 20,
    paddingHorizontal: 8,
    alignItems: 'flex-end',
  },
  calculatorStatusText: { color: '#687268', fontSize: 12, fontWeight: '700' },
  calculatorGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  key: {
    width: '25%',
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyWide: { width: '50%' },
  keyThird: { width: '33.3333%' },
  keyEmphasized: { backgroundColor: '#dde2e9' },
  keyPrimary: { backgroundColor: '#315a3e' },
  keyPressed: { backgroundColor: '#e6ece7' },
  keyText: {
    color: '#18201a',
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
  keyTextPrimary: { color: '#ffffff', fontSize: 18, fontWeight: '800' },
});
