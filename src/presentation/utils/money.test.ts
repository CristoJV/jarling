import { Money } from '@/domain/value-objects/money';

import {
  appendMoneyDigit,
  formatMoney,
  parseMoneyInput,
  removeMoneyDigit,
  toggleMoneySign,
} from './money';

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
    expect(formatMoney(Money.fromCents(200_050))).toMatch(
      /2(?:[.\s]?000),50\s?€/u,
    );
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
