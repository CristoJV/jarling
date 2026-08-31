import type { TransactionKind } from '@/domain/entities/transaction';

export class TransactionAccountLockedError extends Error {
  constructor(readonly reason: 'reconciled' | TransactionKind) {
    super(
      reason === 'reconciled'
        ? 'A reconciled transaction must remain in its original account.'
        : `A ${reason} transaction must remain in its original account.`,
    );
    this.name = 'TransactionAccountLockedError';
  }
}
