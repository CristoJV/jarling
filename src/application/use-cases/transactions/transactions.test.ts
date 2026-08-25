import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import type { Account } from '@/domain/entities/account';
import type { Category } from '@/domain/entities/category';
import type { Transaction } from '@/domain/entities/transaction';
import { CannotModifyReconciledTransactionError } from '@/domain/errors/cannot-modify-reconciled-transaction-error';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { InvalidTransactionAmountError } from '@/domain/errors/invalid-transaction-amount-error';
import { InvalidTransactionDateError } from '@/domain/errors/invalid-transaction-date-error';
import { TransactionNotFoundError } from '@/domain/errors/transaction-not-found-error';
import { ProtectedTransactionError } from '@/domain/errors/protected-transaction-error';
import { Money } from '@/domain/value-objects/money';
import { InMemoryAccountRepository } from '@/infrastructure/persistence/in-memory/in-memory-account-repository';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';
import { InMemoryTransactionRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-repository';

import { CreateTransaction } from './create-transaction';
import { DeleteTransaction } from './delete-transaction';
import { GetTransactions } from './get-transactions';
import { UpdateTransaction } from './update-transaction';

class FixedClock implements Clock {
  now() {
    return { instant: '2026-08-18T12:00:00.000Z', date: '2026-08-18' };
  }
}

class FixedIdGenerator implements IdGenerator {
  next(): string {
    return 'transaction-1';
  }
}

class TrackingUnitOfWork implements UnitOfWork {
  executions = 0;

  async run<T>(task: () => Promise<T>): Promise<T> {
    this.executions += 1;
    return task();
  }
}

const account: Account = {
  id: 'account-1',
  name: 'imagin',
  type: 'checking',
  onBudget: true,
  closed: false,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

const category: Category = {
  id: 'category-1',
  groupId: 'group-1',
  name: 'Groceries',
  hidden: false,
  sortOrder: 0,
  createdAt: '2026-08-01T10:00:00.000Z',
  updatedAt: '2026-08-01T10:00:00.000Z',
};

async function setup() {
  const accounts = new InMemoryAccountRepository();
  const categories = new InMemoryCategoryRepository();
  const transactions = new InMemoryTransactionRepository();
  const unitOfWork = new TrackingUnitOfWork();
  const clock = new FixedClock();
  await accounts.save(account);
  await categories.save(category);

  return {
    accounts,
    categories,
    transactions,
    unitOfWork,
    clock,
    create: new CreateTransaction(
      accounts,
      categories,
      transactions,
      unitOfWork,
      new FixedIdGenerator(),
      clock,
    ),
  };
}

describe('transaction use cases', () => {
  it('creates an expense with a negative domain amount and normalized text', async () => {
    const { create, transactions, unitOfWork } = await setup();

    const result = await create.execute({
      kind: 'expense',
      accountId: account.id,
      categoryId: category.id,
      amountCents: 6_000,
      payee: '  Mercadona ',
      notes: '  Weekly shop ',
      date: '2026-08-18',
      status: 'cleared',
    });

    expect(result).toEqual({
      id: 'transaction-1',
      accountId: account.id,
      categoryId: category.id,
      amount: Money.fromCents(-6_000),
      payee: 'Mercadona',
      notes: 'Weekly shop',
      date: '2026-08-18',
      status: 'cleared',
      kind: 'standard',
      createdAt: '2026-08-18T12:00:00.000Z',
      updatedAt: '2026-08-18T12:00:00.000Z',
    });
    expect(await transactions.findById(result.id)).toEqual(result);
    expect(unitOfWork.executions).toBe(1);
  });

  it('creates income without a category and with a positive amount', async () => {
    const { create } = await setup();

    await expect(
      create.execute({
        kind: 'income',
        accountId: account.id,
        amountCents: 230_000,
        payee: 'Salary',
        date: '2026-08-18',
        status: 'cleared',
      }),
    ).resolves.toEqual(
      expect.objectContaining({ amount: Money.fromCents(230_000) }),
    );
  });

  it.each([0, -1, 1.5])(
    'rejects invalid input amount %p',
    async (amountCents) => {
      const { create, transactions, unitOfWork } = await setup();

      await expect(
        create.execute({
          kind: 'income',
          accountId: account.id,
          amountCents,
          date: '2026-08-18',
          status: 'uncleared',
        }),
      ).rejects.toThrow(InvalidTransactionAmountError);
      expect(await transactions.findAll()).toEqual([]);
      expect(unitOfWork.executions).toBe(0);
    },
  );

  it('rejects impossible calendar dates', async () => {
    const { create } = await setup();

    await expect(
      create.execute({
        kind: 'income',
        accountId: account.id,
        amountCents: 100,
        date: '2026-02-30',
        status: 'uncleared',
      }),
    ).rejects.toThrow(InvalidTransactionDateError);
  });

  it('requires an existing category for expenses', async () => {
    const { create } = await setup();

    await expect(
      create.execute({
        kind: 'expense',
        accountId: account.id,
        categoryId: 'missing',
        amountCents: 100,
        date: '2026-08-18',
        status: 'uncleared',
      }),
    ).rejects.toThrow(CategoryNotFoundError);
  });

  it('stores an expense without a category as Uncategorized', async () => {
    const { create } = await setup();

    const result = await create.execute({
      kind: 'expense',
      accountId: account.id,
      amountCents: 100,
      date: '2026-08-18',
      status: 'uncleared',
    });

    expect(result.amount).toEqual(Money.fromCents(-100));
    expect(result).not.toHaveProperty('categoryId');
  });

  it('filters and enriches transactions for presentation', async () => {
    const { accounts, categories, transactions, create } = await setup();
    await create.execute({
      kind: 'expense',
      accountId: account.id,
      categoryId: category.id,
      amountCents: 6_000,
      payee: 'Mercadona',
      notes: 'Weekly shop',
      date: '2026-08-18',
      status: 'cleared',
    });

    const result = await new GetTransactions(
      transactions,
      accounts,
      categories,
    ).execute({
      payee: 'merc',
      memo: 'week',
      categoryId: category.id,
    });

    expect(result).toEqual([
      expect.objectContaining({
        accountName: 'imagin',
        categoryName: 'Groceries',
      }),
    ]);
  });

  it('filters Uncategorized without including income or categorized expenses', async () => {
    const { accounts, categories, transactions, create } = await setup();
    await create.execute({
      kind: 'expense',
      accountId: account.id,
      amountCents: 1_000,
      payee: 'Unsorted expense',
      date: '2026-08-18',
      status: 'uncleared',
    });
    const uncategorized = await transactions.findById('transaction-1');
    if (!uncategorized) throw new Error('Expected uncategorized transaction.');
    await transactions.save({
      ...uncategorized,
      id: 'income',
      amount: Money.fromCents(2_000),
      payee: 'Income',
    });
    await transactions.save({
      ...uncategorized,
      id: 'categorized',
      categoryId: category.id,
      payee: 'Categorized expense',
    });

    const result = await new GetTransactions(
      transactions,
      accounts,
      categories,
    ).execute({ uncategorized: true });

    expect(result.map(({ transaction }) => transaction.id)).toEqual([
      'transaction-1',
    ]);
  });

  it('updates an editable transaction while preserving identity and creation time', async () => {
    const { accounts, categories, transactions, unitOfWork, clock, create } =
      await setup();
    const created = await create.execute({
      kind: 'expense',
      accountId: account.id,
      categoryId: category.id,
      amountCents: 6_000,
      date: '2026-08-18',
      status: 'uncleared',
    });

    const updated = await new UpdateTransaction(
      accounts,
      categories,
      transactions,
      unitOfWork,
      clock,
    ).execute({
      id: created.id,
      kind: 'income',
      accountId: account.id,
      amountCents: 10_000,
      payee: 'Refund',
      date: '2026-08-19',
      status: 'cleared',
    });

    expect(updated).toEqual({
      id: created.id,
      accountId: account.id,
      amount: Money.fromCents(10_000),
      payee: 'Refund',
      date: '2026-08-19',
      status: 'cleared',
      kind: 'standard',
      createdAt: created.createdAt,
      updatedAt: '2026-08-18T12:00:00.000Z',
    });
  });

  it('deletes an editable transaction', async () => {
    const { transactions, unitOfWork, create } = await setup();
    const created = await create.execute({
      kind: 'income',
      accountId: account.id,
      amountCents: 100,
      date: '2026-08-18',
      status: 'uncleared',
    });

    await new DeleteTransaction(transactions, unitOfWork).execute(created.id);

    expect(await transactions.findById(created.id)).toBeNull();
  });

  it('protects reconciled transactions from update and deletion', async () => {
    const { accounts, categories, transactions, unitOfWork, clock } =
      await setup();
    const reconciled: Transaction = {
      id: 'reconciled-1',
      accountId: account.id,
      amount: Money.fromCents(100),
      date: '2026-08-18',
      status: 'reconciled',
      kind: 'standard',
      createdAt: '2026-08-18T10:00:00.000Z',
      updatedAt: '2026-08-18T10:00:00.000Z',
    };
    await transactions.save(reconciled);

    await expect(
      new UpdateTransaction(
        accounts,
        categories,
        transactions,
        unitOfWork,
        clock,
      ).execute({
        id: reconciled.id,
        kind: 'income',
        accountId: account.id,
        amountCents: 200,
        date: '2026-08-18',
        status: 'cleared',
      }),
    ).rejects.toThrow(CannotModifyReconciledTransactionError);
    await expect(
      new DeleteTransaction(transactions, unitOfWork).execute(reconciled.id),
    ).rejects.toThrow(CannotModifyReconciledTransactionError);
  });

  it('protects technical transactions from the generic editor', async () => {
    const { accounts, categories, transactions, unitOfWork, clock } =
      await setup();
    const opening: Transaction = {
      id: 'opening',
      accountId: account.id,
      amount: Money.fromCents(100),
      date: '2026-08-18',
      status: 'cleared',
      kind: 'opening_balance',
      createdAt: '2026-08-18T10:00:00.000Z',
      updatedAt: '2026-08-18T10:00:00.000Z',
    };
    await transactions.save(opening);
    await expect(
      new UpdateTransaction(
        accounts,
        categories,
        transactions,
        unitOfWork,
        clock,
      ).execute({
        id: opening.id,
        kind: 'income',
        accountId: account.id,
        amountCents: 200,
        date: '2026-08-18',
        status: 'cleared',
      }),
    ).rejects.toThrow(ProtectedTransactionError);
    await expect(
      new DeleteTransaction(transactions, unitOfWork).execute(opening.id),
    ).rejects.toThrow(ProtectedTransactionError);
  });

  it('deletes only the selected standard transaction', async () => {
    const { transactions, unitOfWork } = await setup();
    const first: Transaction = {
      id: 'related-1',
      accountId: account.id,
      amount: Money.fromCents(-100),
      date: '2026-08-18',
      status: 'cleared',
      kind: 'standard',
      createdAt: '2026-08-18T10:00:00.000Z',
      updatedAt: '2026-08-18T10:00:00.000Z',
    };
    const second = { ...first, id: 'related-2', amount: Money.fromCents(100) };
    await transactions.save(first);
    await transactions.save(second);

    await new DeleteTransaction(transactions, unitOfWork).execute(first.id);

    expect(await transactions.findById(first.id)).toBeNull();
    expect(await transactions.findById(second.id)).toEqual(second);
  });

  it('fails explicitly when deleting an unknown transaction', async () => {
    const { transactions, unitOfWork } = await setup();

    await expect(
      new DeleteTransaction(transactions, unitOfWork).execute('missing'),
    ).rejects.toThrow(TransactionNotFoundError);
  });
});
