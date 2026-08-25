import type { SQLiteDatabase } from 'expo-sqlite';

import type { Account } from '@/domain/entities/account';
import type { Transaction } from '@/domain/entities/transaction';
import { Money } from '@/domain/value-objects/money';

import {
  accountFromRow,
  type AccountRow,
  SQLiteAccountRepository,
} from './sqlite-account-repository';
import {
  SQLiteTransactionRepository,
  transactionFromRow,
  type TransactionRow,
} from './sqlite-transaction-repository';

function databaseMock(options?: {
  allRows?: readonly unknown[];
  firstRow?: unknown;
}) {
  const getAllAsync = jest.fn(
    async (_sql: string, ..._params: readonly unknown[]) => [
      ...(options?.allRows ?? []),
    ],
  );
  const getFirstAsync = jest.fn(
    async (_sql: string, ..._params: readonly unknown[]) =>
      options?.firstRow === undefined ? null : options.firstRow,
  );
  const runAsync = jest.fn(async (..._args: readonly unknown[]) => ({
    changes: 1,
    lastInsertRowId: 1,
  }));

  return {
    database: {
      getAllAsync,
      getFirstAsync,
      runAsync,
    } as unknown as SQLiteDatabase,
    getAllAsync,
    getFirstAsync,
    runAsync,
  };
}

const accountRow: AccountRow = {
  id: 'account-1',
  name: 'imagin',
  type: 'checking',
  on_budget: 1,
  closed: 0,
  created_at: '2026-08-18T10:00:00.000Z',
  updated_at: '2026-08-18T10:00:00.000Z',
};

const account: Account = {
  id: 'account-1',
  name: 'imagin',
  type: 'checking',
  onBudget: true,
  closed: false,
  createdAt: '2026-08-18T10:00:00.000Z',
  updatedAt: '2026-08-18T10:00:00.000Z',
};

const transactionRow: TransactionRow = {
  id: 'opening-1',
  account_id: 'account-1',
  category_id: null,
  payee: 'Opening Balance',
  amount: 200_000,
  date: '2026-08-18',
  notes: null,
  status: 'cleared',
  kind: 'opening_balance',
  transaction_group_id: null,
  created_at: '2026-08-18T10:00:00.000Z',
  updated_at: '2026-08-18T10:00:00.000Z',
};

describe('SQLite repositories', () => {
  it('maps SQLite account booleans into domain booleans', () => {
    expect(accountFromRow(accountRow)).toEqual(account);
  });

  it('reads and saves accounts using bound values', async () => {
    const { database, runAsync } = databaseMock({ allRows: [accountRow] });
    const repository = new SQLiteAccountRepository(database);

    await expect(repository.findAll()).resolves.toEqual([account]);
    await repository.save(account);

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO accounts'),
      'account-1',
      'imagin',
      'checking',
      1,
      0,
      '2026-08-18T10:00:00.000Z',
      '2026-08-18T10:00:00.000Z',
    );
  });

  it('returns null when an account does not exist', async () => {
    const { database } = databaseMock();

    await expect(
      new SQLiteAccountRepository(database).findById('missing'),
    ).resolves.toBeNull();
  });

  it('maps integer transaction amounts to Money and omits null optionals', () => {
    expect(transactionFromRow(transactionRow)).toEqual({
      id: 'opening-1',
      accountId: 'account-1',
      payee: 'Opening Balance',
      amount: Money.fromCents(200_000),
      date: '2026-08-18',
      status: 'cleared',
      kind: 'opening_balance',
      createdAt: '2026-08-18T10:00:00.000Z',
      updatedAt: '2026-08-18T10:00:00.000Z',
    });
  });

  it('reads and saves protected transactions using cents', async () => {
    const { database, runAsync } = databaseMock({ allRows: [transactionRow] });
    const repository = new SQLiteTransactionRepository(database);
    const transaction: Transaction = transactionFromRow(transactionRow);

    await expect(repository.findByAccount('account-1')).resolves.toEqual([
      transactionFromRow(transactionRow),
    ]);
    await repository.save(transaction);

    expect(runAsync).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO transactions'),
      'opening-1',
      'account-1',
      null,
      'Opening Balance',
      200_000,
      '2026-08-18',
      null,
      'cleared',
      'opening_balance',
      null,
      '2026-08-18T10:00:00.000Z',
      '2026-08-18T10:00:00.000Z',
    );
  });

  it('queries transactions with bound filters and deletes by ID', async () => {
    const { database, getAllAsync, runAsync } = databaseMock({
      allRows: [transactionRow],
      firstRow: transactionRow,
    });
    const repository = new SQLiteTransactionRepository(database);

    await expect(
      repository.findAll({
        accountId: 'account-1',
        categoryId: 'category-1',
        search: 'market',
        payee: 'mercado',
        memo: 'weekly',
        dateFrom: '2026-08-01',
        dateTo: '2026-08-31',
        transactionGroupId: 'transfer-1',
        before: {
          date: '2026-08-20',
          createdAt: '2026-08-20T12:00:00.000Z',
          id: 'cursor-id',
        },
        limit: 25,
      }),
    ).resolves.toEqual([transactionFromRow(transactionRow)]);
    expect(getAllAsync).toHaveBeenCalledWith(
      expect.stringContaining("lower(coalesce(payee, '')) LIKE ?"),
      'account-1',
      'category-1',
      '2026-08-01',
      '2026-08-31',
      'transfer-1',
      '2026-08-20',
      '2026-08-20',
      '2026-08-20T12:00:00.000Z',
      '2026-08-20',
      '2026-08-20T12:00:00.000Z',
      'cursor-id',
      '%market%',
      '%market%',
      '%mercado%',
      '%weekly%',
      25,
    );
    await expect(repository.findById('opening-1')).resolves.toEqual(
      transactionFromRow(transactionRow),
    );
    await repository.deleteById('opening-1');
    expect(runAsync).toHaveBeenLastCalledWith(
      'DELETE FROM transactions WHERE id = ?',
      'opening-1',
    );

    await repository.reassignCategory(
      'category-1',
      'category-2',
      '2026-08-25T10:00:00.000Z',
    );
    expect(runAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('SET category_id = ?, updated_at = ?'),
      'category-2',
      '2026-08-25T10:00:00.000Z',
      'category-1',
    );

    await expect(repository.findByGroup('group-1')).resolves.toEqual([
      transactionFromRow(transactionRow),
    ]);
    expect(getAllAsync).toHaveBeenLastCalledWith(
      expect.stringContaining('WHERE transaction_group_id = ?'),
      'group-1',
    );
    await repository.deleteByGroup('group-1');
    expect(runAsync).toHaveBeenLastCalledWith(
      'DELETE FROM transactions WHERE transaction_group_id = ?',
      'group-1',
    );
  });
});
