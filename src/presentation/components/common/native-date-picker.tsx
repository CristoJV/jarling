import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

type NativeDatePickerProps = Readonly<{
  title: string;
  value: string;
  onChange: (value: string) => void;
  onDismiss: () => void;
}>;

export function NativeDatePicker({
  title,
  value,
  onChange,
  onDismiss,
}: NativeDatePickerProps) {
  const [date, setDate] = useState(value);
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(new Date(`${date}T12:00:00`).getTime());
  return (
    <Modal animationType="fade" onRequestClose={onDismiss} transparent visible>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
          <TextInput
            autoFocus
            onChangeText={setDate}
            style={styles.input}
            value={date}
          />
          <View style={styles.actions}>
            <Pressable onPress={onDismiss} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
            <Pressable
              disabled={!valid}
              onPress={() => {
                onChange(date);
                onDismiss();
              }}
              style={[styles.done, !valid && styles.disabled]}
            >
              <Text style={styles.doneText}>Choose</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    padding: 24,
    backgroundColor: 'rgba(18,24,20,0.38)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialog: {
    width: '100%',
    maxWidth: 440,
    padding: 24,
    backgroundColor: '#fff',
    borderRadius: 24,
    gap: 12,
  },
  title: { color: '#18201a', fontSize: 20, fontWeight: '700' },
  label: { color: '#647068', fontSize: 13, fontWeight: '700' },
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
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  cancel: {
    minHeight: 46,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { color: '#526057', fontSize: 15, fontWeight: '700' },
  done: {
    minHeight: 46,
    paddingHorizontal: 20,
    backgroundColor: '#315a3e',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  disabled: { opacity: 0.45 },
});
