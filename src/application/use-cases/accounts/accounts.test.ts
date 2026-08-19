import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { AccountNotFoundError } from '@/domain/errors/account-not-found-error';
import { InvalidAccountNameError } from '@/domain/errors/invalid-account-name-error';
import { InvalidMoneyError } from '@/domain/errors/invalid-money-error';
import { Money } from '@/domain/value-objects/money';
import { ImmediateUnitOfWork } from '@/infrastructure/persistence/in-memory/immediate-unit-of-work';
import { InMemoryAccountRepository } from '@/infrastructure/persistence/in-memory/in-memory-account-repository';
import { InMemoryCategoryGroupRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-group-repository';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';
import { InMemoryTransactionRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-repository';

import { CloseAccount } from './close-account';
import { CreateAccount } from './create-account';
import { GetAccounts } from './get-accounts';

class FixedClock implements Clock {
  now() {
    return {
      instant: '2026-08-18T10:30:00.000Z',
      date: '2026-08-18',
    };
  }
}

class SequenceIdGenerator implements IdGenerator {
  private nextIndex = 0;

  constructor(private readonly ids: readonly string[]) {}

  next(): string {
    const id = this.ids[this.nextIndex];
    this.nextIndex += 1;

    if (!id) {
      throw new Error('No test ID configured.');
    }

    return id;
  }
}

class TrackingUnitOfWork implements UnitOfWork {
  executions = 0;

  async run<T>(task: () => Promise<T>): Promise<T> {
    this.executions += 1;
    return task();
  }
}

function setup() {
  const accounts = new InMemoryAccountRepository();
  const groups = new InMemoryCategoryGroupRepository();
  const categories = new InMemoryCategoryRepository();
  const transactions = new InMemoryTransactionRepository();
  const unitOfWork = new TrackingUnitOfWork();
  const clock = new FixedClock();
  const createAccount = new CreateAccount(
    accounts,
    groups,
    categories,
    transactions,
    unitOfWork,
    new SequenceIdGenerator(['account-1', 'opening-1']),
    clock,
  );

  return {
    accounts,
    groups,
    categories,
    transactions,
    unitOfWork,
    clock,
    createAccount,
  };
}

describe('account use cases', () => {
  it('creates an account and its opening balance in one unit of work', async () => {
    const { accounts, transactions, unitOfWork, createAccount } = setup();

    const account = await createAccount.execute({
      name: '  imagin  ',
      type: 'checking',
      onBudget: true,
      openingBalanceCents: 200_000,
    });

    expect(account).toEqual({
      id: 'account-1',
      name: 'imagin',
      type: 'checking',
      onBudget: true,
      closed: false,
      createdAt: '2026-08-18T10:30:00.000Z',
      updatedAt: '2026-08-18T10:30:00.000Z',
    });
    expect(await accounts.findById(account.id)).toEqual(account);
    expect(await transactions.findByAccount(account.id)).toEqual([
      expect.objectContaining({
        id: 'opening-1',
        payee: 'Opening Balance',
        date: '2026-08-18',
        status: 'cleared',
        amount: Money.fromCents(200_000),
      }),
    ]);
    expect(unitOfWork.executions).toBe(1);
  });

  it('creates a credit card with its linked payment category', async () => {
    const { createAccount, groups, categories } = setup();

    const account = await createAccount.execute({
      name: 'Visa',
      type: 'credit_card',
      onBudget: false,
      openingBalanceCents: -50_000,
    });

    expect(account.onBudget).toBe(true);
    await expect(
      groups.findById('system-group-credit-card-payments'),
    ).resolves.not.toBeNull();
    await expect(
      categories.findByGroup('system-group-credit-card-payments'),
    ).resolves.toEqual([
      expect.objectContaining({
        name: '💳 Visa',
        linkedAccountId: account.id,
      }),
    ]);
  });

  it.each([
    { name: '   ', openingBalanceCents: 0, error: InvalidAccountNameError },
    { name: 'Cash', openingBalanceCents: 1.5, error: InvalidMoneyError },
  ])(
    'does not persist invalid account input',
    async ({ name, openingBalanceCents, error }) => {
      const { accounts, createAccount, unitOfWork } = setup();

      await expect(
        createAccount.execute({
          name,
          type: 'cash',
          onBudget: true,
          openingBalanceCents,
        }),
      ).rejects.toThrow(error);
      expect(await accounts.findAll()).toEqual([]);
      expect(unitOfWork.executions).toBe(0);
    },
  );

  it('returns account summaries with a derived balance', async () => {
    const { accounts, transactions, createAccount } = setup();
    const account = await createAccount.execute({
      name: 'imagin',
      type: 'checking',
      onBudget: true,
      openingBalanceCents: 200_000,
    });
    await transactions.save({
      id: 'expense-1',
      accountId: account.id,
      amount: Money.fromCents(-5_000),
      date: '2026-08-18',
      status: 'cleared',
      kind: 'standard',
      createdAt: '2026-08-18T12:00:00.000Z',
      updatedAt: '2026-08-18T12:00:00.000Z',
    });

    const overview = await new GetAccounts(accounts, transactions).execute();

    expect(overview).toEqual({
      accounts: [
        {
          account,
          balance: Money.fromCents(195_000),
        },
      ],
      onBudgetTotal: Money.fromCents(195_000),
    });
  });

  it('closes an account without deleting its history', async () => {
    const { accounts, categories, transactions, clock, createAccount } =
      setup();
    const account = await createAccount.execute({
      name: 'imagin',
      type: 'checking',
      onBudget: true,
      openingBalanceCents: 200_000,
    });

    const closed = await new CloseAccount(
      accounts,
      categories,
      new ImmediateUnitOfWork(),
      clock,
    ).execute(account.id);

    expect(closed.closed).toBe(true);
    expect(await accounts.findById(account.id)).toEqual(closed);
    expect(await transactions.findByAccount(account.id)).toHaveLength(1);
  });

  it('fails explicitly when closing an unknown account', async () => {
    const accounts = new InMemoryAccountRepository();

    await expect(
      new CloseAccount(
        accounts,
        new InMemoryCategoryRepository(),
        new ImmediateUnitOfWork(),
        new FixedClock(),
      ).execute('missing'),
    ).rejects.toThrow(AccountNotFoundError);
  });

  it('supports a simple unit of work for in-memory consumers', async () => {
    await expect(
      new ImmediateUnitOfWork().run(async () => 'done'),
    ).resolves.toBe('done');
  });
});
