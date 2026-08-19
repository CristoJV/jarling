import { createTransaction } from './transaction';
import { Money } from '../value-objects/money';

const base = {
  id: 'transaction-1',
  accountId: 'account-1',
  amount: Money.fromCents(1_000),
  date: '2026-08-19',
  status: 'cleared' as const,
  createdAt: '2026-08-19T10:00:00.000Z',
  updatedAt: '2026-08-19T10:00:00.000Z',
};

describe('Transaction aggregate', () => {
  it('requires an owning group for every transfer leg', () => {
    expect(() =>
      createTransaction({
        ...base,
        kind: 'transfer',
        transactionGroupId: '',
      }),
    ).toThrow('requires a transaction group');
  });

  it('does not allow ordinary or technical transactions to own groups', () => {
    expect(() =>
      createTransaction({
        ...base,
        kind: 'standard',
        transactionGroupId: 'invalid-owned-group',
      } as never),
    ).toThrow('Only transfer legs');
  });
});
