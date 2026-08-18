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
});
