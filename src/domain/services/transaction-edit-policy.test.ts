import type { Transaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

import {
  requiresReconciliationWarning,
  transactionAccountLockReason,
} from './transaction-edit-policy';

const transaction: Transaction = {
  id: 'transaction-1',
  accountId: 'account-1',
  amount: Money.fromCents(-10_000),
  date: '2026-08-10',
  status: 'reconciled',
  kind: 'standard',
  createdAt: '2026-08-10T10:00:00.000Z',
  updatedAt: '2026-08-10T10:00:00.000Z',
};

describe('transaction edit policy', () => {
  it('locks the account of reconciled and opening-balance transactions', () => {
    expect(transactionAccountLockReason(transaction)).toBe('reconciled');
    expect(
      transactionAccountLockReason({
        ...transaction,
        status: 'cleared',
        kind: 'opening_balance',
      }),
    ).toBe('opening_balance');
    expect(
      transactionAccountLockReason({ ...transaction, status: 'cleared' }),
    ).toBeNull();
  });

  it('warns only when amount or date changes a reconciled entry', () => {
    expect(
      requiresReconciliationWarning([transaction], {
        amountCents: -12_000,
        date: transaction.date,
      }),
    ).toBe(true);
    expect(
      requiresReconciliationWarning([transaction], {
        amountCents: transaction.amount.cents,
        date: '2026-09-01',
      }),
    ).toBe(true);
    expect(
      requiresReconciliationWarning([transaction], {
        amountCents: transaction.amount.cents,
        date: transaction.date,
      }),
    ).toBe(false);
  });
});
