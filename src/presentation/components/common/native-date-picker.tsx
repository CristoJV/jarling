import { useState } from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

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
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [date, setDate] = useState(value);
  const valid =
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(new Date(`${date}T12:00:00`).getTime());
  return (
    <Modal animationType="fade" onRequestClose={onDismiss} transparent visible>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.label}>{t('common.dateFormat')}</Text>
          <TextInput
            autoFocus
            onChangeText={setDate}
            style={styles.input}
            value={date}
          />
          <View style={styles.actions}>
            <Pressable onPress={onDismiss} style={styles.cancel}>
              <Text style={styles.cancelText}>{t('common.cancel')}</Text>
            </Pressable>
            <Pressable
              disabled={!valid}
              onPress={() => {
                onChange(date);
                onDismiss();
              }}
              style={[styles.done, !valid && styles.disabled]}
            >
              <Text style={styles.doneText}>{t('common.choose')}</Text>
            </Pressable>
          </View>
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
      maxWidth: 440,
      padding: 24,
      backgroundColor: theme.colors.surface,
      borderRadius: 24,
      gap: 12,
    },
    title: { color: theme.colors.text, fontSize: 20, fontWeight: '700' },
    label: { color: theme.colors.textMuted, fontSize: 13, fontWeight: '700' },
    input: {
      minHeight: 50,
      paddingHorizontal: 14,
      color: theme.colors.text,
      backgroundColor: theme.colors.surfaceMuted,
      borderColor: theme.colors.border,
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
    cancelText: {
      color: theme.colors.textSecondary,
      fontSize: 15,
      fontWeight: '700',
    },
    done: {
      minHeight: 46,
      paddingHorizontal: 20,
      backgroundColor: theme.colors.primary,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
    },
    doneText: {
      color: theme.colors.onPrimary,
      fontSize: 15,
      fontWeight: '800',
    },
    disabled: { opacity: 0.45 },
  });
