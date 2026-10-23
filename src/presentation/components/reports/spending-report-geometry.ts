export type DonutValue = Readonly<{ id: string; value: number }>;

export type DonutSegmentGeometry = Readonly<{
  id: string;
  percentage: number;
  startFraction: number;
  lengthFraction: number;
}>;

export function calculateDonutSegments(
  values: readonly DonutValue[],
  gapFraction = 0.008,
): readonly DonutSegmentGeometry[] {
  const positive = values.filter(({ value }) => value > 0);
  const total = positive.reduce((sum, { value }) => sum + value, 0);
  if (total <= 0) return [];
  const safeGap = Math.min(gapFraction, 0.18 / positive.length);
  const available = Math.max(0, 1 - safeGap * positive.length);
  let cursor = 0;
  return positive.map(({ id, value }) => {
    const percentage = value / total;
    const lengthFraction = percentage * available;
    const segment = {
      id,
      percentage,
      startFraction: cursor,
      lengthFraction,
    };
    cursor += lengthFraction + safeGap;
    return segment;
  });
}

export function subdivideDonutSegment(
  parent: DonutSegmentGeometry,
  values: readonly DonutValue[],
  gapFraction = 0.002,
): readonly DonutSegmentGeometry[] {
  const positive = values.filter(({ value }) => value > 0);
  const total = positive.reduce((sum, { value }) => sum + value, 0);
  if (total <= 0) return [];
  const safeGap = Math.min(
    gapFraction,
    parent.lengthFraction / Math.max(1, positive.length * 3),
  );
  const available = Math.max(
    0,
    parent.lengthFraction - safeGap * Math.max(0, positive.length - 1),
  );
  let cursor = parent.startFraction;
  return positive.map(({ id, value }) => {
    const percentage = value / total;
    const lengthFraction = percentage * available;
    const segment = {
      id,
      percentage,
      startFraction: cursor,
      lengthFraction,
    };
    cursor += lengthFraction + safeGap;
    return segment;
  });
}

export type SpendingChartSlot = number | 'average' | undefined;

export function calculateAverageChartSlots(
  intervalCount: number,
): readonly SpendingChartSlot[] {
  const intervals = Array.from(
    { length: Math.max(0, intervalCount) },
    (_, index) => index,
  );
  const leadingEmptySlots = Math.max(0, 4 - intervals.length);
  return [
    ...Array.from({ length: leadingEmptySlots }, () => undefined),
    ...intervals,
    undefined,
    'average',
  ];
}

export type StackedValue = Readonly<{ id: string; value: number }>;

export type StackedSegmentGeometry = Readonly<{
  id: string;
  value: number;
  top: number;
  height: number;
  endpointY: number;
}>;

export type StackedChartGeometry = Readonly<{
  baselineY: number;
  scale: number;
  rows: readonly (readonly StackedSegmentGeometry[])[];
}>;

export function calculateStackedChartGeometry(
  rows: readonly (readonly StackedValue[])[],
  plotTop: number,
  plotBottom: number,
  plotHeight: number,
  selectedId?: string,
): StackedChartGeometry {
  const positiveMaximum = Math.max(
    0,
    ...rows.map((row) =>
      row.reduce((sum, { value }) => sum + Math.max(0, value), 0),
    ),
  );
  const negativeMaximum = Math.max(
    0,
    ...rows.map((row) =>
      row.reduce((sum, { value }) => sum + Math.max(0, -value), 0),
    ),
  );
  const usableHeight = Math.max(0, plotHeight - plotTop - plotBottom);
  const range = Math.max(1, positiveMaximum + negativeMaximum);
  const scale = usableHeight / range;
  const baselineY = plotTop + positiveMaximum * scale;

  return {
    baselineY,
    scale,
    rows: rows.map((row) => {
      const ordered = selectedId
        ? [
            ...row.filter(({ id }) => id === selectedId),
            ...row.filter(({ id }) => id !== selectedId),
          ]
        : row;
      let positiveOffset = 0;
      let negativeOffset = 0;
      return ordered.flatMap(({ id, value }) => {
        if (value === 0) return [];
        const height = Math.abs(value) * scale;
        if (value > 0) {
          const endpointY = baselineY - positiveOffset - height;
          positiveOffset += height;
          return [{ id, value, top: endpointY, height, endpointY }];
        }
        const top = baselineY + negativeOffset;
        negativeOffset += height;
        return [{ id, value, top, height, endpointY: top + height }];
      });
    }),
  };
}
