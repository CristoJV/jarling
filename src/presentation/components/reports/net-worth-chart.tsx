import { useEffect, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ReportMonth } from '@/domain/services/calculate-reports';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { SupportedLanguage } from '@/presentation/localization/translator';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';
import { formatBudgetMonth } from '@/presentation/utils/calendar';

const VISIBLE_STEPS = 6;
const MAX_INITIAL_POINTS = VISIBLE_STEPS - 1;
const PLOT_HEIGHT = 170;
const PLOT_TOP = 30;
const PLOT_BOTTOM = 24;

export type NetWorthChartPoint = Readonly<{
  x: number;
  y: number;
}>;

export function calculateNetWorthChartLayout(
  viewportWidth: number,
  monthCount: number,
) {
  const stepWidth = viewportWidth / VISIBLE_STEPS;
  const canvasWidth = Math.max(
    viewportWidth,
    (Math.max(0, monthCount) + 1) * stepWidth,
  );
  return {
    stepWidth,
    canvasWidth,
    initialScrollOffset: Math.max(0, canvasWidth - viewportWidth),
  } as const;
}

export function calculateNetWorthChartPoints(
  values: readonly number[],
  stepWidth: number,
): readonly NetWorthChartPoint[] {
  if (values.length === 0) return [];
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = maximum - minimum;
  const usableHeight = PLOT_HEIGHT - PLOT_TOP - PLOT_BOTTOM;

  return values.map((value, index) => ({
    x: (index + 0.5) * stepWidth,
    y:
      range === 0
        ? PLOT_TOP + usableHeight / 2
        : PLOT_TOP + ((maximum - value) / range) * usableHeight,
  }));
}

export function compactNetWorth(cents: number): string {
  return `${(cents / 100_000).toFixed(1)}k`;
}

export function compactNetWorthMonth(
  month: string,
  language: SupportedLanguage,
): string {
  const shortMonth = formatBudgetMonth(month, language, {
    month: 'short',
  }).replace(/[.]$/u, '');
  return `${shortMonth}.${month.slice(2, 4)}`;
}

export function NetWorthChart({
  months,
}: Readonly<{ months: readonly ReportMonth[] }>) {
  const { language, t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<ScrollView>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [positionedMonthCount, setPositionedMonthCount] = useState(0);
  const { stepWidth, canvasWidth, initialScrollOffset } =
    calculateNetWorthChartLayout(viewportWidth, months.length);
  const points = calculateNetWorthChartPoints(
    months.map(({ netWorth }) => netWorth.cents),
    stepWidth,
  );

  useEffect(() => {
    if (viewportWidth === 0 || positionedMonthCount === months.length) return;
    const frame = requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({
        animated: false,
        x: initialScrollOffset,
        y: 0,
      });
      setPositionedMonthCount(months.length);
    });
    return () => cancelAnimationFrame(frame);
  }, [initialScrollOffset, months.length, positionedMonthCount, viewportWidth]);

  function handleLayout(event: LayoutChangeEvent) {
    const width = event.nativeEvent.layout.width;
    if (width !== viewportWidth) {
      setViewportWidth(width);
      setPositionedMonthCount(0);
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{t('reports.netWorthHistory')}</Text>
      <View onLayout={handleLayout} style={styles.viewport}>
        {viewportWidth > 0 ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            ref={scrollRef}
            showsHorizontalScrollIndicator={months.length > MAX_INITIAL_POINTS}
          >
            <View
              accessible
              accessibilityLabel={t('reports.netWorthHistory')}
              accessibilityRole="image"
              style={[styles.canvas, { width: canvasWidth }]}
            >
              {points.slice(0, -1).map((point, index) => {
                const next = points[index + 1]!;
                const deltaX = next.x - point.x;
                const deltaY = next.y - point.y;
                const length = Math.hypot(deltaX, deltaY);
                const angle = `${Math.atan2(deltaY, deltaX)}rad`;
                return (
                  <View
                    key={`line-${months[index]?.month}`}
                    style={[
                      styles.line,
                      {
                        backgroundColor: theme.colors.primary,
                        left: (point.x + next.x - length) / 2,
                        top: (point.y + next.y) / 2 - 1,
                        width: length,
                        transform: [{ rotate: angle }],
                      },
                    ]}
                  />
                );
              })}
              {points.map((point, index) => {
                const month = months[index]!;
                return (
                  <View key={month.month}>
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.value,
                        {
                          left: point.x - stepWidth / 2,
                          top: point.y - 27,
                          width: stepWidth,
                        },
                      ]}
                    >
                      {compactNetWorth(month.netWorth.cents)}
                    </Text>
                    <View
                      style={[
                        styles.point,
                        {
                          backgroundColor: theme.colors.primary,
                          borderColor: theme.colors.surface,
                          left: point.x - 5,
                          top: point.y - 5,
                        },
                      ]}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.month,
                        {
                          left: point.x - stepWidth / 2,
                          width: stepWidth,
                        },
                      ]}
                    >
                      {compactNetWorthMonth(month.month, language)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </ScrollView>
        ) : null}
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) =>
  StyleSheet.create({
    card: {
      paddingTop: 18,
      paddingBottom: 12,
      backgroundColor: theme.colors.surface,
      borderColor: theme.colors.border,
      borderRadius: 22,
      borderWidth: 1,
      gap: 8,
      overflow: 'hidden',
    },
    title: {
      paddingHorizontal: 18,
      color: theme.colors.text,
      fontSize: 18,
      fontWeight: '800',
    },
    viewport: { width: '100%', height: PLOT_HEIGHT + 34 },
    canvas: { height: PLOT_HEIGHT + 34 },
    line: { position: 'absolute', height: 2, borderRadius: 1 },
    point: {
      position: 'absolute',
      width: 10,
      height: 10,
      borderRadius: 5,
      borderWidth: 2,
    },
    value: {
      position: 'absolute',
      color: theme.colors.text,
      fontSize: 11,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      textAlign: 'center',
    },
    month: {
      position: 'absolute',
      top: PLOT_HEIGHT + 6,
      color: theme.colors.textMuted,
      fontSize: 10,
      fontVariant: ['tabular-nums'],
      fontWeight: '700',
      textAlign: 'center',
    },
  });
