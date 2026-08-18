import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

type MonthYearPickerModalProps = Readonly<{
  value: string;
  onSelect: (month: string) => void;
  onDismiss: () => void;
}>;

const months = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

export function MonthYearPickerModal({
  value,
  onSelect,
  onDismiss,
}: MonthYearPickerModalProps) {
  const [selectedYear, selectedMonth] = value.split('-').map(Number);
  const [year, setYear] = useState(selectedYear ?? new Date().getFullYear());

  return (
    <Modal animationType="slide" onRequestClose={onDismiss} transparent visible>
      <Pressable onPress={onDismiss} style={styles.backdrop}>
        <Pressable style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.yearHeader}>
            <Pressable
              accessibilityLabel="Previous year"
              onPress={() => setYear((current) => current - 1)}
              style={styles.yearButton}
            >
              <Text style={styles.yearArrow}>‹</Text>
            </Pressable>
            <Text style={styles.year}>{year}</Text>
            <Pressable
              accessibilityLabel="Next year"
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

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(18, 24, 20, 0.38)',
    justifyContent: 'flex-end',
  },
  sheet: {
    paddingHorizontal: 22,
    paddingBottom: 34,
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  handle: {
    width: 44,
    height: 5,
    marginTop: 10,
    backgroundColor: '#ccd2cd',
    borderRadius: 3,
    alignSelf: 'center',
  },
  yearHeader: {
    minHeight: 76,
    borderBottomColor: '#e4e8e3',
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
  yearArrow: { color: '#315a3e', fontSize: 38, lineHeight: 40 },
  year: { color: '#18201a', fontSize: 24, fontWeight: '700' },
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
  monthSelected: { backgroundColor: '#315a3e' },
  monthText: { color: '#59655d', fontSize: 17, fontWeight: '600' },
  monthTextSelected: { color: '#ffffff', fontWeight: '800' },
});
