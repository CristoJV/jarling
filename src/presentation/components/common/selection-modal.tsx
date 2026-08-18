import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeBottomSheet } from '@/presentation/components/common/safe-bottom-sheet';

export type SelectionOption<Value extends string> = Readonly<{
  value: Value;
  label: string;
  description?: string;
}>;

type SelectionModalProps<Value extends string> = Readonly<{
  title: string;
  options: readonly SelectionOption<Value>[];
  selectedValue?: Value;
  onSelect: (value: Value) => void;
  onDismiss: () => void;
  placement?: 'bottom' | 'center';
}>;

export function SelectionModal<Value extends string>({
  title,
  options,
  selectedValue,
  onSelect,
  onDismiss,
  placement = 'bottom',
}: SelectionModalProps<Value>) {
  const centered = placement === 'center';
  return (
    <Modal
      animationType={centered ? 'fade' : 'slide'}
      onRequestClose={onDismiss}
      transparent
      visible
    >
      <Pressable
        onPress={onDismiss}
        style={[styles.backdrop, centered && styles.backdropCentered]}
      >
        <Pressable style={[styles.sheet, centered && styles.sheetCentered]}>
          <SafeBottomSheet>
            {centered ? null : <View style={styles.handle} />}
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <Pressable hitSlop={10} onPress={onDismiss}>
                <Text style={styles.dismiss}>Cerrar</Text>
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.options}>
              {options.map((option) => {
                const selected = option.value === selectedValue;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ selected }}
                    key={option.value}
                    onPress={() => {
                      onSelect(option.value);
                      onDismiss();
                    }}
                    style={[styles.option, selected && styles.optionSelected]}
                  >
                    <View style={styles.optionCopy}>
                      <Text style={styles.optionLabel}>{option.label}</Text>
                      {option.description ? (
                        <Text style={styles.optionDescription}>
                          {option.description}
                        </Text>
                      ) : null}
                    </View>
                    <Text style={styles.check}>{selected ? '✓' : ''}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </SafeBottomSheet>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    paddingTop: 80,
    backgroundColor: 'rgba(18, 24, 20, 0.35)',
    justifyContent: 'flex-end',
  },
  backdropCentered: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheet: {
    maxHeight: '82%',
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    overflow: 'hidden',
  },
  sheetCentered: {
    width: '100%',
    maxWidth: 460,
    borderRadius: 24,
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
    minHeight: 64,
    paddingHorizontal: 22,
    borderBottomColor: '#e6e9e5',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { color: '#18201a', fontSize: 20, fontWeight: '700' },
  dismiss: { color: '#315a3e', fontSize: 14, fontWeight: '700' },
  options: { paddingHorizontal: 16, paddingBottom: 34 },
  option: {
    minHeight: 64,
    paddingHorizontal: 10,
    borderBottomColor: '#edf0ec',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionSelected: { backgroundColor: '#f0f6f1' },
  optionCopy: { flex: 1, paddingVertical: 12 },
  optionLabel: { color: '#253028', fontSize: 16, fontWeight: '600' },
  optionDescription: { marginTop: 3, color: '#738077', fontSize: 12 },
  check: { width: 28, color: '#2b6740', fontSize: 20, textAlign: 'center' },
});
