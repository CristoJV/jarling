import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type DatePickerModalProps = Readonly<{
  title: string;
  value: string;
  onChange: (value: string) => void;
  onDismiss: () => void;
}>;

const monthNames = [
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
const weekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

function parseDate(value: string): {
  year: number;
  month: number;
  day: number;
} {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (match) {
    return {
      year: Number(match[1]),
      month: Number(match[2]) - 1,
      day: Number(match[3]),
    };
  }
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function isoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${value}T12:00:00`));
}

export function DatePickerModal({
  title,
  value,
  onChange,
  onDismiss,
}: DatePickerModalProps) {
  const initial = parseDate(value);
  const [year, setYear] = useState(initial.year);
  const [month, setMonth] = useState(initial.month);
  const [day, setDay] = useState(initial.day);
  const count = daysInMonth(year, month);
  const leading = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = useMemo(
    () => [
      ...Array.from({ length: leading }, () => null),
      ...Array.from({ length: count }, (_, index) => index + 1),
    ],
    [count, leading],
  );

  function changeMonth(nextMonth: number) {
    setMonth(nextMonth);
    setDay((current) => Math.min(current, daysInMonth(year, nextMonth)));
  }

  function changeYear(nextYear: number) {
    setYear(nextYear);
    setDay((current) => Math.min(current, daysInMonth(nextYear, month)));
  }

  return (
    <Modal animationType="slide" onRequestClose={onDismiss} transparent visible>
      <Pressable onPress={onDismiss} style={styles.backdrop}>
        <Pressable style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <View style={styles.handle} />
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable hitSlop={10} onPress={onDismiss}>
                <Text style={styles.close}>Close</Text>
              </Pressable>
            </View>
            <View style={styles.yearRow}>
              <Pressable
                onPress={() => changeYear(year - 1)}
                style={styles.arrow}
              >
                <Text style={styles.arrowText}>‹</Text>
              </Pressable>
              <Text style={styles.year}>{year}</Text>
              <Pressable
                onPress={() => changeYear(year + 1)}
                style={styles.arrow}
              >
                <Text style={styles.arrowText}>›</Text>
              </Pressable>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.months}
            >
              {monthNames.map((label, index) => (
                <Pressable
                  key={label}
                  onPress={() => changeMonth(index)}
                  style={[styles.month, month === index && styles.selected]}
                >
                  <Text
                    style={[
                      styles.monthText,
                      month === index && styles.selectedText,
                    ]}
                  >
                    {label}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
            <View style={styles.calendar}>
              {weekDays.map((label, index) => (
                <Text key={`${label}-${index}`} style={styles.weekDay}>
                  {label}
                </Text>
              ))}
              {cells.map((cell, index) =>
                cell === null ? (
                  <View key={`blank-${index}`} style={styles.day} />
                ) : (
                  <Pressable
                    key={cell}
                    onPress={() => setDay(cell)}
                    style={[styles.day, day === cell && styles.selected]}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        day === cell && styles.selectedText,
                      ]}
                    >
                      {cell}
                    </Text>
                  </Pressable>
                ),
              )}
            </View>
            <Pressable
              onPress={() => {
                onChange(isoDate(year, month, day));
                onDismiss();
              }}
              style={styles.confirm}
            >
              <Text style={styles.confirmText}>
                Use {formatDate(isoDate(year, month, day))}
              </Text>
            </Pressable>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    paddingTop: 80,
    backgroundColor: 'rgba(18,24,20,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  handle: {
    width: 42,
    height: 5,
    marginTop: 10,
    backgroundColor: '#d2d7d2',
    borderRadius: 3,
    alignSelf: 'center',
  },
  header: {
    minHeight: 58,
    paddingHorizontal: 22,
    borderBottomColor: '#e6e9e5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: '#18201a', fontSize: 20, fontWeight: '700' },
  close: { color: '#315a3e', fontSize: 14, fontWeight: '700' },
  yearRow: {
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  arrow: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowText: { color: '#315a3e', fontSize: 32 },
  year: { color: '#18201a', fontSize: 20, fontWeight: '800' },
  months: { paddingHorizontal: 16, paddingBottom: 12, gap: 6 },
  month: {
    width: 54,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthText: { color: '#68736b', fontSize: 14, fontWeight: '600' },
  selected: { backgroundColor: '#315a3e' },
  selectedText: { color: '#fff', fontWeight: '800' },
  calendar: { paddingHorizontal: 16, flexDirection: 'row', flexWrap: 'wrap' },
  weekDay: {
    width: '14.2857%',
    height: 30,
    color: '#879087',
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '700',
  },
  day: {
    width: '14.2857%',
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: { color: '#253028', fontSize: 15, fontWeight: '600' },
  confirm: {
    minHeight: 52,
    margin: 18,
    backgroundColor: '#315a3e',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
