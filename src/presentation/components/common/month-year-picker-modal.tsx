import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import { useThemedStyles } from '@/presentation/theme/theme-provider';

type MonthYearPickerModalProps = Readonly<{
  value: string;
  onSelect: (month: string) => void;
  onDismiss: () => void;
}>;

export function MonthYearPickerModal({
  value,
  onSelect,
  onDismiss,
}: MonthYearPickerModalProps) {
  const { language, t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const months = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat(language, { month: 'short' }).format(
      new Date(2026, index, 1),
    ),
  );
  const [selectedYear, selectedMonth] = value.split('-').map(Number);
  const [year, setYear] = useState(selectedYear ?? new Date().getFullYear());

  return (
    <Modal animationType="fade" onRequestClose={onDismiss} transparent visible>
      <Pressable onPress={onDismiss} style={styles.backdrop}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.yearHeader}>
            <Pressable
              accessibilityLabel={t('common.previousYear')}
              onPress={() => setYear((current) => current - 1)}
              style={styles.yearButton}
            >
              <Text style={styles.yearArrow}>‹</Text>
            </Pressable>
            <Text style={styles.year}>{year}</Text>
            <Pressable
              accessibilityLabel={t('common.nextYear')}
              onPress={() => setYear((current) => current + 1)}
              style={styles.yearButton}
            >
              <Text style={styles.yearArrow}>›</Text>
            </Pressable>
          </View>

          <View style={styles.months}>
            {months.map((label, index) => {
              const monthNumber = index + 1;
              const selected =
                year === selectedYear && monthNumber === selectedMonth;
              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={label}
                  onPress={() => {
                    onSelect(`${year}-${String(monthNumber).padStart(2, '0')}`);
                    onDismiss();
                  }}
                  style={[styles.month, selected && styles.monthSelected]}
                >
                  <Text
                    style={[
                      styles.monthText,
                      selected && styles.monthTextSelected,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Pressable>
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
    sheet: {
      width: '100%',
      maxWidth: 520,
      paddingHorizontal: 22,
      paddingBottom: 24,
      backgroundColor: theme.colors.surface,
      borderRadius: 28,
    },
    handle: {
      width: 44,
      height: 5,
      marginTop: 12,
      backgroundColor: theme.colors.border,
      borderRadius: 3,
      alignSelf: 'center',
    },
    yearHeader: {
      minHeight: 76,
      borderBottomColor: theme.colors.border,
      borderBottomWidth: StyleSheet.hairlineWidth,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    yearButton: {
      width: 50,
      height: 50,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    yearArrow: { color: theme.colors.primary, fontSize: 38, lineHeight: 40 },
    year: { color: theme.colors.text, fontSize: 24, fontWeight: '700' },
    months: {
      paddingTop: 18,
      flexDirection: 'row',
      flexWrap: 'wrap',
    },
    month: {
      width: '25%',
      minHeight: 58,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    monthSelected: { backgroundColor: theme.colors.primary },
    monthText: {
      color: theme.colors.textSecondary,
      fontSize: 17,
      fontWeight: '600',
    },
    monthTextSelected: { color: theme.colors.onPrimary, fontWeight: '800' },
  });
