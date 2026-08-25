import { buildBudgetProgress } from './budget-progress';

describe('buildBudgetProgress', () => {
  it('uses one continuous segment when there is no weekly target', () => {
    expect(
      buildBudgetProgress({
        spendingCents: [2_000, 3_000],
        availableCents: 5_000,
      }),
    ).toEqual({
      segments: [
        {
          cents: 10_000,
          regions: [
            { cents: 5_000, tone: 'spent' },
            { cents: 5_000, tone: 'available' },
          ],
          borderTone: 'positive',
        },
      ],
      totalCents: 10_000,
    });
  });

  it('colors only spending without assigned coverage red', () => {
    expect(
      buildBudgetProgress({
        spendingCents: [7_000, 3_000],
        availableCents: -2_000,
      }).segments,
    ).toEqual([
      {
        cents: 10_000,
        regions: [
          { cents: 8_000, tone: 'spent' },
          { cents: 2_000, tone: 'overspent' },
        ],
        borderTone: 'negative',
      },
    ]);
  });

  it('uses dark and light yellow regions inside one underfunded segment', () => {
    expect(
      buildBudgetProgress({
        spendingCents: [2_000],
        availableCents: 2_000,
        goalCents: 10_000,
        underfunded: true,
      }).segments,
    ).toEqual([
      {
        cents: 10_000,
        regions: [
          { cents: 2_000, tone: 'warningSpent' },
          { cents: 2_000, tone: 'warningAvailable' },
        ],
        borderTone: 'warning',
      },
    ]);
  });

  it('keeps color regions inside the four weekly segments', () => {
    expect(
      buildBudgetProgress({
        spendingCents: [25_000],
        availableCents: 5_000,
        targetCents: 40_000,
        targetFundedCents: 30_000,
        targetOccurrences: 4,
      }).segments,
    ).toEqual([
      {
        cents: 10_000,
        regions: [{ cents: 10_000, tone: 'warningSpent' }],
        borderTone: 'warning',
      },
      {
        cents: 10_000,
        regions: [{ cents: 10_000, tone: 'warningSpent' }],
        borderTone: 'warning',
      },
      {
        cents: 10_000,
        regions: [
          { cents: 5_000, tone: 'warningSpent' },
          { cents: 5_000, tone: 'warningAvailable' },
        ],
        borderTone: 'warning',
      },
      { cents: 10_000, regions: [], borderTone: 'warning' },
    ]);
  });

  it('adds exactly one proportional overflow segment', () => {
    const result = buildBudgetProgress({
      spendingCents: [45_000],
      availableCents: -15_000,
      targetCents: 40_000,
      targetFundedCents: 30_000,
      targetOccurrences: 4,
    });

    expect(result.segments).toEqual([
      {
        cents: 10_000,
        regions: [{ cents: 10_000, tone: 'warningSpent' }],
        borderTone: 'warning',
      },
      {
        cents: 10_000,
        regions: [{ cents: 10_000, tone: 'warningSpent' }],
        borderTone: 'warning',
      },
      {
        cents: 10_000,
        regions: [{ cents: 10_000, tone: 'warningSpent' }],
        borderTone: 'warning',
      },
      {
        cents: 10_000,
        regions: [{ cents: 10_000, tone: 'overspent' }],
        borderTone: 'negative',
      },
      {
        cents: 5_000,
        regions: [{ cents: 5_000, tone: 'overspent' }],
        borderTone: 'negative',
        overflow: true,
      },
    ]);
    expect(result.totalCents).toBe(45_000);
    expect(result.segments.filter(({ overflow }) => overflow)).toHaveLength(1);
  });

  it('uses green regions and borders once the monthly target is complete', () => {
    expect(
      buildBudgetProgress({
        spendingCents: [25_000],
        availableCents: 15_000,
        targetCents: 40_000,
        targetFundedCents: 40_000,
        targetOccurrences: 4,
      }).segments[2],
    ).toEqual({
      cents: 10_000,
      regions: [
        { cents: 5_000, tone: 'spent' },
        { cents: 5_000, tone: 'available' },
      ],
      borderTone: 'positive',
    });
  });

  it('does not create segments from transaction boundaries', () => {
    expect(
      buildBudgetProgress({
        spendingCents: [5_000, 7_000, 8_000],
        availableCents: 20_000,
        targetCents: 40_000,
        targetFundedCents: 40_000,
      }).segments,
    ).toHaveLength(1);
  });

  it('uses one overflow segment for extra assigned money too', () => {
    const result = buildBudgetProgress({
      spendingCents: [30_000],
      availableCents: 15_000,
      targetCents: 40_000,
      targetFundedCents: 45_000,
    });

    expect(result.segments).toHaveLength(2);
    expect(result.segments[1]).toEqual({
      cents: 5_000,
      regions: [{ cents: 5_000, tone: 'available' }],
      borderTone: 'positive',
      overflow: true,
    });
  });

  it('does not invent a weekly segment when no occurrence remains', () => {
    expect(
      buildBudgetProgress({
        spendingCents: [],
        availableCents: 0,
        targetCents: 0,
        targetFundedCents: 0,
        targetOccurrences: 0,
      }).segments,
    ).toEqual([]);
  });
});
