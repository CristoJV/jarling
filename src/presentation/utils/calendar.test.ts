import { formatBudgetMonth, localBudgetMonth, localIsoDate } from './calendar';

describe('calendar presentation utilities', () => {
  const date = new Date(2026, 9, 3, 23, 45);

  it('builds local ISO date and month keys without converting to UTC', () => {
    expect(localIsoDate(date)).toBe('2026-10-03');
    expect(localBudgetMonth(date)).toBe('2026-10');
  });

  it('formats a validated budget month with reusable options', () => {
    expect(formatBudgetMonth('2026-10', 'en', { month: 'long' })).toBe(
      'October',
    );
  });

  it('rejects an invalid budget month before formatting it', () => {
    expect(() => formatBudgetMonth('2026-13', 'en')).toThrow();
  });
});
