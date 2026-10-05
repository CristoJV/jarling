import { useEffect, useRef, useState } from 'react';
import {
  type LayoutChangeEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { ReportMonth } from '@/domain/services/calculate-reports';
import {
  calculateReportChartLayout,
  compactReportMonth,
} from '@/presentation/components/reports/net-worth-chart';
import { useTranslation } from '@/presentation/localization/localization-provider';
import type { AppTheme } from '@/presentation/theme/theme';
import {
  useAppTheme,
  useThemedStyles,
} from '@/presentation/theme/theme-provider';

const MAX_INITIAL_BARS = 5;
const PLOT_HEIGHT = 190;
const BASELINE = PLOT_HEIGHT / 2;
const MAX_BAR_HEIGHT = BASELINE - 18;

export function calculateNetIncomeBarHeights(
  values: readonly number[],
): readonly number[] {
  const maximum = Math.max(1, ...values.map((value) => Math.abs(value)));
  return values.map((value) => (Math.abs(value) / maximum) * MAX_BAR_HEIGHT);
}

export function IncomeChart({
  months,
}: Readonly<{ months: readonly ReportMonth[] }>) {
  const { language, t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const scrollRef = useRef<ScrollView>(null);
  const [viewportWidth, setViewportWidth] = useState(0);
  const [positionedMonthCount, setPositionedMonthCount] = useState(0);
  const { stepWidth, canvasWidth, initialScrollOffset } =
    calculateReportChartLayout(viewportWidth, months.length);
  const values = months.map(({ netIncome }) => netIncome.cents);
  const heights = calculateNetIncomeBarHeights(values);

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
      <Text style={styles.title}>{t('reports.netIncomeHistory')}</Text>
      <View onLayout={handleLayout} style={styles.viewport}>
        {viewportWidth > 0 ? (
          <ScrollView
            horizontal
            nestedScrollEnabled
            ref={scrollRef}
            showsHorizontalScrollIndicator={months.length > MAX_INITIAL_BARS}
          >
            <View
              accessible
              accessibilityLabel={t('reports.netIncomeHistory')}
              accessibilityRole="image"
              style={[styles.canvas, { width: canvasWidth }]}
            >
              <View
                style={[styles.axis, { backgroundColor: theme.colors.border }]}
              />
              {months.map((month, index) => {
                const value = values[index]!;
                const height = heights[index]!;
                const positive = value >= 0;
                const barWidth = Math.min(32, stepWidth * 0.52);
                return (
                  <View key={month.month}>
                    <View
                      style={[
                        styles.bar,
                        {
                          backgroundColor: positive
                            ? theme.colors.positive
                            : theme.colors.negative,
                          height,
                          left: (index + 0.5) * stepWidth - barWidth / 2,
                          top: positive ? BASELINE - height : BASELINE,
                          width: barWidth,
                        },
                      ]}
                    />
                    <Text
                      numberOfLines={1}
                      style={[
                        styles.month,
                        {
                          left: index * stepWidth,
                          width: stepWidth,
                        },
                      ]}
                    >
                      {compactReportMonth(month.month, language)}
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
    axis: {
      position: 'absolute',
      top: BASELINE,
      right: 0,
      left: 0,
      height: StyleSheet.hairlineWidth,
    },
    bar: { position: 'absolute', borderRadius: 5 },
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
