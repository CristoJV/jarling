import type { CategoryBalanceHistoryPoint } from '@/domain/services/calculate-category-balance-history';
import { Money } from '@/domain/value-objects/money';

import {
  calculateCategoryBalanceChartLayout,
  calculateCategoryBalanceCheckpointPoints,
  calculateCategoryBalanceValueLabels,
  calculateCategoryBalanceChartSegments,
  categoryBalanceAxisDays,
  formatCategoryBalanceAxisLabel,
} from './category-balance-chart';

function point(
  position: number,
  cents: number,
  kind: CategoryBalanceHistoryPoint['kind'],
): CategoryBalanceHistoryPoint {
  return {
    day: Math.ceil(position),
    position,
    amount: Money.fromCents(cents),
    kind,
    retroactive: false,
  };
}

describe('CategoryBalanceChart', () => {
  it('positions the previous-day opening at the left and month end at the right', () => {
    const layout = calculateCategoryBalanceChartLayout(
      [point(0, 1_000, 'opening'), point(31, 2_000, 'closing')],
      334,
      31,
    );

    expect(layout.points.map(({ x }) => x)).toEqual([12, 322]);
    expect(layout.points[0]!.y).toBeGreaterThan(layout.points[1]!.y);
  });

  it('splits a zero crossing and makes every below-zero portion red', () => {
    const layout = calculateCategoryBalanceChartLayout(
      [
        point(0, 1_000, 'opening'),
        point(1, -1_000, 'activity'),
        point(2, 1_000, 'assignment'),
      ],
      224,
      2,
    );
    const segments = calculateCategoryBalanceChartSegments(
      layout.points,
      layout.zeroY,
    );

    expect(segments.map(({ color }) => color)).toEqual([
      'positive',
      'negative',
      'negative',
      'positive',
    ]);
    expect(segments[0]!.endY).toBe(layout.zeroY);
    expect(segments[1]!.startY).toBe(layout.zeroY);
  });

  it('labels only month edges and Mondays using localized weekday initials', () => {
    expect(categoryBalanceAxisDays('2026-09')).toEqual([1, 7, 14, 21, 28, 30]);
    expect(formatCategoryBalanceAxisLabel('2026-09', 1, 'en')).toBe('Tu1');
    expect(formatCategoryBalanceAxisLabel('2026-09', 1, 'es')).toBe('Ma1');
    expect(formatCategoryBalanceAxisLabel('2026-09', 7, 'es')).toBe('Lu7');
  });

  it('centers a flat zero history', () => {
    const history = [point(0, 0, 'opening'), point(30, 0, 'closing')];
    const layout = calculateCategoryBalanceChartLayout(history, 300, 30);
    expect(layout.points[0]?.y).toBe(layout.points[1]?.y);
    expect(layout.zeroY).toBe(layout.points[0]?.y);
    expect(
      calculateCategoryBalanceChartSegments(layout.points, layout.zeroY),
    ).toEqual([expect.objectContaining({ color: 'positive' })]);
  });

  it('selects opening, day one, Mondays, and the last plotted day', () => {
    const history = [
      point(0, 1_000, 'opening'),
      point(10, 2_000, 'activity'),
      point(18, 2_000, 'closing'),
    ];
    const layout = calculateCategoryBalanceChartLayout(history, 334, 31);

    const checkpoints = calculateCategoryBalanceCheckpointPoints(
      history,
      layout,
      '2026-08',
      31,
      334,
    );

    expect(checkpoints.map(({ position }) => position)).toEqual([0, 10]);
    expect(checkpoints.map(({ amountCents }) => amountCents)).toEqual([
      1_000, 2_000,
    ]);
  });

  it('sizes labels to their content and places every box without overlap', () => {
    const checkpoints = [
      { position: 0, x: 12, y: 30, amountCents: 100 },
      { position: 1, x: 20, y: 32, amountCents: 200 },
      { position: 3, x: 32, y: 34, amountCents: 300 },
      { position: 10, x: 90, y: 36, amountCents: 400 },
    ];
    const labels = calculateCategoryBalanceValueLabels(
      checkpoints,
      ['€1', '€10.000,00', '€300', '€4'],
      180,
    );

    expect(labels[1]!.width).toBeGreaterThan(labels[0]!.width);
    expect(labels.map(({ point }) => point)).toEqual(checkpoints);
    for (const [index, label] of labels.entries()) {
      for (const other of labels.slice(index + 1)) {
        const overlaps = !(
          label.left + label.width <= other.left ||
          other.left + other.width <= label.left ||
          label.top + label.height <= other.top ||
          other.top + other.height <= label.top
        );
        expect(overlaps).toBe(false);
      }
    }
  });
});
