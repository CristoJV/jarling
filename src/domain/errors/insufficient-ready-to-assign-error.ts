import { Money } from '@/domain/value-objects/money';

export class InsufficientReadyToAssignError extends Error {
  readonly missing: Money;

  constructor(
    readonly requested: Money = Money.zero(),
    readonly available: Money = Money.zero(),
  ) {
    super('The assignment would make Ready to Assign negative.');
    this.name = 'InsufficientReadyToAssignError';
    this.missing = Money.fromCents(
      Math.max(0, requested.cents - available.cents),
    );
  }
}
