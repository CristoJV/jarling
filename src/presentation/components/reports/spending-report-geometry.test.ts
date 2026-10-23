import {
  calculateAverageChartSlots,
  calculateDonutSegments,
  calculateStackedChartGeometry,
  subdivideDonutSegment,
} from './spending-report-geometry';

describe('spending report geometry', () => {
  it('builds donut segments from positive values only', () => {
    const segments = calculateDonutSegments([
      { id: 'needs', value: 75 },
      { id: 'wants', value: 25 },
      { id: 'credit', value: -10 },
      { id: 'empty', value: 0 },
    ]);

    expect(segments.map(({ id, percentage }) => ({ id, percentage }))).toEqual([
      { id: 'needs', percentage: 0.75 },
      { id: 'wants', percentage: 0.25 },
    ]);
    expect(
      segments.reduce((sum, segment) => sum + segment.lengthFraction, 0),
    ).toBeCloseTo(0.984);
  });

  it('stacks positive and negative values around a signed baseline', () => {
    const geometry = calculateStackedChartGeometry(
      [
        [
          { id: 'food', value: 60 },
          { id: 'transport', value: 40 },
          { id: 'refund', value: -20 },
        ],
      ],
      10,
      10,
      130,
    );

    expect(geometry.baselineY).toBeCloseTo(101.667);
    expect(geometry.rows[0]).toHaveLength(3);
    expect(geometry.rows[0]?.find(({ id }) => id === 'refund')?.top).toBe(
      geometry.baselineY,
    );
  });

  it('subdivides a group arc without changing its outer bounds', () => {
    const [parent] = calculateDonutSegments([{ id: 'home', value: 100 }]);
    const children = subdivideDonutSegment(parent!, [
      { id: 'rent', value: 75 },
      { id: 'utilities', value: 25 },
    ]);

    expect(children.map(({ id, percentage }) => ({ id, percentage }))).toEqual([
      { id: 'rent', percentage: 0.75 },
      { id: 'utilities', percentage: 0.25 },
    ]);
    expect(children[0]!.startFraction).toBe(parent!.startFraction);
    expect(
      children.at(-1)!.startFraction + children.at(-1)!.lengthFraction,
    ).toBeCloseTo(parent!.startFraction + parent!.lengthFraction);
  });

  it('keeps four interval slots, a gap, and the average at the end', () => {
    expect(calculateAverageChartSlots(3)).toEqual([
      undefined,
      0,
      1,
      2,
      undefined,
      'average',
    ]);
    expect(calculateAverageChartSlots(6).slice(-6)).toEqual([
      2,
      3,
      4,
      5,
      undefined,
      'average',
    ]);
  });

  it('moves a selected category to the stack baseline', () => {
    const geometry = calculateStackedChartGeometry(
      [
        [
          { id: 'food', value: 60 },
          { id: 'transport', value: 40 },
        ],
      ],
      0,
      0,
      100,
      'transport',
    );

    expect(geometry.rows[0]?.map(({ id }) => id)).toEqual([
      'transport',
      'food',
    ]);
    expect(geometry.rows[0]?.[0]?.endpointY).toBe(60);
  });
});
