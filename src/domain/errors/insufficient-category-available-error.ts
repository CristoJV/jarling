import { Money } from '@/domain/value-objects/money';

export class InsufficientCategoryAvailableError extends Error {
  readonly missing: Money;

  constructor(
    readonly requested: Money = Money.zero(),
    readonly available: Money = Money.zero(),
  ) {
    super('The source category does not have enough Available.');
    this.name = 'InsufficientCategoryAvailableError';
    this.missing = Money.fromCents(
      Math.max(0, requested.cents - available.cents),
    );
  }
}
