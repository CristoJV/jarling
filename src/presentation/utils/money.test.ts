import { Money } from '@/domain/value-objects/money';

import {
  appendMoneyDigit,
  configureFormatting,
  formatDate,
  formatMoney,
  parseMoneyInput,
  removeMoneyDigit,
  toggleMoneySign,
} from './money';
import { DEFAULT_PREFERENCES } from '@/presentation/preferences/preferences';

afterEach(() => configureFormatting(DEFAULT_PREFERENCES));

describe('presentation money utilities', () => {
  it.each([
    ['2000', 200_000],
    ['2000,50', 200_050],
    ['2000.5', 200_050],
    ['-20,25', -2_025],
    ['0', 0],
  ])('parses %s into integer cents', (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each(['', '12,345', '1.000,25', 'abc', 'Infinity'])(
    'rejects unsupported money input %s',
    (input) => {
      expect(parseMoneyInput(input)).toBeNull();
    },
  );

  it('formats cents only at the presentation boundary', () => {
    const formatted = formatMoney(Money.fromCents(200_050));
    expect(formatted).toContain('€');
    expect(formatted).toMatch(/2.+000[,.]50/u);
  });

  it('applies the selected currency, separators, placement and date format', () => {
    configureFormatting({
      ...DEFAULT_PREFERENCES,
      currency: 'USD',
      numberFormat: 'decimal-point',
      currencyPlacement: 'before',
      dateFormat: 'dd/mm/yyyy',
    });

    expect(formatMoney(Money.fromCents(123_456))).toBe('$1,234.56');
    expect(formatDate('2026-08-18', 'en')).toBe('18/08/2026');
  });
});

describe('TPV money entry', () => {
  it('introduces digits from cents to whole euros', () => {
    const values = [1, 0, 0, 5, 0].reduce<number[]>(
      (history, digit) => [
        ...history,
        appendMoneyDigit(history.at(-1) ?? 0, digit),
      ],
      [],
    );

    expect(values).toEqual([1, 10, 100, 1005, 10050]);
  });

  it('removes the last digit and can change sign', () => {
    expect(removeMoneyDigit(10050)).toBe(1005);
    expect(removeMoneyDigit(-10050)).toBe(-1005);
    expect(toggleMoneySign(1005)).toBe(-1005);
    expect(toggleMoneySign(0)).toBe(0);
  });
});
