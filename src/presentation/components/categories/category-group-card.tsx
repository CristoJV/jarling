import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { CategoryTarget } from '@/domain/entities/category-target';
import type { BudgetCategoryValues } from '@/domain/services/calculate-budget-month';
import type { TargetProgress } from '@/domain/services/calculate-target-progress';
import { Money } from '@/domain/value-objects/money';
import { formatMoney } from '@/presentation/utils/money';

type CategoryGroupCardProps = Readonly<{
  summary: CategoryGroupSummary;
  valuesByCategoryId: ReadonlyMap<string, BudgetCategoryValues>;
  targetsByCategoryId: ReadonlyMap<string, CategoryTarget>;
  progressByCategoryId: ReadonlyMap<string, TargetProgress>;
  onSelectCategory: (values: BudgetCategoryValues) => void;
}>;

export function CategoryGroupCard({
  summary,
  valuesByCategoryId,
  targetsByCategoryId,
  progressByCategoryId,
  onSelectCategory,
}: CategoryGroupCardProps) {
  const [expanded, setExpanded] = useState(true);
  const visibleCategories = summary.categories.filter(
    (category) => !category.hidden,
  );
  const groupValues = visibleCategories.flatMap((category) => {
    const values = valuesByCategoryId.get(category.id);
    return values ? [values] : [];
  });
  const totalAssigned = Money.fromCents(
    groupValues.reduce((total, values) => total + values.assigned.cents, 0),
  );
  const totalAvailable = Money.fromCents(
    groupValues.reduce((total, values) => total + values.available.cents, 0),
  );

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((current) => !current)}
        style={styles.groupHeader}
      >
        <View style={styles.groupCopy}>
          <Text
            style={[styles.disclosure, expanded && styles.disclosureExpanded]}
          >
            ›
          </Text>
          <Text numberOfLines={1} style={styles.groupName}>
            {summary.group.name}
          </Text>
        </View>
        <View style={styles.groupTotals}>
          <SummaryValue label="Assigned" value={formatMoney(totalAssigned)} />
          <SummaryValue
            label="Available"
            value={formatMoney(totalAvailable)}
            strong
          />
        </View>
      </Pressable>

      {expanded ? (
        visibleCategories.length === 0 ? (
          <Text style={styles.empty}>No visible categories</Text>
        ) : (
          visibleCategories.map((category) => {
            const values = valuesByCategoryId.get(category.id);
            if (!values) return null;
            const target = targetsByCategoryId.get(category.id);
            const progress = progressByCategoryId.get(category.id);
            const status = categoryStatus(values, target, progress);
            const needsFunding =
              values.activity.cents >= 0 &&
              (progress?.recommended.cents ?? 0) > 0;

            return (
              <Pressable
                key={category.id}
                onPress={() => onSelectCategory(values)}
                style={({ pressed }) => [
                  styles.categoryRow,
                  pressed && styles.categoryRowPressed,
                ]}
              >
                <View style={styles.rowTop}>
                  <Text numberOfLines={1} style={styles.categoryName}>
                    {category.name}
                  </Text>
                  <View style={styles.budgetValues}>
                    <Text style={styles.assigned}>
                      {formatMoney(values.assigned)}
                    </Text>
                    <View
                      style={[
                        styles.availablePill,
                        needsFunding && styles.availablePillWarning,
                        values.available.cents < 0 &&
                          styles.availablePillNegative,
                      ]}
                    >
                      <Text
                        style={[
                          styles.available,
                          needsFunding && styles.availableWarning,
                          values.available.cents < 0 &&
                            styles.availableNegative,
                        ]}
                      >
                        {formatMoney(values.available)}
                      </Text>
                    </View>
                  </View>
                </View>
                {status ? <ProgressStatus {...status} /> : null}
              </Pressable>
            );
          })
        )
      ) : null}
    </View>
  );
}

type Status = Readonly<{
  label: string;
  ratio: number;
  tone: 'positive' | 'warning' | 'negative';
}>;

