import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  appendMoneyDigit,
  removeMoneyDigit,
  toggleMoneySign,
} from '@/presentation/utils/money';

type MoneyKeypadProps = Readonly<{
  valueCents: number;
  onChange: (valueCents: number) => void;
  allowNegative?: boolean;
}>;

export function MoneyKeypad({
  valueCents,
  onChange,
  allowNegative = false,
}: MoneyKeypadProps) {
  return (
    <View accessibilityLabel="Teclado de importe" style={styles.keypad}>
      {[7, 8, 9, 4, 5, 6, 1, 2, 3].map((digit) => (
        <Key
          key={digit}
          label={String(digit)}
          onPress={() => onChange(appendMoneyDigit(valueCents, digit))}
        />
      ))}
      {allowNegative ? (
        <Key label="±" onPress={() => onChange(toggleMoneySign(valueCents))} />
      ) : (
        <Key label="C" onPress={() => onChange(0)} />
      )}
      <Key
        label="0"
        onPress={() => onChange(appendMoneyDigit(valueCents, 0))}
      />
      <Key label="⌫" onPress={() => onChange(removeMoneyDigit(valueCents))} />
    </View>
  );
}

function Key({
  label,
  onPress,
}: Readonly<{ label: string; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityLabel={label === '⌫' ? 'Borrar último dígito' : label}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.key, pressed && styles.keyPressed]}
    >
      <Text style={styles.keyText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  keypad: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  key: {
    width: '33.3333%',
    minHeight: 58,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyPressed: { backgroundColor: '#e6ece7' },
  keyText: {
    color: '#18201a',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '500',
  },
});
