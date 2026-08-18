import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import { createAccount } from '@/domain/entities/account';
import { createTransaction } from '@/domain/entities/transaction';
import { InvalidReconciliationError } from '@/domain/errors/invalid-reconciliation-error';
import { Money } from '@/domain/value-objects/money';
import { ImmediateUnitOfWork } from '@/infrastructure/persistence/in-memory/immediate-unit-of-work';
import { InMemoryAccountRepository } from '@/infrastructure/persistence/in-memory/in-memory-account-repository';
import { InMemoryTransactionRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-repository';

import { GetReconciliation } from './get-reconciliation';
import { ReconcileAccount } from './reconcile-account';

const clock: Clock = {
  now: () => ({
    instant: '2026-08-18T12:00:00.000Z',
    date: '2026-08-18',
  }),
};
const ids: IdGenerator = { next: () => 'adjustment-1' };

async function setup() {
  const accounts = new InMemoryAccountRepository();
  const transactions = new InMemoryTransactionRepository();
  await accounts.save(
    createAccount({
      id: 'account-1',
      name: 'Bank',
      type: 'checking',
      onBudget: true,
      createdAt: clock.now().instant,
      updatedAt: clock.now().instant,
    }),
  );
  for (const values of [
    { id: 'cleared-1', cents: 100_000, status: 'cleared' as const },
    { id: 'reconciled-1', cents: 2_000, status: 'reconciled' as const },
    { id: 'uncleared-1', cents: -5_000, status: 'uncleared' as const },
  ]) {
    await transactions.save(
      createTransaction({
        id: values.id,
        accountId: 'account-1',
        amount: Money.fromCents(values.cents),
        date: clock.now().date,
        status: values.status,
        createdAt: clock.now().instant,
        updatedAt: clock.now().instant,
      }),
    );
  }
  return { accounts, transactions };
}

describe('account reconciliation', () => {
  it('previews cleared and working balances independently', async () => {
    const { accounts, transactions } = await setup();

    await expect(
      new GetReconciliation(accounts, transactions, clock).execute('account-1'),
    ).resolves.toEqual(
      expect.objectContaining({
        clearedBalance: Money.fromCents(102_000),
        workingBalance: Money.fromCents(97_000),
        clearedCount: 2,
        unclearedCount: 1,
      }),
    );
  });

  it('marks only cleared transactions as reconciled when balances match', async () => {
    const { accounts, transactions } = await setup();
    const reconcile = new ReconcileAccount(
      accounts,
      transactions,
      new ImmediateUnitOfWork(),
      ids,
      clock,
    );

    await expect(
      reconcile.execute({
        accountId: 'account-1',
        actualBalanceCents: 102_000,
        createAdjustment: false,
      }),
    ).resolves.toEqual({ reconciledCount: 1 });
    expect((await transactions.findById('cleared-1'))?.status).toBe(
      'reconciled',
    );
    expect((await transactions.findById('uncleared-1'))?.status).toBe(
      'uncleared',
    );
  });

  it('requires consent for a discrepancy and creates a reconciled adjustment', async () => {
    const { accounts, transactions } = await setup();
    const reconcile = new ReconcileAccount(
      accounts,
      transactions,
      new ImmediateUnitOfWork(),
      ids,
      clock,
    );
    const input = {
      accountId: 'account-1',
      actualBalanceCents: 100_000,
    } as const;

    await expect(
      reconcile.execute({ ...input, createAdjustment: false }),
    ).rejects.toThrow(InvalidReconciliationError);
    const result = await reconcile.execute({
      ...input,
      createAdjustment: true,
    });

    expect(result.adjustment).toEqual(
      expect.objectContaining({
        amount: Money.fromCents(-2_000),
        status: 'reconciled',
      }),
    );
    expect(await transactions.findById('adjustment-1')).toEqual(
      result.adjustment,
    );
    await expect(
      new GetReconciliation(accounts, transactions, clock).execute('account-1'),
    ).resolves.toEqual(
      expect.objectContaining({ clearedBalance: Money.fromCents(100_000) }),
    );
  });
});
