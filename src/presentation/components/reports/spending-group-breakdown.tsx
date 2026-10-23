import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SpendingReportColors } from '@/presentation/components/reports/spending-report-colors';
import type { Money } from '@/domain/value-objects/money';
import { formatSpendingPercentage } from '@/presentation/components/reports/spending-report-format';
import type {
  SpendingCategoryView,
  SpendingGroupView,
  SpendingReportViewModel,
  SpendingSelection,
} from '@/presentation/components/reports/spending-report-view-model';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import {
  categoryDisplayName,
  groupDisplayName,
} from '@/presentation/utils/category-name';
import { formatMoney } from '@/presentation/utils/money';

export function SpendingGroupBreakdown({
  colors,
  onSelect,
  view,
}: Readonly<{
  colors: SpendingReportColors;
  onSelect: (selection: SpendingSelection) => void;
  view: SpendingReportViewModel;
}>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [expandedGroupIds, setExpandedGroupIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );

  function toggleGroup(groupId: string) {
    setExpandedGroupIds((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('reports.breakdownByGroup')}</Text>
      <View style={styles.groups}>
        {view.groups.map((group) => (
          <GroupRow
            colors={colors}
            expanded={
              expandedGroupIds.has(group.group.groupId) ||
              view.selection?.groupId === group.group.groupId
            }
            group={group}
            key={group.group.groupId}
            onSelect={onSelect}
            onToggle={() => toggleGroup(group.group.groupId)}
            selectedId={view.selection?.id}
            selectedKind={view.selection?.kind}
          />
        ))}
      </View>
    </View>
  );
}

function GroupRow({
  colors,
  expanded,
  group,
  onSelect,
  onToggle,
  selectedId,
  selectedKind,
}: Readonly<{
  colors: SpendingReportColors;
  expanded: boolean;
  group: SpendingGroupView;
  onSelect: (selection: SpendingSelection) => void;
  onToggle: () => void;
  selectedId?: string;
  selectedKind?: 'group' | 'category';
}>) {
  const { t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const groupId = group.group.groupId;
  const selected = selectedKind === 'group' && selectedId === groupId;
  const color = colors.groups[groupId]!;
  const groupName = groupDisplayName(
    { id: groupId, name: group.group.groupName },
    t,
  );

  return (
    <View style={[styles.group, selected && styles.selectedRow]}>
      <View style={styles.groupHeader}>
        <Pressable
          accessibilityLabel={t('reports.selectGroupA11y', {
            name: groupName,
            amount: formatMoney(group.spending),
          })}
          accessibilityRole="button"
          accessibilityState={{ selected }}
          onPress={() => onSelect({ kind: 'group', groupId })}
          style={({ pressed }) => [
            styles.groupSelection,
            pressed && styles.pressedRow,
          ]}
        >
          <View style={[styles.colorDot, { backgroundColor: color }]} />
          <View style={styles.nameCopy}>
            <Text numberOfLines={1} style={styles.groupName}>
              {groupName}
            </Text>
            <Text style={styles.categoryCount}>
              {t('reports.categoryCount', {
                count: group.categories.length,
              })}
            </Text>
          </View>
          <AmountAndPercentage
            percentage={group.percentageOfInterval}
            spending={group.spending}
          />
        </Pressable>
        <Pressable
          accessibilityLabel={
            expanded
              ? t('reports.collapseGroup', { name: groupName })
              : t('reports.expandGroup', { name: groupName })
          }
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          hitSlop={6}
          onPress={onToggle}
          style={({ pressed }) => [
            styles.expandAction,
            pressed && styles.pressedRow,
          ]}
        >
          <MaterialCommunityIcons
            color={theme.colors.primary}
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
          />
        </Pressable>
      </View>
      <ProportionBar color={color} percentage={group.percentageOfInterval} />
      {expanded ? (
        <View style={styles.categories}>
          {group.categories.map((category) => (
            <CategoryRow
              category={category}
              color={colors.categories[category.category.categoryId]!}
              key={category.category.categoryId}
              onSelect={onSelect}
              selected={
                selectedKind === 'category' &&
                selectedId === category.category.categoryId
              }
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function CategoryRow({
  category,
  color,
  onSelect,
  selected,
}: Readonly<{
  category: SpendingCategoryView;
  color: string;
  onSelect: (selection: SpendingSelection) => void;
  selected: boolean;
}>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const categoryId = category.category.categoryId;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => onSelect({ kind: 'category', categoryId })}
      style={({ pressed }) => [
        styles.categoryRow,
        selected && styles.selectedCategory,
        pressed && styles.pressedRow,
      ]}
    >
      <View style={styles.categoryHeader}>
        <View style={[styles.categoryDot, { backgroundColor: color }]} />
        <Text numberOfLines={1} style={styles.categoryName}>
          {categoryDisplayName(
            { id: categoryId, name: category.category.categoryName },
            t,
          )}
        </Text>
        <AmountAndPercentage
          percentage={category.percentageOfInterval}
          spending={category.spending}
        />
      </View>
      <ProportionBar color={color} percentage={category.percentageOfInterval} />
    </Pressable>
  );
}

function AmountAndPercentage({
  percentage,
  spending,
}: Readonly<{
  percentage: number;
  spending: Money;
}>) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.valueCopy}>
      <Text
        numberOfLines={1}
        style={[styles.rowAmount, spending.cents < 0 && styles.creditAmount]}
      >
        {formatMoney(spending)}
      </Text>
      <Text style={styles.rowPercentage}>
        {spending.cents < 0
          ? t('reports.netCredit')
          : formatSpendingPercentage(percentage)}
      </Text>
    </View>
  );
}

function ProportionBar({
  color,
  percentage,
}: Readonly<{ color: string; percentage: number }>) {
  const styles = useThemedStyles(createStyles);
  return (
    <View style={styles.track}>
      <View
        style={[
          styles.fill,
          { backgroundColor: color, width: `${percentage * 100}%` },
        ]}
      />
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      padding: 16,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 12,
    },
    title: { color: theme.colors.text, fontSize: 18, fontWeight: '800' },
    groups: { gap: 8 },
    group: {
      padding: 8,
      borderColor: 'transparent',
      borderRadius: 14,
      borderWidth: 1,
      gap: 7,
    },
    selectedRow: {
      backgroundColor: theme.colors.primaryMuted,
      borderColor: theme.colors.primary,
    },
    groupHeader: { flexDirection: 'row', alignItems: 'center' },
    groupSelection: {
      minWidth: 0,
      minHeight: 48,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 9,
      flex: 1,
    },
    colorDot: { width: 11, height: 11, borderRadius: 6 },
    nameCopy: { minWidth: 0, flex: 1 },
    groupName: { color: theme.colors.text, fontSize: 14, fontWeight: '800' },
    categoryCount: {
      marginTop: 1,
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '600',
    },
    expandAction: {
      width: 38,
      height: 42,
      marginLeft: 2,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressedRow: { backgroundColor: theme.colors.surfacePressed },
    valueCopy: { maxWidth: '42%', alignItems: 'flex-end' },
    rowAmount: {
      color: theme.colors.text,
      fontSize: 13,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      textAlign: 'right',
    },
    creditAmount: { color: theme.colors.positive },
    rowPercentage: {
      color: theme.colors.textMuted,
      fontSize: 9,
      fontWeight: '700',
      textAlign: 'right',
    },
    track: {
      height: 6,
      backgroundColor: theme.colors.track,
      borderRadius: 3,
      overflow: 'hidden',
    },
    fill: { height: '100%', borderRadius: 3 },
    categories: {
      marginTop: 3,
      paddingTop: 6,
      paddingLeft: 14,
      borderTopColor: theme.colors.border,
      borderTopWidth: StyleSheet.hairlineWidth,
      gap: 4,
    },
    categoryRow: {
      paddingHorizontal: 8,
      paddingVertical: 8,
      borderColor: 'transparent',
      borderRadius: 11,
      borderWidth: 1,
      gap: 6,
    },
    selectedCategory: {
      backgroundColor: theme.colors.primaryMuted,
      borderColor: theme.colors.primary,
    },
    categoryHeader: {
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    categoryDot: { width: 8, height: 8, borderRadius: 4 },
    categoryName: {
      minWidth: 0,
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '700',
      flex: 1,
    },
  });
