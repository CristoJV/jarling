import { useState } from 'react';
import {
  type LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { CategoryBalanceHistoryPoint } from '@/domain/services/calculate-category-balance-history';
import { daysInBudgetMonth } from '@/domain/services/calculate-category-balance-history';
import { Money } from '@/domain/value-objects/money';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { SupportedLanguage } from '@/presentation/localization/translator';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { formatMoney } from '@/presentation/utils/money';

const PLOT_HEIGHT = 144;
const PLOT_TOP = 12;
const PLOT_BOTTOM = 12;
const PLOT_SIDE = 12;
const AXIS_LABEL_WIDTH = 32;
const VALUE_LABEL_HEIGHT = 15;
const VALUE_LABEL_GAP = 2;

export type CategoryBalanceChartPoint = Readonly<{
  x: number;
  y: number;
  amountCents: number;
  kind: CategoryBalanceHistoryPoint['kind'];
  retroactive: boolean;
}>;

export type CategoryBalanceChartSegment = Readonly<{
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  color: 'positive' | 'negative';
}>;

export type CategoryBalanceCheckpointPoint = Readonly<{
  position: number;
  x: number;
  y: number;
  amountCents: number;
}>;

export type CategoryBalanceValueLabel = Readonly<{
  point: CategoryBalanceCheckpointPoint;
  text: string;
  left: number;
  top: number;
  width: number;
  height: number;
}>;

export type CategoryBalanceChartLayout = Readonly<{
  points: readonly CategoryBalanceChartPoint[];
  zeroY: number;
}>;

export function calculateCategoryBalanceChartLayout(
  history: readonly CategoryBalanceHistoryPoint[],
  width: number,
  finalDay: number,
): CategoryBalanceChartLayout {
  if (history.length === 0 || width <= PLOT_SIDE * 2) {
    return { points: [], zeroY: PLOT_HEIGHT / 2 };
  }
  const values = history.map(({ amount }) => amount.cents);
  const minimum = Math.min(0, ...values);
  const maximum = Math.max(0, ...values);
  const range = maximum - minimum;
  const usableHeight = PLOT_HEIGHT - PLOT_TOP - PLOT_BOTTOM;
  const usableWidth = width - PLOT_SIDE * 2;
  const yFor = (cents: number) =>
    range === 0
      ? PLOT_TOP + usableHeight / 2
      : PLOT_TOP + ((maximum - cents) / range) * usableHeight;
  return {
    points: history.map(({ position, amount, kind, retroactive }) => ({
      x: PLOT_SIDE + (position / finalDay) * usableWidth,
      y: yFor(amount.cents),
      amountCents: amount.cents,
      kind,
      retroactive,
    })),
    zeroY: yFor(0),
  };
}

export function calculateCategoryBalanceChartSegments(
  points: readonly CategoryBalanceChartPoint[],
  zeroY: number,
): readonly CategoryBalanceChartSegment[] {
  const segments: CategoryBalanceChartSegment[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const start = points[index]!;
    const end = points[index + 1]!;
    if (start.amountCents * end.amountCents < 0) {
      const ratio = -start.amountCents / (end.amountCents - start.amountCents);
      const crossingX = start.x + ratio * (end.x - start.x);
      const crossing = { x: crossingX, y: zeroY };
      segments.push({
        startX: start.x,
        startY: start.y,
        endX: crossing.x,
        endY: crossing.y,
        color: start.amountCents < 0 ? 'negative' : 'positive',
      });
      segments.push({
        startX: crossing.x,
        startY: crossing.y,
        endX: end.x,
        endY: end.y,
        color: end.amountCents < 0 ? 'negative' : 'positive',
      });
      continue;
    }
    segments.push({
      startX: start.x,
      startY: start.y,
      endX: end.x,
      endY: end.y,
      color:
        start.amountCents < 0 || end.amountCents < 0 ? 'negative' : 'positive',
    });
  }
  return segments;
}

export function calculateCategoryBalanceCheckpointPoints(
  history: readonly CategoryBalanceHistoryPoint[],
  layout: CategoryBalanceChartLayout,
  month: string,
  finalDay: number,
  width: number,
): readonly CategoryBalanceCheckpointPoint[] {
  if (history.length === 0 || layout.points.length !== history.length)
    return [];
  const throughDay = Math.floor(history.at(-1)?.position ?? 0);
  const positions = new Set<number>([0, Math.min(1, throughDay), throughDay]);
  for (let day = 1; day <= throughDay; day += 1) {
    const date = new Date(`${month}-${String(day).padStart(2, '0')}T00:00:00Z`);
    if (date.getUTCDay() === 1) positions.add(day);
  }
  const usableWidth = Math.max(0, width - PLOT_SIDE * 2);
  const checkpoints = [...positions]
    .filter((position) => position >= 0)
    .sort((left, right) => left - right)
    .map((position) => {
      let sourceIndex = 0;
      for (let index = 1; index < history.length; index += 1) {
        if (history[index]!.position > position) break;
        sourceIndex = index;
      }
      const source = layout.points[sourceIndex]!;
      return {
        position,
        x: PLOT_SIDE + (position / finalDay) * usableWidth,
        y: source.y,
        amountCents: history[sourceIndex]!.amount.cents,
      };
    });
  return checkpoints.filter(
    (point, index) =>
      index === 0 || point.amountCents !== checkpoints[index - 1]!.amountCents,
  );
}

export function calculateCategoryBalanceValueLabels(
  checkpoints: readonly CategoryBalanceCheckpointPoint[],
  texts: readonly string[],
  width: number,
): readonly CategoryBalanceValueLabel[] {
  const lanes = Array.from(
    {
      length: Math.floor(
        (PLOT_HEIGHT - 1 + VALUE_LABEL_GAP) /
          (VALUE_LABEL_HEIGHT + VALUE_LABEL_GAP),
      ),
    },
    (_, index) => 1 + index * (VALUE_LABEL_HEIGHT + VALUE_LABEL_GAP),
  );
  const labels: CategoryBalanceValueLabel[] = [];

  for (const [index, point] of checkpoints.entries()) {
    const text = texts[index] ?? '';
    const estimatedWidth = Math.ceil(Array.from(text).length * 5.4 + 8);
    const labelWidth = Math.max(24, Math.min(width, estimatedWidth));
    const left = Math.max(
      0,
      Math.min(width - labelWidth, point.x - labelWidth / 2),
    );
    const orderedLanes = [...lanes].sort((leftLane, rightLane) => {
      const score = (top: number) => {
        const containsPoint =
          point.y >= top - VALUE_LABEL_GAP &&
          point.y <= top + VALUE_LABEL_HEIGHT + VALUE_LABEL_GAP;
        return (
          Math.abs(top + VALUE_LABEL_HEIGHT / 2 - point.y) +
          (containsPoint ? PLOT_HEIGHT : 0)
        );
      };
      return score(leftLane) - score(rightLane);
    });
    const top =
      orderedLanes.find((candidateTop) =>
        labels.every(
          (label) =>
            left + labelWidth + VALUE_LABEL_GAP <= label.left ||
            label.left + label.width + VALUE_LABEL_GAP <= left ||
            candidateTop + VALUE_LABEL_HEIGHT + VALUE_LABEL_GAP <= label.top ||
            label.top + label.height + VALUE_LABEL_GAP <= candidateTop,
        ),
      ) ?? lanes[labels.length % lanes.length]!;
    labels.push({
      point,
      text,
      left,
      top,
      width: labelWidth,
      height: VALUE_LABEL_HEIGHT,
    });
  }
  return labels;
}

export function categoryBalanceAxisDays(month: string): readonly number[] {
  const finalDay = daysInBudgetMonth(month);
  const days = new Set([1, finalDay]);
  for (let day = 1; day <= finalDay; day += 1) {
    const date = new Date(`${month}-${String(day).padStart(2, '0')}T00:00:00Z`);
    if (date.getUTCDay() === 1) days.add(day);
  }
  return [...days].sort((left, right) => left - right);
}

export function formatCategoryBalanceAxisLabel(
  month: string,
  day: number,
  language: SupportedLanguage,
): string {
  const date = new Date(`${month}-${String(day).padStart(2, '0')}T00:00:00Z`);
  const weekday = new Intl.DateTimeFormat(language, {
    weekday: 'short',
    timeZone: 'UTC',
  })
    .format(date)
    .replaceAll('.', '');
  const letters = Array.from(weekday).slice(0, 2).join('');
  const abbreviation =
    letters.charAt(0).toLocaleUpperCase(language) +
    letters.slice(1).toLocaleLowerCase(language);
  return `${abbreviation}${day}`;
}

function SlopedLine({
  segment,
  color,
  thickness = 2,
}: Readonly<{
  segment: CategoryBalanceChartSegment;
  color: string;
  thickness?: number;
}>) {
  const deltaX = segment.endX - segment.startX;
  const deltaY = segment.endY - segment.startY;
  const length = Math.hypot(deltaX, deltaY);
  const angle = Math.atan2(deltaY, deltaX);
  return (
    <View
      style={{
        position: 'absolute',
        backgroundColor: color,
        borderRadius: 1,
        height: thickness,
        left: (segment.startX + segment.endX - length) / 2,
        top: (segment.startY + segment.endY - thickness) / 2,
        transform: [{ rotate: `${angle}rad` }],
        width: length,
      }}
    />
  );
}

function DottedHorizontalLine({
  y,
  width,
  color,
}: Readonly<{
  y: number;
  width: number;
  color: string;
}>) {
  const count = Math.max(0, Math.floor((width - PLOT_SIDE * 2) / 8));
  return (
    <>
      {Array.from({ length: count }, (_, index) => (
        <View
          key={`zero-${index}`}
          style={{
            position: 'absolute',
            backgroundColor: color,
            height: 1,
            left: PLOT_SIDE + index * 8,
            top: y,
            width: 4,
          }}
        />
      ))}
    </>
  );
}

export function CategoryBalanceChart({
  history,
  month,
}: Readonly<{
  history: readonly CategoryBalanceHistoryPoint[];
  month: string;
}>) {
  const { language, t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const [width, setWidth] = useState(0);
  const [showingValues, setShowingValues] = useState(false);
  const finalDay = daysInBudgetMonth(month);
  const { points, zeroY } = calculateCategoryBalanceChartLayout(
    history,
    width,
    finalDay,
  );
  const segments = calculateCategoryBalanceChartSegments(points, zeroY);
  const checkpointPoints = calculateCategoryBalanceCheckpointPoints(
    history,
    { points, zeroY },
    month,
    finalDay,
    width,
  );
  const valueLabels = calculateCategoryBalanceValueLabels(
    checkpointPoints,
    checkpointPoints.map(({ amountCents }) =>
      formatMoney(Money.fromCents(amountCents)),
    ),
    width,
  );
  const finalAmount = history.at(-1)?.amount;
  const hasRetroactive = history.some(({ retroactive }) => retroactive);
  const axisDays = categoryBalanceAxisDays(month);
  const usableWidth = Math.max(0, width - PLOT_SIDE * 2);

  function handleLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('categoryDetails.balanceHistory')}</Text>
        {finalAmount ? (
          <Text style={styles.amount}>{formatMoney(finalAmount)}</Text>
        ) : null}
      </View>
      <Pressable
        accessible
        accessibilityLabel={t('categoryDetails.balanceHistoryA11y', {
          amount: formatMoney(finalAmount ?? Money.zero()),
        })}
        accessibilityHint={t('categoryDetails.balanceHistoryHint')}
        accessibilityRole="button"
        accessibilityState={{ expanded: showingValues }}
        onLayout={handleLayout}
        onPress={() => setShowingValues((current) => !current)}
        style={styles.plot}
      >
        {axisDays
          .filter((day) => {
            const date = new Date(
              `${month}-${String(day).padStart(2, '0')}T00:00:00Z`,
            );
            return date.getUTCDay() === 1;
          })
          .map((day) => {
            const x = PLOT_SIDE + (day / finalDay) * usableWidth;
            return (
              <View key={`week-${day}`} style={[styles.weekGuide, { left: x }]}>
                {Array.from({ length: 12 }, (_, index) => (
                  <View key={index} style={styles.weekGuideDot} />
                ))}
              </View>
            );
          })}
        {segments.map((segment, index) => (
          <SlopedLine
            color={
              segment.color === 'negative'
                ? theme.colors.negative
                : theme.colors.positive
            }
            key={`segment-${index}`}
            segment={segment}
          />
        ))}
        <DottedHorizontalLine
          color={theme.colors.negative}
          width={width}
          y={zeroY}
        />
        {showingValues
          ? valueLabels.map((label) => (
              <SlopedLine
                color="#ffffff"
                key={`connector-${label.point.position}`}
                segment={{
                  startX: label.left + label.width / 2,
                  startY: label.top + label.height / 2,
                  endX: label.point.x,
                  endY: label.point.y,
                  color: 'positive',
                }}
                thickness={0.75}
              />
            ))
          : null}
        {checkpointPoints.map((point, index) => (
          <View
            key={`point-${point.position}`}
            style={[
              index === 0 ? styles.openingPoint : styles.point,
              {
                backgroundColor:
                  index === 0
                    ? theme.colors.progressWarningFunded
                    : point.amountCents < 0
                      ? theme.colors.negative
                      : theme.colors.positive,
                borderColor: theme.colors.surface,
                left: point.x - (index === 0 ? 5 : 3),
                top: point.y - (index === 0 ? 5 : 3),
              },
            ]}
          />
        ))}
        {showingValues
          ? valueLabels.map((label) => (
              <Text
                key={`value-${label.point.position}`}
                numberOfLines={1}
                style={[
                  styles.valueLabel,
                  {
                    height: label.height,
                    left: label.left,
                    top: label.top,
                    width: label.width,
                  },
                ]}
              >
                {label.text}
              </Text>
            ))
          : null}
      </Pressable>
      <View style={styles.axis}>
        {axisDays.map((day) => {
          const x = PLOT_SIDE + (day / finalDay) * usableWidth;
          const left = Math.max(
            0,
            Math.min(width - AXIS_LABEL_WIDTH, x - AXIS_LABEL_WIDTH / 2),
          );
          return (
            <Text
              key={day}
              style={[
                styles.axisLabel,
                {
                  left,
                  top: day === 1 || day === finalDay ? 0 : 12,
                },
              ]}
            >
              {formatCategoryBalanceAxisLabel(month, day, language)}
            </Text>
          );
        })}
      </View>
      {hasRetroactive ? (
        <Text style={styles.note}>{t('categoryDetails.retroactiveNote')}</Text>
      ) : null}
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      padding: 18,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 8,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    title: {
      flex: 1,
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    amount: {
      color: theme.colors.primary,
      fontSize: 15,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
    },
    plot: { height: PLOT_HEIGHT, overflow: 'hidden' },
    weekGuide: {
      position: 'absolute',
      top: PLOT_TOP,
      height: PLOT_HEIGHT - PLOT_TOP - PLOT_BOTTOM,
      justifyContent: 'space-between',
      width: 1,
    },
    weekGuideDot: {
      width: 1,
      height: 5,
      backgroundColor: theme.colors.border,
    },
    point: {
      position: 'absolute',
      width: 6,
      height: 6,
      borderRadius: 3,
      borderWidth: 1,
    },
    openingPoint: {
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 2,
    },
    valueLabel: {
      position: 'absolute',
      paddingHorizontal: 3,
      overflow: 'hidden',
      backgroundColor: theme.colors.surfaceElevated,
      borderColor: theme.colors.border,
      borderRadius: 5,
      borderWidth: 1,
      color: theme.colors.text,
      fontSize: 9,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      textAlign: 'center',
    },
    axis: { height: 28, position: 'relative' },
    axisLabel: {
      position: 'absolute',
      width: AXIS_LABEL_WIDTH,
      color: theme.colors.textMuted,
      fontSize: 10,
      fontWeight: '700',
      textAlign: 'center',
    },
    note: { color: theme.colors.warning, fontSize: 12 },
  });
