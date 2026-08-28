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
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

type NativeDatePickerProps = Readonly<{
  title: string;
  value: string;
  minimumDate?: string;
  maximumDate?: string;
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
  minimumDate,
  maximumDate,
  onChange,
  onDismiss,
}: NativeDatePickerProps) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  function select(_: DateTimePickerChangeEvent, date: Date) {
    onChange(isoDate(date));
    if (Platform.OS === 'android') onDismiss();
  }

  const picker = (
    <DateTimePicker
      display={Platform.OS === 'android' ? 'calendar' : 'spinner'}
      maximumDate={maximumDate ? parseDate(maximumDate) : undefined}
      minimumDate={minimumDate ? parseDate(minimumDate) : undefined}
      mode="date"
      onDismiss={onDismiss}
      onValueChange={select}
      themeVariant={theme.mode}
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
            <Text style={styles.doneText}>{t('common.done')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      padding: 24,
      backgroundColor: theme.colors.scrim,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dialog: {
      width: '100%',
      maxWidth: 480,
      padding: 22,
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
    },
    title: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
    done: {
      minHeight: 48,
      marginTop: 12,
      backgroundColor: theme.colors.primary,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneText: {
      color: theme.colors.onPrimary,
      fontSize: 16,
      fontWeight: '800',
    },
  });
