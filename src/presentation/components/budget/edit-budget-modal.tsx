import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { CategoryTarget } from '@/domain/entities/category-target';
import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import type { TargetProgress } from '@/domain/services/calculate-target-progress';
import { Money } from '@/domain/value-objects/money';
import { formatMoney } from '@/presentation/utils/money';
import { targetDescription } from '@/presentation/utils/target';

type EditBudgetModalProps = Readonly<{
  groups: readonly CategoryGroupSummary[];
  monthLabel: string;
  targetsByCategoryId: ReadonlyMap<string, CategoryTarget>;
  progressByCategoryId: ReadonlyMap<string, TargetProgress>;
  valuesByCategoryId: ReadonlyMap<string, BudgetCategoryValues>;
  onDismiss: () => void;
  onAddCategory: (groupId: string) => void;
  onAddGroup: () => void;
  onRenameGroup: (groupId: string, name: string) => void;
  onSelectCategory: (values: BudgetCategoryValues) => void;
}>;

export function EditBudgetModal({
  groups,
  monthLabel,
  targetsByCategoryId,
  progressByCategoryId,
  valuesByCategoryId,
  onDismiss,
  onAddCategory,
  onAddGroup,
  onRenameGroup,
  onSelectCategory,
}: EditBudgetModalProps) {
  const totalTargets = Money.fromCents(
    [...progressByCategoryId.values()].reduce(
      (total, progress) => total + progress.goal.cents,
      0,
    ),
  );

  return (
    <Modal animationType="slide" onRequestClose={onDismiss} visible>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={onDismiss} style={styles.back}>
            <Text style={styles.backText}>‹</Text>
          </Pressable>
          <Text style={styles.title}>Edit Budget</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.total}>{formatMoney(totalTargets)}</Text>
          <Text style={styles.totalLabel}>Cost to Be Me</Text>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>{monthLabel} Targets</Text>
            <Text style={styles.summaryValue}>{formatMoney(totalTargets)}</Text>
          </View>

          {groups.map(({ group, categories }) => (
            <View key={group.id} style={styles.groupSection}>
              <View style={styles.groupHeader}>
                <Pressable onPress={() => onRenameGroup(group.id, group.name)}>
                  <Text style={styles.groupName}>{group.name}</Text>
                </Pressable>
                <Pressable
                  accessibilityLabel={`Add category to ${group.name}`}
                  onPress={() => onAddCategory(group.id)}
                  style={styles.addButton}
                >
                  <Text style={styles.addText}>+</Text>
                </Pressable>
              </View>
              <View style={styles.categoryCard}>
                {categories.map((category) => {
                  const values = valuesByCategoryId.get(category.id);
                  const target = targetsByCategoryId.get(category.id);
                  return (
                    <Pressable
                      disabled={!values}
                      key={category.id}
                      onPress={() => values && onSelectCategory(values)}
                      style={styles.categoryRow}
                    >
                      <View style={styles.categoryCopy}>
                        <Text numberOfLines={1} style={styles.categoryName}>
                          {category.name}
                        </Text>
                        {category.hidden ? (
                          <Text style={styles.hidden}>Hidden</Text>
                        ) : null}
                      </View>
                      <View style={styles.targetCopy}>
                        {target ? (
                          <>
                            <Text style={styles.targetAmount}>
                              {formatMoney(target.amount)}
                            </Text>
                            <Text
                              numberOfLines={1}
                              style={styles.targetDescription}
                            >
                              {targetDescription(target)}
                            </Text>
                          </>
                        ) : (
                          <Text style={styles.addTarget}>Add Target</Text>
                        )}
                      </View>
                      <Text style={styles.chevron}>›</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ))}

          <Pressable onPress={onAddGroup} style={styles.addGroupButton}>
            <Text style={styles.addGroupText}>+ New Group</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f7f8f6' },
  header: {
    minHeight: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  back: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#315a3e', fontSize: 38, lineHeight: 40 },
  title: { flex: 1, color: '#18201a', fontSize: 24, fontWeight: '700' },
  headerSpacer: { width: 44 },
  content: {
    width: '100%',
    maxWidth: 760,
    padding: 20,
    paddingBottom: 48,
    alignSelf: 'center',
  },
  total: {
    marginTop: 8,
    color: '#18201a',
    fontSize: 46,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    textAlign: 'center',
  },
  totalLabel: {
    marginBottom: 24,
    color: '#68736b',
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  summaryCard: {
    minHeight: 76,
    paddingHorizontal: 20,
    marginBottom: 26,
    backgroundColor: '#e6eee7',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: { color: '#3e4c42', fontSize: 16, fontWeight: '700' },
  summaryValue: {
    color: '#1f5530',
    fontSize: 18,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  groupSection: { marginBottom: 22 },
  groupHeader: {
    minHeight: 50,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  groupName: { color: '#253028', fontSize: 18, fontWeight: '800' },
  addButton: {
    width: 38,
    height: 38,
    backgroundColor: '#dfe6df',
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    color: '#315a3e',
    fontSize: 27,
    lineHeight: 29,
    fontWeight: '700',
  },
  categoryCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e1e5df',
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  categoryRow: {
    minHeight: 72,
    paddingHorizontal: 18,
    borderBottomColor: '#e8ebe7',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  categoryCopy: { flex: 1 },
  categoryName: { color: '#253028', fontSize: 16, fontWeight: '600' },
  hidden: { marginTop: 2, color: '#8a918c', fontSize: 10, fontWeight: '700' },
  targetCopy: { maxWidth: '46%', alignItems: 'flex-end' },
  targetAmount: {
    color: '#253028',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
  targetDescription: { marginTop: 2, color: '#78817b', fontSize: 11 },
  addTarget: { color: '#315a3e', fontSize: 15, fontWeight: '800' },
  chevron: { color: '#a0a7a2', fontSize: 24 },
  addGroupButton: {
    minHeight: 52,
    borderColor: '#829087',
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addGroupText: { color: '#315a3e', fontSize: 15, fontWeight: '800' },
});
