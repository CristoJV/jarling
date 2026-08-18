import { createTransaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';
import { InMemoryTransactionRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-repository';

import { GetPayees } from './get-payees';

const base = {
  accountId: 'account-1',
  amount: Money.fromCents(-100),
  date: '2026-08-18',
  status: 'cleared' as const,
  createdAt: '2026-08-18T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z',
};

describe('GetPayees', () => {
  it('returns unique non-empty payees alphabetically', async () => {
    const transactions = new InMemoryTransactionRepository();
    for (const [id, payee] of [
      ['1', 'Zara'],
      ['2', 'amazon'],
      ['3', 'Amazon'],
      ['4', undefined],
    ] as const) {
      await transactions.save(createTransaction({ ...base, id, payee }));
    }

    await expect(new GetPayees(transactions).execute()).resolves.toEqual([
      'amazon',
      'Zara',
    ]);
  });
});