function categoryStatus(
  values: BudgetCategoryValues,
  target?: CategoryTarget,
  progress?: TargetProgress,
): Status | null {
  if (values.activity.cents < 0) {
    const spent = Math.abs(values.activity.cents);
    const funded = Math.max(0, values.available.cents + spent);
    if (values.available.cents < 0) {
      return {
        label: `Overspent ${formatMoney(Money.fromCents(Math.abs(values.available.cents)))} of ${formatMoney(Money.fromCents(funded))}`,
        ratio: 1,
        tone: 'negative',
      };
    }
    return {
      label: `Spent ${formatMoney(Money.fromCents(spent))} of ${formatMoney(Money.fromCents(funded))}`,
      ratio: funded === 0 ? 1 : Math.min(1, spent / funded),
      tone: 'positive',
    };
  }

  if (target && progress) {
    if (progress.recommended.cents > 0) {
      return {
        label: `${formatMoney(progress.recommended)} more needed this month`,
        ratio: progress.progress,
        tone: progress.status === 'overdue' ? 'negative' : 'warning',
      };
    }
    return {
      label: `Funded ${formatMoney(Money.fromCents(Math.max(0, values.available.cents)))} of ${formatMoney(progress.goal)}`,
      ratio: progress.progress,
      tone: progress.status === 'overdue' ? 'negative' : 'positive',
    };
  }

  return null;
}

function ProgressStatus({ label, ratio, tone }: Status) {
  return (
    <View style={styles.progressSection}>
      <View style={styles.track}>
        <View
          style={[
            styles.progress,
            tone === 'warning' && styles.progressWarning,
            tone === 'negative' && styles.progressNegative,
            { width: `${Math.round(Math.min(1, Math.max(0, ratio)) * 100)}%` },
          ]}
        />
      </View>
      <Text
        style={[
          styles.progressLabel,
          tone === 'warning' && styles.progressLabelWarning,
          tone === 'negative' && styles.progressLabelNegative,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SummaryValue({
  label,
  value,
  strong = false,
}: Readonly<{ label: string; value: string; strong?: boolean }>) {
  return (
    <View style={styles.summaryValue}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text
        style={[styles.summaryAmount, strong && styles.summaryAmountStrong]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e1e5df',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  groupHeader: {
    minHeight: 68,
    paddingHorizontal: 16,
    backgroundColor: '#edf1ed',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  groupCopy: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  disclosure: { width: 18, color: '#315a3e', fontSize: 24, fontWeight: '700' },
  disclosureExpanded: { transform: [{ rotate: '90deg' }] },
  groupName: { flex: 1, color: '#243329', fontSize: 17, fontWeight: '800' },
  groupTotals: { flexDirection: 'row', gap: 16 },
  summaryValue: { alignItems: 'flex-end', gap: 2 },
  summaryLabel: { color: '#77817a', fontSize: 9, fontWeight: '700' },
  summaryAmount: {
    color: '#48544c',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
  },
  summaryAmountStrong: { color: '#1f5530', fontWeight: '800' },
  empty: { padding: 18, color: '#737c74', fontSize: 14 },
  categoryRow: {
    minHeight: 68,
    padding: 16,
    borderTopColor: '#eceeea',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  categoryRowPressed: { backgroundColor: '#f3f7f3' },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryName: { flex: 1, color: '#2c352f', fontSize: 16, fontWeight: '500' },
  budgetValues: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  assigned: {
    minWidth: 72,
    color: '#4f5a52',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '600',
    textAlign: 'right',
  },
  availablePill: {
    minWidth: 78,
    paddingHorizontal: 9,
    paddingVertical: 6,
    backgroundColor: '#d8ebd9',
    borderRadius: 16,
  },
  availablePillWarning: { backgroundColor: '#fff0b8' },
  availablePillNegative: { backgroundColor: '#fde4df' },
  available: {
    color: '#256238',
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    textAlign: 'right',
  },
  availableWarning: { color: '#755600' },
  availableNegative: { color: '#b42318' },
  progressSection: { marginTop: 10, gap: 5 },
  track: {
    height: 6,
    backgroundColor: '#e2e7e2',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progress: { height: '100%', backgroundColor: '#69a746', borderRadius: 3 },
  progressWarning: { backgroundColor: '#e5b900' },
  progressNegative: { backgroundColor: '#c43a43' },
  progressLabel: { color: '#68736b', fontSize: 11, fontWeight: '600' },
  progressLabelWarning: { color: '#806200' },
  progressLabelNegative: { color: '#a42b35' },
});
