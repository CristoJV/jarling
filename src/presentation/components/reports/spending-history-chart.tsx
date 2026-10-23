import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { SpendingIntervalUnit } from '@/domain/services/calculate-spending-report';
import {
  mutedSpendingColor,
  type SpendingReportColors,
} from '@/presentation/components/reports/spending-report-colors';
import {
  spendingIntervalLabel,
  spendingPeriodPhrase,
} from '@/presentation/components/reports/spending-report-format';
import {
  calculateAverageChartSlots,
  calculateStackedChartGeometry,
  type StackedSegmentGeometry,
} from '@/presentation/components/reports/spending-report-geometry';
import type { SpendingReportViewModel } from '@/presentation/components/reports/spending-report-view-model';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { formatMoney } from '@/presentation/utils/money';

const PLOT_HEIGHT = 190;
const PLOT_TOP = 16;
const PLOT_BOTTOM = 18;
const LABEL_HEIGHT = 48;
const VISIBLE_SLOTS = 6;

type ChartSegment = Readonly<{
  id: string;
  groupId: string;
  kind: 'group' | 'category';
}>;

export function SpendingHistoryChart({
  colors,
  interval,
  intervalCount,
  onOpenPeriodSelector,
  onSelectInterval,
  view,
}: Readonly<{
  colors: SpendingReportColors;
  interval: SpendingIntervalUnit;
  intervalCount: number;
  onOpenPeriodSelector: () => void;
  onSelectInterval: (intervalKey: string) => void;
  view: SpendingReportViewModel;
}>) {
  const { language, t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<ScrollView>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [positionedSignature, setPositionedSignature] = useState('');
  const slots = calculateAverageChartSlots(view.intervals.length);
  const stepWidth = viewportWidth / VISIBLE_SLOTS;
  const canvasWidth = Math.max(viewportWidth, slots.length * stepWidth);
  const initialScrollOffset = Math.max(0, canvasWidth - viewportWidth);
  const selectedCategoryId =
    view.selection?.kind === 'category' ? view.selection.id : undefined;
  const selectedGroupId = view.selection?.groupId;
  const groupsByAverage = [...view.groups].sort(
    (left, right) =>
      right.group.average.cents - left.group.average.cents ||
      left.group.groupName.localeCompare(right.group.groupName),
  );
  const prioritizedGroups = selectedGroupId
    ? [
        ...groupsByAverage.filter(
          ({ group }) => group.groupId === selectedGroupId,
        ),
        ...groupsByAverage.filter(
          ({ group }) => group.groupId !== selectedGroupId,
        ),
      ]
    : groupsByAverage;
  const rawSegmentOrder: readonly ChartSegment[] =
    prioritizedGroups.flatMap<ChartSegment>(({ group, categories }) =>
      selectedGroupId === group.groupId
        ? [...categories]
            .sort(
              (left, right) =>
                right.category.average.cents - left.category.average.cents ||
                left.category.categoryName.localeCompare(
                  right.category.categoryName,
                ),
            )
            .map(({ category }) => ({
              id: category.categoryId,
              groupId: group.groupId,
              kind: 'category' as const,
            }))
        : [
            {
              id: group.groupId,
              groupId: group.groupId,
              kind: 'group' as const,
            },
          ],
    );
  const seenSegmentIds = new Set<string>();
  const segmentOrder = rawSegmentOrder.filter(({ id }) => {
    if (seenSegmentIds.has(id)) return false;
    seenSegmentIds.add(id);
    return true;
  });
  const segmentById = new Map(
    segmentOrder.map((segment) => [segment.id, segment]),
  );
  const groupAverageById = new Map(
    view.groups.map(({ group }) => [group.groupId, group.average.cents]),
  );
  const categoryAverageById = new Map(
    view.groups.flatMap(({ categories }) =>
      categories.map(
        ({ category }) =>
          [category.categoryId, category.average.cents] as const,
      ),
    ),
  );
  const rows = slots.map((intervalIndex) => {
    if (intervalIndex === undefined) return [];
    if (intervalIndex === 'average') {
      return segmentOrder.map(({ id, kind }) => ({
        id,
        value:
          (kind === 'category' ? categoryAverageById : groupAverageById).get(
            id,
          ) ?? 0,
      }));
    }
    const row = view.intervals[intervalIndex]!;
    const groupValues = new Map(
      row.groupSegments.map((segment) => [segment.id, segment.spending.cents]),
    );
    const categoryValues = new Map(
      row.categorySegments.map((segment) => [
        segment.id,
        segment.spending.cents,
      ]),
    );
    return segmentOrder.map(({ id, kind }) => ({
      id,
      value: (kind === 'category' ? categoryValues : groupValues).get(id) ?? 0,
    }));
  });
  const geometry = calculateStackedChartGeometry(
    rows,
    PLOT_TOP,
    PLOT_BOTTOM,
    PLOT_HEIGHT,
    selectedCategoryId,
  );
  const barWidth = Math.min(38, stepWidth * 0.52);
  const signature = `${interval}:${view.intervals.length}:${viewportWidth}`;

  useEffect(() => {
    if (viewportWidth === 0 || positionedSignature === signature) return;
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        animated: false,
        x: initialScrollOffset,
        y: 0,
      });
      setPositionedSignature(signature);
    });
    return () => cancelAnimationFrame(frame);
  }, [initialScrollOffset, positionedSignature, signature, viewportWidth]);

  function handleLayout(event: LayoutChangeEvent) {
    const width = event.nativeEvent.layout.width;
    if (width !== viewportWidth) {
      setViewportWidth(width);
      setPositionedSignature('');
    }
  }

  const selectedLineId = view.selection?.id;
  const linePoints = view.selection
    ? slots.flatMap((intervalIndex, slotIndex) => {
        if (typeof intervalIndex !== 'number') return [];
        const intervalView = view.intervals[intervalIndex]!;
        const values =
          view.selection!.kind === 'category'
            ? intervalView.categorySegments
            : intervalView.groupSegments;
        const value =
          values.find(({ id }) => id === selectedLineId)?.spending.cents ?? 0;
        return [
          {
            key: view.intervals[intervalIndex]!.interval.key,
            x: (slotIndex + 0.5) * stepWidth,
            y: geometry.baselineY - value * geometry.scale,
          },
        ];
      })
    : [];
  const selectionColor = view.selection
    ? view.selection.kind === 'category'
      ? colors.categories[view.selection.id]!
      : colors.groups[view.selection.id]!
    : theme.colors.primary;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleCopy}>
          <Text numberOfLines={1} style={styles.title}>
            {t(`reports.breakdownBy.${interval}`)}
          </Text>
          {view.selection ? (
            <Text numberOfLines={1} style={styles.selectionContext}>
              {view.selection.name}
            </Text>
          ) : null}
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={onOpenPeriodSelector}
          style={({ pressed }) => [
            styles.periodSelector,
            pressed && styles.periodSelectorPressed,
          ]}
        >
          <Text numberOfLines={1} style={styles.periodSelectorText}>
            {spendingPeriodPhrase(intervalCount, interval, t)}
          </Text>
          <MaterialCommunityIcons
            color={theme.colors.primary}
            name="chevron-down"
            size={16}
          />
        </Pressable>
      </View>

      <View style={styles.summary}>
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>{t('reports.periodTotal')}</Text>
          <Text numberOfLines={1} style={styles.metricValue}>
            {formatMoney(view.windowTotal)}
          </Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.metric}>
          <Text style={styles.metricLabel}>
            {t(`reports.averageBy.${interval}`)}
          </Text>
          <Text numberOfLines={1} style={styles.metricValue}>
            {formatMoney(view.windowAverage)}
          </Text>
        </View>
      </View>

      <View onLayout={handleLayout} style={styles.viewport}>
        {viewportWidth > 0 ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            ref={scrollRef}
            showsHorizontalScrollIndicator={slots.length > VISIBLE_SLOTS}
          >
            <View style={[styles.canvas, { width: canvasWidth }]}>
              <View
                style={[
                  styles.axis,
                  {
                    backgroundColor: theme.colors.border,
                    top: geometry.baselineY,
                  },
                ]}
              />
              {slots.map((intervalIndex, slotIndex) => {
                if (intervalIndex === undefined) return null;
                const average = intervalIndex === 'average';
                const row = average ? undefined : view.intervals[intervalIndex];
                const selected = row?.interval.key === view.activeInterval.key;
                const rowGeometry = geometry.rows[slotIndex]!;
                return (
                  <Pressable
                    accessibilityLabel={t('reports.historyBarA11y', {
                      interval: average
                        ? t('reports.average')
                        : spendingIntervalLabel(
                            row!.interval,
                            interval,
                            language,
                            true,
                          ),
                      amount: formatMoney(
                        average ? view.windowAverage : row!.spending,
                      ),
                    })}
                    accessibilityRole={average ? undefined : 'button'}
                    accessibilityState={{ selected }}
                    disabled={average}
                    key={
                      average ? 'average' : `${slotIndex}:${row!.interval.key}`
                    }
                    onPress={
                      average
                        ? undefined
                        : () => onSelectInterval(row!.interval.key)
                    }
                    style={[
                      styles.barSlot,
                      { left: slotIndex * stepWidth, width: stepWidth },
                    ]}
                  >
                    {rowGeometry.map((segment, segmentIndex) => {
                      const definition = segmentById.get(segment.id)!;
                      const highlighted =
                        view.selection?.kind === 'group'
                          ? definition.groupId === selectedGroupId
                          : view.selection?.kind === 'category'
                            ? definition.id === selectedCategoryId
                            : true;
                      const siblingCategory =
                        view.selection?.kind === 'category' &&
                        definition.kind === 'category' &&
                        definition.groupId === selectedGroupId;
                      const color =
                        definition.kind === 'category'
                          ? colors.categories[definition.id]
                          : colors.groups[definition.id];
                      return (
                        <View
                          key={segment.id}
                          style={[
                            styles.barSegment,
                            outerCornerStyle(
                              rowGeometry,
                              segment,
                              segmentIndex,
                            ),
                            {
                              backgroundColor: highlighted
                                ? color
                                : mutedSpendingColor(
                                    color!,
                                    theme.dark,
                                    siblingCategory ? 0.5 : 0.82,
                                  ),
                              height: Math.max(1, segment.height),
                              left: (stepWidth - barWidth) / 2,
                              top: segment.top,
                              width: barWidth,
                            },
                          ]}
                        />
                      );
                    })}
                    <View style={styles.intervalCopy}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.intervalLabel,
                          (selected || average) && styles.intervalLabelSelected,
                        ]}
                      >
                        {average
                          ? t('reports.average')
                          : spendingIntervalLabel(
                              row!.interval,
                              interval,
                              language,
                            )}
                      </Text>
                      <Text
                        adjustsFontSizeToFit
                        minimumFontScale={0.7}
                        numberOfLines={1}
                        style={[
                          styles.intervalAmount,
                          (selected || average) &&
                            styles.intervalAmountSelected,
                        ]}
                      >
                        {formatMoney(
                          average ? view.windowAverage : row!.spending,
                        )}
                      </Text>
                    </View>
                  </Pressable>
                );
              })}
              {view.selection
                ? linePoints
                    .slice(0, -1)
                    .map((point, index) => (
                      <ChartLine
                        color={selectionColor}
                        end={linePoints[index + 1]!}
                        key={`line-${point.key}`}
                        start={point}
                      />
                    ))
                : null}
              {view.selection
                ? linePoints.map((point) => (
                    <View
                      key={`point-${point.key}`}
                      pointerEvents="none"
                      style={[
                        styles.linePoint,
                        {
                          backgroundColor: selectionColor,
                          borderColor: theme.colors.surface,
                          left: point.x - 4,
                          top: point.y - 4,
                        },
                      ]}
                    />
                  ))
                : null}
            </View>
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

