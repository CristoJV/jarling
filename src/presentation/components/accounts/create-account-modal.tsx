import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import type { CreateAccountInput } from '@/application/use-cases/accounts/create-account';
import { ACCOUNT_TYPES, type AccountType } from '@/domain/entities/account';
import { MoneyKeypad } from '@/presentation/components/common/money-keypad';
import { SelectionModal } from '@/presentation/components/common/selection-modal';
import { SafeBottomSheet } from '@/presentation/components/common/safe-bottom-sheet';
import { Money } from '@/domain/value-objects/money';
import { formatMoney } from '@/presentation/utils/money';

const typeLabels: Record<AccountType, string> = {
  checking: 'Corriente',
  savings: 'Ahorro',
  cash: 'Efectivo',
  tracking: 'Seguimiento',
};

type CreateAccountModalProps = Readonly<{
  visible: boolean;
  onDismiss: () => void;
  onCreate: (input: CreateAccountInput) => Promise<void>;
}>;

export function CreateAccountModal({
  visible,
  onDismiss,
  onCreate,
}: CreateAccountModalProps) {
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [openingBalanceCents, setOpeningBalanceCents] = useState(0);
  const [onBudget, setOnBudget] = useState(true);
  const [selectingType, setSelectingType] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function resetAndDismiss() {
    setName('');
    setType('checking');
    setOpeningBalanceCents(0);
    setOnBudget(true);
    setError(null);
    onDismiss();
  }

  async function submit() {
    if (name.trim().length === 0) {
      setError('Introduce un nombre para la cuenta.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onCreate({ name, type, onBudget, openingBalanceCents });
      resetAndDismiss();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'No se pudo crear la cuenta.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      animationType="slide"
      onRequestClose={resetAndDismiss}
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <SafeBottomSheet style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>Nueva cuenta</Text>
            <Pressable
              accessibilityLabel="Cerrar formulario"
              accessibilityRole="button"
              hitSlop={10}
              onPress={resetAndDismiss}
            >
              <Text style={styles.dismiss}>Cancelar</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.form}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.field}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                accessibilityLabel="Nombre de la cuenta"
                autoCapitalize="sentences"
                autoFocus
                onChangeText={setName}
                placeholder="Ej. imagin"
                placeholderTextColor="#929a93"
                style={styles.input}
                value={name}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Tipo</Text>
              <Pressable
                accessibilityLabel="Seleccionar tipo de cuenta"
                onPress={() => setSelectingType(true)}
                style={styles.selector}
              >
                <Text style={styles.selectorValue}>{typeLabels[type]}</Text>
                <Text style={styles.selectorArrow}>⌄</Text>
              </Pressable>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Saldo inicial</Text>
              <Text style={styles.help}>
                Introduce el importe desde los céntimos. Usa ± para saldos
                negativos.
              </Text>
              <Text accessibilityLabel="Saldo inicial" style={styles.amount}>
                {formatMoney(Money.fromCents(openingBalanceCents))}
              </Text>
              <MoneyKeypad
                allowNegative
                onChange={setOpeningBalanceCents}
                valueCents={openingBalanceCents}
              />
            </View>

            <View style={styles.switchRow}>
              <View style={styles.switchCopy}>
                <Text style={styles.label}>Incluir en el presupuesto</Text>
                <Text style={styles.help}>
                  Las cuentas tracking no participan en Ready to Assign.
                </Text>
              </View>
              <Switch
                disabled={type === 'tracking'}
                onValueChange={setOnBudget}
                value={onBudget}
              />
            </View>

            {error ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={submitting}
              onPress={() => void submit()}
              style={[styles.submit, submitting && styles.submitDisabled]}
            >
              <Text style={styles.submitText}>
                {submitting ? 'Creando…' : 'Crear cuenta'}
              </Text>
            </Pressable>
          </ScrollView>
        </SafeBottomSheet>
      </KeyboardAvoidingView>
      {selectingType ? (
        <SelectionModal
          onDismiss={() => setSelectingType(false)}
          onSelect={(value) => {
            setType(value);
            if (value === 'tracking') setOnBudget(false);
          }}
          options={ACCOUNT_TYPES.map((value) => ({
            value,
            label: typeLabels[value],
            description:
              value === 'tracking'
                ? 'Solo seguimiento; no participa en el presupuesto.'
                : 'Puede incluirse en el presupuesto.',
          }))}
          selectedValue={type}
          title="Tipo de cuenta"
        />
      ) : null}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(18, 24, 20, 0.42)',
  },
  sheet: {
    maxHeight: '92%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  header: {
    minHeight: 68,
    paddingHorizontal: 24,
    borderBottomColor: '#e6e8e4',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: '#18201a',
    fontSize: 21,
    fontWeight: '700',
  },
  dismiss: {
    color: '#4f6b58',
    fontSize: 15,
    fontWeight: '600',
  },
  form: {
    padding: 24,
    paddingBottom: 40,
    gap: 24,
  },
  field: {
    gap: 8,
  },
  label: {
    color: '#253028',
    fontSize: 14,
    fontWeight: '700',
  },
  input: {
    minHeight: 50,
    paddingHorizontal: 14,
    color: '#18201a',
    backgroundColor: '#f4f5f2',
    borderColor: '#dfe3dc',
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  amount: {
    paddingVertical: 10,
    color: '#18201a',
    fontSize: 34,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    textAlign: 'center',
  },
  selector: {
    minHeight: 52,
    paddingHorizontal: 14,
    backgroundColor: '#f4f5f2',
    borderColor: '#dfe3dc',
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  selectorValue: { color: '#18201a', fontSize: 16, fontWeight: '600' },
  selectorArrow: { color: '#647068', fontSize: 22 },
  help: {
    color: '#687268',
    fontSize: 12,
    lineHeight: 17,
  },
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderColor: '#dfe3dc',
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeButtonSelected: {
    backgroundColor: '#294d36',
    borderColor: '#294d36',
  },
  typeButtonText: {
    color: '#445048',
    fontSize: 13,
    fontWeight: '600',
  },
  typeButtonTextSelected: {
    color: '#ffffff',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  switchCopy: {
    flex: 1,
    gap: 4,
  },
  error: {
    color: '#b42318',
    fontSize: 14,
    lineHeight: 20,
  },
  submit: {
    minHeight: 52,
    backgroundColor: '#294d36',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitDisabled: {
    opacity: 0.55,
  },
  submitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
