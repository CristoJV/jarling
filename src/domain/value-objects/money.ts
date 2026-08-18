import { InvalidMoneyError } from '@/domain/errors/invalid-money-error';

export class Money {
  private constructor(readonly cents: number) {
    Object.freeze(this);
  }

  static zero(): Money {
    return new Money(0);
  }

  static fromCents(cents: number): Money {
    if (!Number.isSafeInteger(cents)) {
      throw new InvalidMoneyError();
    }

    return new Money(cents);
  }

  add(other: Money): Money {
    return Money.fromCents(this.cents + other.cents);
  }
}