function outerCornerStyle(
  row: readonly StackedSegmentGeometry[],
  segment: StackedSegmentGeometry,
  index: number,
) {
  const positiveIndices = row.flatMap(({ value }, rowIndex) =>
    value > 0 ? [rowIndex] : [],
  );
  const negativeIndices = row.flatMap(({ value }, rowIndex) =>
    value < 0 ? [rowIndex] : [],
  );
  const radius = 5;
  if (segment.value > 0) {
    return {
      borderTopLeftRadius:
        index === positiveIndices.at(-1) ? radius : undefined,
      borderTopRightRadius:
        index === positiveIndices.at(-1) ? radius : undefined,
      borderBottomLeftRadius:
        negativeIndices.length === 0 && index === positiveIndices[0]
          ? radius
          : undefined,
      borderBottomRightRadius:
        negativeIndices.length === 0 && index === positiveIndices[0]
          ? radius
          : undefined,
    };
  }
  return {
    borderTopLeftRadius:
      positiveIndices.length === 0 && index === negativeIndices[0]
        ? radius
        : undefined,
    borderTopRightRadius:
      positiveIndices.length === 0 && index === negativeIndices[0]
        ? radius
        : undefined,
    borderBottomLeftRadius:
      index === negativeIndices.at(-1) ? radius : undefined,
    borderBottomRightRadius:
      index === negativeIndices.at(-1) ? radius : undefined,
  };
}

