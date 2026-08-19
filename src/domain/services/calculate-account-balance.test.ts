import type { Transaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

import { calculateAccountBalance } from './calculate-account-balance';

function transaction(id: string, amountCents: number): Transaction {
  return {
    id,
    accountId: 'account-1',
    amount: Money.fromCents(amountCents),
    date: '2026-08-18',
    status: 'cleared',
    kind: 'standard',
    createdAt: '2026-08-18T10:00:00.000Z',
    updatedAt: '2026-08-18T10:00:00.000Z',
  };
}

describe('calculateAccountBalance', () => {
  it('derives the balance from every account transaction', () => {
    const balance = calculateAccountBalance([
      transaction('opening-balance', 200_000),
      transaction('expense', -5_000),
    ]);

    expect(balance.cents).toBe(195_000);
  });

  it('returns zero for an account without transactions', () => {
    expect(calculateAccountBalance([]).cents).toBe(0);
  });
});
