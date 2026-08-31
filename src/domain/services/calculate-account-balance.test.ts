import type { Transaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

import {
  calculateAccountBalance,
  calculateAccountBalanceState,
} from './calculate-account-balance';

function transaction(
  id: string,
  amountCents: number,
  status: Transaction['status'] = 'cleared',
): Transaction {
  return {
    id,
    accountId: 'account-1',
    amount: Money.fromCents(amountCents),
    date: '2026-08-18',
    status,
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

  it('derives working, cleared and uncleared balances from one status rule', () => {
    const state = calculateAccountBalanceState([
      transaction('cleared-income', 100_000),
      transaction('reconciled-expense', -20_000, 'reconciled'),
      transaction('uncleared-expense', -5_000, 'uncleared'),
    ]);

    expect(state).toEqual({
      working: Money.fromCents(75_000),
      cleared: Money.fromCents(80_000),
      uncleared: Money.fromCents(-5_000),
      clearedCount: 2,
      unclearedCount: 1,
    });
    expect(state.working).toEqual(state.cleared.add(state.uncleared));
  });

  it('returns a complete zero state when there is no activity', () => {
    expect(calculateAccountBalanceState([])).toEqual({
      working: Money.zero(),
      cleared: Money.zero(),
      uncleared: Money.zero(),
      clearedCount: 0,
      unclearedCount: 0,
    });
  });
});
