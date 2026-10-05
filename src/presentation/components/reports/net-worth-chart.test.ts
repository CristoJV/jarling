import {
  calculateNetWorthChartLayout,
  calculateNetWorthChartPoints,
  compactNetWorth,
  compactNetWorthMonth,
} from './net-worth-chart';

describe('Net Worth chart', () => {
  it('shows five recent points plus one empty step on entry', () => {
    expect(calculateNetWorthChartLayout(300, 5)).toEqual({
      stepWidth: 50,
      canvasWidth: 300,
      initialScrollOffset: 0,
    });
    expect(calculateNetWorthChartLayout(300, 6)).toEqual({
      stepWidth: 50,
      canvasWidth: 350,
      initialScrollOffset: 50,
    });
  });

  it('places sparse history in its chronological step without stretching it', () => {
    expect(
      calculateNetWorthChartPoints([1, 2, 3], 50).map(({ x }) => x),
    ).toEqual([25, 75, 125]);
  });

  it('keeps flat and negative histories within the plot', () => {
    const flat = calculateNetWorthChartPoints([-10, -10], 50);
    const changing = calculateNetWorthChartPoints([-20, 10], 50);

    expect(flat[0]?.y).toBe(flat[1]?.y);
    expect(changing[0]!.y).toBeGreaterThan(changing[1]!.y);
  });

  it('uses compact one-decimal values and month labels', () => {
    expect(compactNetWorth(1_734_000)).toBe('17.3k');
    expect(compactNetWorth(-125_000)).toBe('-1.3k');
    expect(compactNetWorthMonth('2026-10', 'en')).toBe('Oct.26');
  });
});
