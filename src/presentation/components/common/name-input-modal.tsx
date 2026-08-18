import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type NameInputModalProps = Readonly<{
  initialValue?: string;
  label: string;
  submitLabel: string;
  title: string;
  onDismiss: () => void;
  onSubmit: (name: string) => Promise<void>;
}>;

export function NameInputModal({
  initialValue = '',
  label,
  submitLabel,
  title,
  onDismiss,
  onSubmit,
}: NameInputModalProps) {
  const [name, setName] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    if (name.trim().length === 0) {
      setError('Introduce un nombre.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await onSubmit(name);
      onDismiss();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo guardar.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal animationType="fade" onRequestClose={onDismiss} transparent visible>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.backdrop}
      >
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.field}>
            <Text style={styles.label}>{label}</Text>
            <TextInput
              accessibilityLabel={label}
              autoCapitalize="sentences"
              autoFocus
              onChangeText={setName}
              onSubmitEditing={() => void submit()}
              placeholderTextColor="#929a93"
              returnKeyType="done"
              selectTextOnFocus={initialValue.length > 0}
              style={styles.input}
              value={name}
            />
          </View>

          {error ? (
            <Text accessibilityLiveRegion="polite" style={styles.error}>
              {error}
            </Text>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              disabled={submitting}
              onPress={onDismiss}
              style={styles.cancel}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </Pressable>
            <Pressable
              disabled={submitting}
              onPress={() => void submit()}
              style={[styles.submit, submitting && styles.disabled]}
            >
              <Text style={styles.submitText}>
                {submitting ? 'Guardando…' : submitLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: 24,
    backgroundColor: 'rgba(18, 24, 20, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    gap: 20,
  },
  title: {
    color: '#18201a',
    fontSize: 21,
    fontWeight: '700',
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
  error: {
    color: '#b42318',
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancel: {
    minHeight: 44,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#4f6b58',
    fontSize: 15,
    fontWeight: '600',
  },
  submit: {
    minHeight: 44,
    paddingHorizontal: 18,
    backgroundColor: '#294d36',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.55,
  },
});