function ChartLine({
  color,
  end,
  start,
}: Readonly<{
  color: string;
  end: Readonly<{ x: number; y: number }>;
  start: Readonly<{ x: number; y: number }>;
}>) {
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const length = Math.hypot(deltaX, deltaY);
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        height: 2,
        width: length,
        left: (start.x + end.x - length) / 2,
        top: (start.y + end.y) / 2 - 1,
        backgroundColor: color,
        borderRadius: 1,
        transform: [{ rotate: `${Math.atan2(deltaY, deltaX)}rad` }],
      }}
    />
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      paddingTop: 16,
      paddingBottom: 12,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 12,
      overflow: 'hidden',
    },
    header: {
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    titleCopy: { minWidth: 0, flex: 1 },
    title: { color: theme.colors.text, fontSize: 17, fontWeight: '800' },
    selectionContext: {
      marginTop: 1,
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
    },
    periodSelector: {
      maxWidth: '48%',
      height: 32,
      paddingHorizontal: 9,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    periodSelectorPressed: { backgroundColor: theme.colors.surfacePressed },
    periodSelectorText: {
      minWidth: 0,
      color: theme.colors.primary,
      fontSize: 11,
      fontWeight: '800',
      flexShrink: 1,
    },
    summary: {
      marginHorizontal: 16,
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'stretch',
    },
    metric: { minWidth: 0, flex: 1 },
    metricLabel: {
      color: theme.colors.textMuted,
      fontSize: 9,
      fontWeight: '800',
      textTransform: 'uppercase',
    },
    metricValue: {
      marginTop: 2,
      color: theme.colors.text,
      fontSize: 15,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    summaryDivider: {
      width: StyleSheet.hairlineWidth,
      marginHorizontal: 12,
      backgroundColor: theme.colors.border,
    },
    viewport: { width: '100%', height: PLOT_HEIGHT + LABEL_HEIGHT },
    canvas: { height: PLOT_HEIGHT + LABEL_HEIGHT },
    axis: {
      position: 'absolute',
      right: 0,
      left: 0,
      height: StyleSheet.hairlineWidth,
    },
    barSlot: {
      position: 'absolute',
      top: 0,
      height: PLOT_HEIGHT + LABEL_HEIGHT,
    },
    barSegment: { position: 'absolute' },
    intervalCopy: {
      position: 'absolute',
      top: PLOT_HEIGHT + 5,
      right: 1,
      left: 1,
      alignItems: 'center',
    },
    intervalLabel: {
      color: theme.colors.textMuted,
      fontSize: 9,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      textAlign: 'center',
    },
    intervalLabelSelected: { color: theme.colors.primary, fontWeight: '900' },
    intervalAmount: {
      width: '100%',
      marginTop: 2,
      color: theme.colors.textSecondary,
      fontSize: 9,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      textAlign: 'center',
    },
    intervalAmountSelected: { color: theme.colors.text, fontWeight: '900' },
    linePoint: {
      position: 'absolute',
      width: 8,
      height: 8,
      borderRadius: 4,
      borderWidth: 2,
    },
  });
