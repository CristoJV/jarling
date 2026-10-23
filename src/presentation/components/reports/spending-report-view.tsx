import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type {
  SpendingIntervalUnit,
  SpendingReport,
} from '@/domain/services/calculate-spending-report';
import { SpendingDonutCard } from '@/presentation/components/reports/spending-donut-card';
import { SpendingGroupBreakdown } from '@/presentation/components/reports/spending-group-breakdown';
import { SpendingHistoryChart } from '@/presentation/components/reports/spending-history-chart';
import { createSpendingReportColors } from '@/presentation/components/reports/spending-report-colors';
import {
  buildSpendingReportViewModel,
  type SpendingSelection,
} from '@/presentation/components/reports/spending-report-view-model';
import { useAppTheme } from '@/presentation/theme/theme-provider';

export function SpendingReportView({
  interval,
  intervalCount,
  onOpenIntervalSelector,
  onOpenPeriodSelector,
  onSelectInterval,
  onSelectionChange,
  report,
  selectedIntervalKey,
  selection,
}: Readonly<{
  interval: SpendingIntervalUnit;
  intervalCount: number;
  onOpenIntervalSelector: () => void;
  onOpenPeriodSelector: () => void;
  onSelectInterval: (intervalKey: string) => void;
  onSelectionChange: (selection?: SpendingSelection) => void;
  report: SpendingReport;
  selectedIntervalKey?: string;
  selection?: SpendingSelection;
}>) {
  const theme = useAppTheme();
  const view = buildSpendingReportViewModel(
    report,
    selectedIntervalKey,
    selection,
  );
  const colors = useMemo(
    () =>
      createSpendingReportColors(
        view.groups.map(({ group }) => group),
        theme.dark,
      ),
    [theme.dark, view.groups],
  );

  function handleSelection(next: SpendingSelection) {
    const alreadySelected =
      next.kind === 'group'
        ? selection?.kind === 'group' && next.groupId === selection.groupId
        : selection?.kind === 'category' &&
          next.categoryId === selection.categoryId;
    if (alreadySelected) {
      onSelectionChange(undefined);
      return;
    }
    onSelectionChange(next);
  }

  return (
    <View style={styles.container}>
      <SpendingDonutCard
        colors={colors}
        interval={interval}
        onOpenIntervalSelector={onOpenIntervalSelector}
        onSelectInterval={onSelectInterval}
        onSelectItem={handleSelection}
        view={view}
      />
      <SpendingHistoryChart
        colors={colors}
        interval={interval}
        intervalCount={intervalCount}
        onOpenPeriodSelector={onOpenPeriodSelector}
        onSelectInterval={onSelectInterval}
        view={view}
      />
      <SpendingGroupBreakdown
        colors={colors}
        onSelect={handleSelection}
        view={view}
      />
    </View>
  );
}

const styles = StyleSheet.create({ container: { gap: 16 } });
