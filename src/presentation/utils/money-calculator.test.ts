import { calculateMoneyOperation } from './money-calculator';

describe('money calculator', () => {
  it.each([
    [1_050, 250, '+', 1_300],
    [1_050, 250, '-', 800],
    [250, 300, '×', 750],
    [1_000, 400, '÷', 250],
    [1_000, 0, '÷', 1_000],
  ] as const)(
    '%i %s %i uses monetary precision',
    (left, right, operator, result) => {
      expect(calculateMoneyOperation(left, right, operator)).toBe(result);
    },
  );
});
