import { Money } from '@/domain/value-objects/money';

import { formatSignedReportChange, netWorthChangeCents } from './report-values';

const reportMonth = (month: string, netWorthCents: number) => ({
  month,
  netWorth: Money.fromCents(netWorthCents),
});

describe('report values', () => {
  it('compares each Net Worth closing value with the previous month', () => {
    const months = [
      reportMonth('2026-08', 100_000),
      reportMonth('2026-09', 170_000),
      reportMonth('2026-10', 120_000),
    ];

    expect(netWorthChangeCents(months, 0)).toBe(100_000);
    expect(netWorthChangeCents(months, 1)).toBe(70_000);
    expect(netWorthChangeCents(months, 2)).toBe(-50_000);
  });

  it('formats signed changes without repeating the currency', () => {
    expect(formatSignedReportChange(70_000)).toBe('(+700)');
    expect(formatSignedReportChange(-70_000)).toBe('(-700)');
    expect(formatSignedReportChange(0)).toBe('(0)');
  });
});
