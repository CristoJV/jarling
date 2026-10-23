import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useMemo, useState } from 'react';
import {
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';

import type { SpendingIntervalUnit } from '@/domain/services/calculate-spending-report';
import { Money } from '@/domain/value-objects/money';
import type { SpendingReportColors } from '@/presentation/components/reports/spending-report-colors';
import { mutedSpendingColor } from '@/presentation/components/reports/spending-report-colors';
import {
  spendingIntervalLabel,
  formatSpendingPercentage,
} from '@/presentation/components/reports/spending-report-format';
import {
  calculateDonutSegments,
  type DonutSegmentGeometry,
  subdivideDonutSegment,
} from '@/presentation/components/reports/spending-report-geometry';
import type {
  SpendingReportViewModel,
  SpendingSelection,
} from '@/presentation/components/reports/spending-report-view-model';
import { useTranslation } from '@/presentation/localization/localization-provider';
import { useReducedMotion } from '@/presentation/motion/use-reduced-motion';
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

const DONUT_SIZE = 238;
const STROKE_WIDTH = 28;
const RADIUS = (DONUT_SIZE - STROKE_WIDTH) / 2;

type DonutItem = Readonly<{
  id: string;
  groupId: string;
  geometry: DonutSegmentGeometry;
  kind: 'group' | 'category';
  label: string;
  value: number;
  percentage: number;
  color: string;
}>;

function donutPoint(fraction: number) {
  const angle = fraction * Math.PI * 2 - Math.PI / 2;
  return {
    x: DONUT_SIZE / 2 + RADIUS * Math.cos(angle),
    y: DONUT_SIZE / 2 + RADIUS * Math.sin(angle),
  };
}

function donutArcPath(geometry: DonutSegmentGeometry): string {
  const start = donutPoint(geometry.startFraction);
  if (geometry.lengthFraction >= 0.999_999) {
    const middle = donutPoint(geometry.startFraction + 0.5);
    return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 1 1 ${middle.x} ${middle.y} A ${RADIUS} ${RADIUS} 0 1 1 ${start.x} ${start.y}`;
  }
  const end = donutPoint(geometry.startFraction + geometry.lengthFraction);
  const largeArc = geometry.lengthFraction > 0.5 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${RADIUS} ${RADIUS} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function donutItemColor(
  item: DonutItem,
  view: SpendingReportViewModel,
  colors: SpendingReportColors,
  dark: boolean,
) {
  const selection = view.selection;
  if (!selection) return item.color;
  const highlighted =
    selection.kind === 'category'
      ? selection.id === item.id
      : selection.groupId === item.groupId;
  return highlighted
    ? item.color
    : mutedSpendingColor(
        item.kind === 'category'
          ? colors.categories[item.id]!
          : colors.groups[item.id]!,
        dark,
      );
}

export function SpendingDonutCard({
  colors,
  interval,
  onOpenIntervalSelector,
  onSelectInterval,
  onSelectItem,
  view,
}: Readonly<{
  colors: SpendingReportColors;
  interval: SpendingIntervalUnit;
  onOpenIntervalSelector: () => void;
  onSelectInterval: (intervalKey: string) => void;
  onSelectItem: (selection: SpendingSelection) => void;
  view: SpendingReportViewModel;
}>) {
  const { language, t } = useTranslation();
  const theme = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const reducedMotion = useReducedMotion();
  const [translateX] = useState(() => new Animated.Value(0));
  const [opacity] = useState(() => new Animated.Value(1));
  const groupGeometry = calculateDonutSegments(
    view.groups.map(({ group, spending }) => ({
      id: group.groupId,
      value: spending.cents,
    })),
  );
  const groupGeometryById = new Map(
    groupGeometry.map((segment) => [segment.id, segment]),
  );
  const selectedGroupId = view.selection?.groupId;
  const items: readonly DonutItem[] = view.groups.flatMap<DonutItem>(
    (groupView) => {
      const groupId = groupView.group.groupId;
      const geometry = groupGeometryById.get(groupId);
      if (!geometry) return [];
      if (selectedGroupId === groupId) {
        const orderedCategories = [...groupView.categories].sort(
          (left, right) =>
            left.category.categoryId.localeCompare(right.category.categoryId),
        );
        const categoryGeometry = subdivideDonutSegment(
          geometry,
          orderedCategories.map(({ category, spending }) => ({
            id: category.categoryId,
            value: spending.cents,
          })),
          0.004,
        );
        if (categoryGeometry.length > 0) {
          const categoryById = new Map(
            orderedCategories.map((category) => [
              category.category.categoryId,
              category,
            ]),
          );
          return categoryGeometry.map((categorySegment) => {
            const categoryView = categoryById.get(categorySegment.id)!;
            const category = categoryView.category;
            return {
              id: category.categoryId,
              groupId,
              geometry: categorySegment,
              kind: 'category' as const,
              label: categoryDisplayName(
                { id: category.categoryId, name: category.categoryName },
                t,
              ),
              value: categoryView.spending.cents,
              percentage: categoryView.percentageOfInterval,
              color: colors.categories[category.categoryId]!,
            };
          });
        }
      }
      return [
        {
          id: groupId,
          groupId,
          geometry,
          kind: 'group' as const,
          label: groupDisplayName(
            { id: groupId, name: groupView.group.groupName },
            t,
          ),
          value: groupView.spending.cents,
          percentage: groupView.percentageOfInterval,
          color: colors.groups[groupId]!,
        },
      ];
    },
  );
  const intervalText = spendingIntervalLabel(
    view.activeInterval,
    interval,
    language,
    true,
  );
  const activeIndex = view.activeIntervalIndex;

  function resetPosition() {
    if (reducedMotion) {
      translateX.setValue(0);
      opacity.setValue(1);
      return;
    }
    Animated.spring(translateX, {
      toValue: 0,
      speed: 24,
      bounciness: 0,
      useNativeDriver: true,
    }).start();
  }

  function moveToInterval(direction: -1 | 1) {
    const next = view.intervals[activeIndex + direction];
    if (!next) {
      resetPosition();
      return;
    }
    if (reducedMotion) {
      onSelectInterval(next.interval.key);
      return;
    }
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: direction < 0 ? 36 : -36,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0.35,
        duration: 90,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onSelectInterval(next.interval.key);
      translateX.setValue(direction < 0 ? -28 : 28);
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: 0,
          speed: 24,
          bounciness: 0,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    });
  }

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          Math.abs(gesture.dx) > 8 &&
          Math.abs(gesture.dx) > Math.abs(gesture.dy),
        onPanResponderMove: (_, gesture) => {
          translateX.setValue(Math.max(-54, Math.min(54, gesture.dx * 0.45)));
        },
        onPanResponderRelease: (_, gesture) => {
          if (gesture.dx > 44 || gesture.vx > 0.5) moveToInterval(-1);
          else if (gesture.dx < -44 || gesture.vx < -0.5) moveToInterval(1);
          else resetPosition();
        },
        onPanResponderTerminate: resetPosition,
      }),
    // The view and callbacks intentionally refresh the responder's boundaries.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeIndex, reducedMotion, view.intervals],
  );

  const selectedLabel = view.selection
    ? view.selection.kind === 'group'
      ? groupDisplayName(
          { id: view.selection.id, name: view.selection.name },
          t,
        )
      : categoryDisplayName(
          { id: view.selection.id, name: view.selection.name },
          t,
        )
    : undefined;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        {!view.isCurrentInterval ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => onSelectInterval(view.currentIntervalKey)}
            style={({ pressed }) => [
              styles.currentAction,
              pressed && styles.actionPressed,
            ]}
          >
            <Text style={styles.currentActionText}>{t('reports.today')}</Text>
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          onPress={onOpenIntervalSelector}
          style={({ pressed }) => [
            styles.selector,
            pressed && styles.actionPressed,
          ]}
        >
          <Text style={styles.selectorText}>
            {t(`reports.interval.${interval}`)}
          </Text>
          <MaterialCommunityIcons
            color={theme.colors.primary}
            name="chevron-down"
            size={16}
          />
        </Pressable>
      </View>

      <View style={styles.donutRow}>
        <Pressable
          accessibilityLabel={t('reports.previousPeriod')}
          accessibilityRole="button"
          disabled={activeIndex === 0}
          hitSlop={8}
          onPress={() => moveToInterval(-1)}
          style={[styles.navigationButton, styles.navigationButtonPrevious]}
        >
          <MaterialCommunityIcons
            color={
              activeIndex === 0 ? theme.colors.textMuted : theme.colors.primary
            }
            name="chevron-left"
            size={22}
          />
        </Pressable>
        <Animated.View
          {...panResponder.panHandlers}
          style={[styles.donutArea, { opacity, transform: [{ translateX }] }]}
        >
          <Svg
            accessibilityLabel={t('reports.spendingCompositionA11y', {
              interval: intervalText,
              amount: formatMoney(view.activeSpending),
            })}
            accessible
            height={DONUT_SIZE}
            width={DONUT_SIZE}
          >
            <Circle
              cx={DONUT_SIZE / 2}
              cy={DONUT_SIZE / 2}
              fill="none"
              r={RADIUS}
              stroke={theme.colors.track}
              strokeWidth={STROKE_WIDTH}
            />
            {items.map((item) => (
              <Path
                d={donutArcPath(item.geometry)}
                fill="none"
                key={`arc:${item.kind}:${item.id}`}
                pointerEvents="none"
                stroke={donutItemColor(item, view, colors, theme.dark)}
                strokeLinecap="butt"
                strokeWidth={STROKE_WIDTH}
              />
            ))}
            {items.map((item) => (
              <Path
                accessibilityLabel={t('reports.compositionSegmentA11y', {
                  name: item.label,
                  amount: formatMoney(Money.fromCents(item.value)),
                  percentage: formatSpendingPercentage(item.percentage),
                })}
                d={donutArcPath(item.geometry)}
                fill="none"
                key={`hit:${item.kind}:${item.id}`}
                onPress={() =>
                  onSelectItem({ kind: 'group', groupId: item.groupId })
                }
                opacity={0.001}
                stroke="#ffffff"
                strokeLinecap="butt"
                strokeWidth={STROKE_WIDTH + 14}
              />
            ))}
          </Svg>
          <View pointerEvents="none" style={styles.center}>
            <Text numberOfLines={1} style={styles.intervalLabel}>
              {intervalText}
            </Text>
            {selectedLabel ? (
              <Text numberOfLines={2} style={styles.selectionName}>
                {selectedLabel}
              </Text>
            ) : null}
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.72}
              numberOfLines={1}
              style={styles.amount}
            >
              {formatMoney(view.activeSpending)}
            </Text>
            <Text numberOfLines={1} style={styles.caption}>
              {view.selection
                ? view.selection.spending.cents < 0
                  ? t('reports.netCredit')
                  : formatSpendingPercentage(
                      view.selection.percentageOfInterval,
                    )
                : t('reports.netSpending')}
            </Text>
          </View>
        </Animated.View>
        <Pressable
          accessibilityLabel={t('reports.nextPeriod')}
          accessibilityRole="button"
          disabled={activeIndex === view.intervals.length - 1}
          hitSlop={8}
          onPress={() => moveToInterval(1)}
          style={[styles.navigationButton, styles.navigationButtonNext]}
        >
          <MaterialCommunityIcons
            color={
              activeIndex === view.intervals.length - 1
                ? theme.colors.textMuted
                : theme.colors.primary
            }
            name="chevron-right"
            size={22}
          />
        </Pressable>
      </View>
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
      alignItems: 'center',
      gap: 8,
      overflow: 'hidden',
    },
    header: {
      width: '100%',
      minHeight: 32,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    selector: {
      width: 92,
      height: 32,
      paddingHorizontal: 10,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    selectorText: {
      color: theme.colors.primary,
      fontSize: 12,
      fontWeight: '800',
    },
    actionPressed: { backgroundColor: theme.colors.surfacePressed },
    donutRow: {
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    donutArea: {
      width: DONUT_SIZE,
      height: DONUT_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    center: {
      position: 'absolute',
      width: DONUT_SIZE - STROKE_WIDTH * 2 - 18,
      alignItems: 'center',
      justifyContent: 'center',
    },
    intervalLabel: {
      color: theme.colors.textSecondary,
      fontSize: 12,
      fontWeight: '800',
      textAlign: 'center',
    },
    selectionName: {
      maxWidth: '100%',
      marginTop: 3,
      color: theme.colors.text,
      fontSize: 13,
      fontWeight: '700',
      lineHeight: 16,
      textAlign: 'center',
    },
    amount: {
      width: '100%',
      marginTop: 4,
      color: theme.colors.text,
      fontSize: 24,
      fontVariant: ['tabular-nums'],
      fontWeight: '800',
      textAlign: 'center',
    },
    caption: {
      marginTop: 2,
      color: theme.colors.textMuted,
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
    },
    navigationButton: {
      position: 'absolute',
      zIndex: 2,
      width: 32,
      height: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    navigationButtonPrevious: { left: 0 },
    navigationButtonNext: { right: 0 },
    currentAction: {
      width: 92,
      height: 32,
      paddingHorizontal: 8,
      backgroundColor: theme.colors.primaryMuted,
      borderRadius: 11,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    currentActionText: {
      color: theme.colors.primary,
      fontSize: 10,
      fontWeight: '800',
    },
  });
