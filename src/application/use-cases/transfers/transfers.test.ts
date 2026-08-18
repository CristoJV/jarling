import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import { DeleteTransaction } from '@/application/use-cases/transactions/delete-transaction';
import { createAccount } from '@/domain/entities/account';
import { InvalidTransferError } from '@/domain/errors/invalid-transfer-error';
import { calculateBudgetMonth } from '@/domain/services/calculate-budget-month';
import { Money } from '@/domain/value-objects/money';
import { ImmediateUnitOfWork } from '@/infrastructure/persistence/in-memory/immediate-unit-of-work';
import { InMemoryAccountRepository } from '@/infrastructure/persistence/in-memory/in-memory-account-repository';
import { InMemoryTransactionRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-repository';

import { CreateTransfer } from './create-transfer';
import { UpdateTransfer } from './update-transfer';

const clock: Clock = {
  now: () => ({ instant: '2026-08-18T12:00:00.000Z', date: '2026-08-18' }),
};

class SequenceIds implements IdGenerator {
  private current = 0;
  next() {
    this.current += 1;
    return `id-${this.current}`;
  }
}

async function setup() {
  const accounts = new InMemoryAccountRepository();
  const transactions = new InMemoryTransactionRepository();
  const unitOfWork = new ImmediateUnitOfWork();
  for (const account of [
    createAccount({
      id: 'source',
      name: 'Checking',
      type: 'checking',
      onBudget: true,
      createdAt: clock.now().instant,
      updatedAt: clock.now().instant,
    }),
    createAccount({
      id: 'destination',
      name: 'Savings',
      type: 'savings',
      onBudget: true,
      createdAt: clock.now().instant,
      updatedAt: clock.now().instant,
    }),
    createAccount({
      id: 'tracking',
      name: 'Broker',
      type: 'tracking',
      onBudget: false,
      createdAt: clock.now().instant,
      updatedAt: clock.now().instant,
    }),
  ])
    await accounts.save(account);
  return {
    accounts,
    transactions,
    create: new CreateTransfer(
      accounts,
      transactions,
      unitOfWork,
      new SequenceIds(),
      clock,
    ),
    update: new UpdateTransfer(accounts, transactions, unitOfWork, clock),
    remove: new DeleteTransaction(transactions, unitOfWork),
  };
}

describe('transfers', () => {
  it('creates, updates and deletes both linked legs atomically', async () => {
    const { transactions, create, update, remove } = await setup();
    const pair = await create.execute({
      kind: 'transfer',
      sourceAccountId: 'source',
      destinationAccountId: 'destination',
      amountCents: 25_000,
      date: '2026-08-18',
      notes: 'Savings',
      status: 'cleared',
    });

    expect(pair.source.amount).toEqual(Money.fromCents(-25_000));
    expect(pair.destination.amount).toEqual(Money.fromCents(25_000));
    expect(pair.source.transactionGroupId).toBe(
      pair.destination.transactionGroupId,
    );
    expect(pair.source.categoryId).toBeUndefined();

    const updated = await update.execute({
      kind: 'transfer',
      transactionGroupId: pair.source.transactionGroupId!,
      sourceAccountId: 'destination',
      destinationAccountId: 'source',
      amountCents: 10_000,
      date: '2026-08-19',
      status: 'uncleared',
    });
    expect(updated.source.accountId).toBe('destination');
    expect(updated.destination.accountId).toBe('source');
    expect(
      await transactions.findByGroup(pair.source.transactionGroupId!),
    ).toHaveLength(2);

    await remove.execute(updated.destination.id);
    expect(
      await transactions.findByGroup(pair.source.transactionGroupId!),
    ).toEqual([]);
  });

  it('rejects the same account and preserves Ready to Assign between on-budget accounts', async () => {
    const { accounts, transactions, create } = await setup();
    await expect(
      create.execute({
        kind: 'transfer',
        sourceAccountId: 'source',
        destinationAccountId: 'source',
        amountCents: 100,
        date: '2026-08-18',
        status: 'cleared',
      }),
    ).rejects.toThrow(InvalidTransferError);
    await create.execute({
      kind: 'transfer',
      sourceAccountId: 'source',
      destinationAccountId: 'destination',
      amountCents: 25_000,
      date: '2026-08-18',
      status: 'cleared',
    });
    const budget = calculateBudgetMonth({
      month: '2026-08',
      accounts: await accounts.findAll(),
      transactions: await transactions.findAll(),
      allocations: [],
      categories: [],
      groups: [],
    });
    expect(budget.readyToAssign).toEqual(Money.zero());
  });

  it('removes money from Ready to Assign when transferring to tracking', async () => {
    const { accounts, transactions, create } = await setup();
    await create.execute({
      kind: 'transfer',
      sourceAccountId: 'source',
      destinationAccountId: 'tracking',
      amountCents: 25_000,
      date: '2026-08-18',
      status: 'cleared',
    });
    const budget = calculateBudgetMonth({
      month: '2026-08',
      accounts: await accounts.findAll(),
      transactions: await transactions.findAll(),
      allocations: [],
      categories: [],
      groups: [],
    });
    expect(budget.readyToAssign).toEqual(Money.fromCents(-25_000));
  });
});
