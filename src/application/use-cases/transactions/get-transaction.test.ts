import { createAccount } from '@/domain/entities/account';
import { createCategory } from '@/domain/entities/category';
import { createTransaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';
import { InMemoryAccountRepository } from '@/infrastructure/persistence/in-memory/in-memory-account-repository';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';
import { InMemoryTransactionRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-repository';

import { GetTransaction } from './get-transaction';

const instant = '2026-08-20T12:00:00.000Z';

describe('GetTransaction', () => {
  it('loads one transaction with its presentation names', async () => {
    const accounts = new InMemoryAccountRepository();
    const categories = new InMemoryCategoryRepository();
    const transactions = new InMemoryTransactionRepository();
    await accounts.save(
      createAccount({
        id: 'account-1',
        name: 'Wallet',
        type: 'cash',
        onBudget: true,
        createdAt: instant,
        updatedAt: instant,
      }),
    );
    await categories.save(
      createCategory({
        id: 'category-1',
        groupId: 'group-1',
        name: 'Food',
        hidden: false,
        sortOrder: 0,
        createdAt: instant,
        updatedAt: instant,
      }),
    );
    await transactions.save(
      createTransaction({
        id: 'transaction-1',
        accountId: 'account-1',
        categoryId: 'category-1',
        amount: Money.fromCents(-500),
        date: '2026-08-20',
        status: 'cleared',
        createdAt: instant,
        updatedAt: instant,
      }),
    );

    await expect(
      new GetTransaction(transactions, accounts, categories).execute(
        'transaction-1',
      ),
    ).resolves.toEqual(
      expect.objectContaining({
        accountName: 'Wallet',
        categoryName: 'Food',
      }),
    );
  });

  it('returns null without loading relationships when the ID is missing', async () => {
    const accounts = new InMemoryAccountRepository();
    const categories = new InMemoryCategoryRepository();
    const transactions = new InMemoryTransactionRepository();

    await expect(
      new GetTransaction(transactions, accounts, categories).execute('missing'),
    ).resolves.toBeNull();
  });
});
