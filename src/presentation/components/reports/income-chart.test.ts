import { calculateNetIncomeBarHeights } from './income-chart';

describe('IncomeChart', () => {
  it('scales positive and negative bars by absolute net income', () => {
    const heights = calculateNetIncomeBarHeights([10_000, -5_000, 0]);

    expect(heights[0]).toBeGreaterThan(heights[1]!);
    expect(heights[1]).toBeGreaterThan(0);
    expect(heights[2]).toBe(0);
    expect(heights[0]).toBeCloseTo(heights[1]! * 2);
  });
});
