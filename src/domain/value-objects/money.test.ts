import { InvalidMoneyError } from '@/domain/errors/invalid-money-error';

import { Money } from './money';

describe('Money', () => {
  it('stores and adds integer cents without floating point arithmetic', () => {
    const result = Money.fromCents(1_025).add(Money.fromCents(-25));

    expect(result.cents).toBe(1_000);
  });

  it.each([
    0.1,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.MAX_SAFE_INTEGER + 1,
  ])('rejects an invalid cent value: %s', (value) => {
    expect(() => Money.fromCents(value)).toThrow(InvalidMoneyError);
  });
});
