import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategoryTarget } from '@/domain/entities/category-target';
import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import { formatMoney } from '@/presentation/utils/money';
import { targetDescription } from '@/presentation/utils/target';
import { SafeBottomSheet } from '@/presentation/components/common/safe-bottom-sheet';
import { AnimatedBottomSheetModal } from '@/presentation/components/common/animated-bottom-sheet-modal';

type CategoryDetailsModalProps = Readonly<{
  values: BudgetCategoryValues;
  target?: CategoryTarget;
  onDismiss: () => void;
  onEditTarget: () => void;
  onRename: () => void;
  onToggleHidden: () => void;
}>;

export function CategoryDetailsModal({
  values,
  target,
  onDismiss,
  onEditTarget,
  onRename,
  onToggleHidden,
}: CategoryDetailsModalProps) {
  return (
    <AnimatedBottomSheetModal onDismiss={onDismiss}>
      <SafeBottomSheet style={styles.sheet}>
        <View style={styles.handle} />
        <Text style={styles.title}>Details</Text>

        <Pressable onPress={onRename} style={styles.nameCard}>
          <Text style={styles.label}>Category Name</Text>
          <Text style={styles.name}>{values.category.name}</Text>
          <Text style={styles.editHint}>Tap to rename</Text>
        </Pressable>

        <View style={styles.valuesCard}>
          <Value label="Assigned" value={formatMoney(values.assigned)} />
          <Value label="Activity" value={formatMoney(values.activity)} />
          <Value label="Available" value={formatMoney(values.available)} />
        </View>

        <View style={styles.targetCard}>
          <Text style={styles.label}>Target</Text>
          <Text style={styles.targetDescription}>
            {target ? targetDescription(target) : 'No target yet'}
          </Text>
          <Pressable onPress={onEditTarget} style={styles.targetButton}>
            <Text style={styles.targetButtonText}>
              {target ? 'Edit Target' : 'Set Target'}
            </Text>
          </Pressable>
        </View>

        <Pressable onPress={onToggleHidden} style={styles.hideButton}>
          <Text style={styles.hideText}>
            {values.category.hidden ? 'Show Category' : 'Hide Category'}
          </Text>
        </Pressable>
      </SafeBottomSheet>
    </AnimatedBottomSheetModal>
  );
}

function Value({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <View style={styles.value}>
      <Text style={styles.valueLabel}>{label}</Text>
      <Text style={styles.valueAmount}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: {
    padding: 24,
    paddingBottom: 38,
    backgroundColor: '#f7f8f6',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    gap: 16,
  },
  handle: {
    width: 44,
    height: 5,
    marginBottom: 8,
    backgroundColor: '#c8cec9',
    borderRadius: 3,
    alignSelf: 'center',
  },
  title: { color: '#18201a', fontSize: 26, fontWeight: '800' },
  nameCard: { padding: 18, backgroundColor: '#ffffff', borderRadius: 18 },
  label: { color: '#7a847d', fontSize: 12, fontWeight: '700' },
  name: { marginTop: 3, color: '#253028', fontSize: 20, fontWeight: '700' },
  editHint: { marginTop: 4, color: '#315a3e', fontSize: 11, fontWeight: '700' },
  valuesCard: {
    padding: 18,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  value: { alignItems: 'center', gap: 4 },
  valueLabel: { color: '#7a847d', fontSize: 10, fontWeight: '700' },
  valueAmount: {
    color: '#253028',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
  },
  targetCard: { padding: 18, backgroundColor: '#ffffff', borderRadius: 18 },
  targetDescription: {
    marginTop: 5,
    color: '#253028',
    fontSize: 17,
    fontWeight: '600',
  },
  targetButton: {
    minHeight: 50,
    marginTop: 16,
    backgroundColor: '#dfeae1',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetButtonText: { color: '#315a3e', fontSize: 16, fontWeight: '800' },
  hideButton: {
    minHeight: 52,
    backgroundColor: '#e8ece8',
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hideText: { color: '#6f493f', fontSize: 15, fontWeight: '800' },
});
