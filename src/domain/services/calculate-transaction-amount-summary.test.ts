import { createTransaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

import { calculateTransactionAmountSummary } from './calculate-transaction-amount-summary';

function transaction(id: string, cents: number) {
  return createTransaction({
    id,
    accountId: 'account-1',
    amount: Money.fromCents(cents),
    date: '2026-10-16',
    status: 'cleared',
    createdAt: `2026-10-16T10:00:0${id}.000Z`,
    updatedAt: `2026-10-16T10:00:0${id}.000Z`,
  });
}

function transfer(id: string, cents: number) {
  return createTransaction({
    id,
    accountId: `account-${id}`,
    amount: Money.fromCents(cents),
    date: '2026-10-16',
    status: 'cleared',
    kind: 'transfer',
    transactionGroupId: 'transfer-1',
    createdAt: `2026-10-16T11:00:0${id}.000Z`,
    updatedAt: `2026-10-16T11:00:0${id}.000Z`,
  });
}

describe('transaction amount summary', () => {
  it('separates positive and negative amounts and derives the net total', () => {
    expect(
      calculateTransactionAmountSummary([
        transaction('1', 12_000),
        transaction('2', -3_500),
        transaction('3', 2_000),
        transaction('4', -4_500),
      ]),
    ).toEqual({
      income: Money.fromCents(14_000),
      spending: Money.fromCents(8_000),
      net: Money.fromCents(6_000),
    });
  });

  it('does not count transfers as income, spending, or net movement', () => {
    expect(
      calculateTransactionAmountSummary([
        transaction('1', 12_000),
        transaction('2', -3_500),
        transfer('3', -50_000),
        transfer('4', 50_000),
      ]),
    ).toEqual({
      income: Money.fromCents(12_000),
      spending: Money.fromCents(3_500),
      net: Money.fromCents(8_500),
    });
  });

  it('ignores a single transfer leg returned by an account filter', () => {
    expect(calculateTransactionAmountSummary([transfer('1', 50_000)])).toEqual({
      income: Money.zero(),
      spending: Money.zero(),
      net: Money.zero(),
    });
  });

  it('returns zero totals for an empty result', () => {
    expect(calculateTransactionAmountSummary([])).toEqual({
      income: Money.zero(),
      spending: Money.zero(),
      net: Money.zero(),
    });
  });
});
