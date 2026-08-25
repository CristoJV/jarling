import { buildBudgetProgress } from './budget-progress';

describe('buildBudgetProgress', () => {
  it('keeps every expense as an individual segment', () => {
    expect(
      buildBudgetProgress({
        spendingCents: [2_000, 3_000],
        availableCents: 5_000,
      }),
    ).toEqual({
      segments: [
        { cents: 2_000, tone: 'spent' },
        { cents: 3_000, tone: 'spent' },
        { cents: 5_000, tone: 'available' },
      ],
      totalCents: 10_000,
    });
  });

  it('uses total spending as the scale and only paints overspending red', () => {
    expect(
      buildBudgetProgress({
        spendingCents: [7_000, 3_000],
        availableCents: -2_000,
      }),
    ).toEqual({
      segments: [
        { cents: 7_000, tone: 'spent' },
        { cents: 1_000, tone: 'spent' },
        { cents: 2_000, tone: 'overspent' },
      ],
      totalCents: 10_000,
    });
  });

  it('paints assigned and spent amounts yellow while a target is underfunded', () => {
    expect(
      buildBudgetProgress({
        spendingCents: [2_000],
        availableCents: 2_000,
        goalCents: 10_000,
        underfunded: true,
      }),
    ).toEqual({
      segments: [
        { cents: 2_000, tone: 'warningSpent' },
        { cents: 2_000, tone: 'warningAvailable' },
      ],
      totalCents: 10_000,
    });
  });

  it.each([
    {
      name: 'three funded slots and two spent slots',
      spent: 20_000,
      segments: [
        { cents: 20_000, tone: 'warningSpent' },
        { cents: 10_000, tone: 'warningAvailable' },
      ],
      total: 40_000,
    },
    {
      name: 'half of the third slot spent',
      spent: 25_000,
      segments: [
        { cents: 25_000, tone: 'warningSpent' },
        { cents: 5_000, tone: 'warningAvailable' },
      ],
      total: 40_000,
    },
    {
      name: 'unfunded spending inside the target',
      spent: 40_000,
      segments: [
        { cents: 30_000, tone: 'warningSpent' },
        { cents: 10_000, tone: 'overspent' },
      ],
      total: 40_000,
    },
    {
      name: 'proportional red extension beyond the target',
      spent: 80_000,
      segments: [
        { cents: 30_000, tone: 'warningSpent' },
        { cents: 10_000, tone: 'overspent' },
        { cents: 40_000, tone: 'overspent' },
      ],
      total: 80_000,
    },
  ])('renders weekly target slots: $name', ({ spent, segments, total }) => {
    expect(
      buildBudgetProgress({
        spendingCents: [spent],
        availableCents: 0,
        targetCents: 40_000,
        targetFundedCents: 30_000,
        targetOccurrences: 4,
      }),
    ).toEqual({
      segments,
      totalCents: total,
      boundariesCents: Array.from(
        { length: total / 10_000 - 1 },
        (_, index) => (index + 1) * 10_000,
      ),
    });
  });

  it('uses light green only after the whole monthly target is funded', () => {
    expect(
      buildBudgetProgress({
        spendingCents: [20_000],
        availableCents: 20_000,
        targetCents: 40_000,
        targetFundedCents: 40_000,
        targetOccurrences: 4,
      }).segments,
    ).toEqual([
      { cents: 20_000, tone: 'spent' },
      { cents: 20_000, tone: 'available' },
    ]);
  });

  it('keeps transaction boundaries visible inside a target bar', () => {
    expect(
      buildBudgetProgress({
        spendingCents: [5_000, 7_000, 8_000],
        availableCents: 20_000,
        targetCents: 40_000,
        targetFundedCents: 40_000,
      }).boundariesCents,
    ).toEqual([5_000, 12_000]);
  });
});
