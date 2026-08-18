import DateTimePicker, {
  type DateTimePickerChangeEvent,
} from '@react-native-community/datetimepicker';
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

type NativeDatePickerProps = Readonly<{
  title: string;
  value: string;
  onChange: (value: string) => void;
  onDismiss: () => void;
}>;

function parseDate(value: string): Date {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function isoDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function NativeDatePicker({
  title,
  value,
  onChange,
  onDismiss,
}: NativeDatePickerProps) {
  function select(_: DateTimePickerChangeEvent, date: Date) {
    onChange(isoDate(date));
    if (Platform.OS === 'android') onDismiss();
  }

  const picker = (
    <DateTimePicker
      display={Platform.OS === 'android' ? 'calendar' : 'spinner'}
      mode="date"
      onDismiss={onDismiss}
      onValueChange={select}
      value={parseDate(value)}
    />
  );

  if (Platform.OS === 'android') return picker;

  return (
    <Modal animationType="fade" onRequestClose={onDismiss} transparent visible>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          {picker}
          <Pressable onPress={onDismiss} style={styles.done}>
            <Text style={styles.doneText}>Done</Text>
          </Pressable>
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
    maxWidth: 480,
    padding: 22,
    backgroundColor: '#fff',
    borderRadius: 24,
  },
  title: { color: '#18201a', fontSize: 20, fontWeight: '700' },
  done: {
    minHeight: 48,
    marginTop: 12,
    backgroundColor: '#315a3e',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
