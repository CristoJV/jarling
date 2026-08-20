import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import type { Account } from '@/domain/entities/account';
import type { Category } from '@/domain/entities/category';
import type { CategoryGroup } from '@/domain/entities/category-group';
import type { Transaction } from '@/domain/entities/transaction';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { InsufficientReadyToAssignError } from '@/domain/errors/insufficient-ready-to-assign-error';
import { InvalidBudgetMonthError } from '@/domain/errors/invalid-budget-month-error';
import { InvalidMoneyError } from '@/domain/errors/invalid-money-error';
import { Money } from '@/domain/value-objects/money';
import { InMemoryAccountRepository } from '@/infrastructure/persistence/in-memory/in-memory-account-repository';
import { InMemoryBudgetAllocationRepository } from '@/infrastructure/persistence/in-memory/in-memory-budget-allocation-repository';
import { InMemoryCategoryGroupRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-group-repository';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';
import { InMemoryTransactionRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-repository';

import { AssignBudget } from './assign-budget';
import { GetBudgetMonth } from './get-budget-month';

class FixedClock implements Clock {
  now() {
    return { instant: '2026-08-18T12:00:00.000Z', date: '2026-08-18' };
  }
}

class FixedIdGenerator implements IdGenerator {
  next(): string {
    return 'allocation-1';
  }
}

class TrackingUnitOfWork implements UnitOfWork {
  executions = 0;

  async run<T>(task: () => Promise<T>): Promise<T> {
    this.executions += 1;
    return task();
  }
}

const instant = '2026-08-01T10:00:00.000Z';
const account: Account = {
  id: 'account-1',
  name: 'imagin',
  type: 'checking',
  onBudget: true,
  closed: false,
  createdAt: instant,
  updatedAt: instant,
};
const group: CategoryGroup = {
  id: 'group-1',
  name: 'Needs',
  sortOrder: 0,
  createdAt: instant,
  updatedAt: instant,
};
const category: Category = {
  id: 'category-1',
  groupId: group.id,
  name: 'Groceries',
  hidden: false,
  sortOrder: 0,
  createdAt: instant,
  updatedAt: instant,
};
const openingBalance: Transaction = {
  id: 'opening-1',
  accountId: account.id,
  amount: Money.fromCents(200_000),
  date: '2026-08-01',
  status: 'cleared',
  kind: 'opening_balance',
  createdAt: instant,
  updatedAt: instant,
};

async function setup() {
  const accounts = new InMemoryAccountRepository();
  const groups = new InMemoryCategoryGroupRepository();
  const categories = new InMemoryCategoryRepository();
  const transactions = new InMemoryTransactionRepository();
  const allocations = new InMemoryBudgetAllocationRepository();
  const unitOfWork = new TrackingUnitOfWork();
  await accounts.save(account);
  await groups.save(group);
  await categories.save(category);
  await transactions.save(openingBalance);
  const getBudget = new GetBudgetMonth(
    accounts,
    groups,
    categories,
    transactions,
    allocations,
  );
  const assign = new AssignBudget(
    categories,
    allocations,
    getBudget,
    unitOfWork,
    new FixedIdGenerator(),
    new FixedClock(),
  );

  return { allocations, unitOfWork, getBudget, assign };
}

describe('budget use cases', () => {
  it('assigns available cash to a category and reduces Ready to Assign', async () => {
    const { assign, getBudget, unitOfWork } = await setup();

    const result = await assign.execute({
      categoryId: category.id,
      month: '2026-08',
      amountCents: 40_000,
    });

    expect(result).toEqual({
      id: 'allocation-1',
      categoryId: category.id,
      month: '2026-08',
      amount: Money.fromCents(40_000),
      createdAt: '2026-08-18T12:00:00.000Z',
      updatedAt: '2026-08-18T12:00:00.000Z',
    });
    await expect(getBudget.execute('2026-08')).resolves.toEqual(
      expect.objectContaining({ readyToAssign: Money.fromCents(160_000) }),
    );
    expect(unitOfWork.executions).toBe(1);
  });

  it('updates the single allocation for a category and month', async () => {
    const { assign, allocations } = await setup();
    const first = await assign.execute({
      categoryId: category.id,
      month: '2026-08',
      amountCents: 40_000,
    });

    const reduced = await assign.execute({
      categoryId: category.id,
      month: '2026-08',
      amountCents: 30_000,
    });

    expect(reduced.id).toBe(first.id);
    expect(reduced.amount).toEqual(Money.fromCents(30_000));
    expect(await allocations.findThroughMonth('2026-08')).toEqual([reduced]);
  });

  it('rejects an assignment that would make Ready to Assign negative', async () => {
    const { assign, allocations } = await setup();

    const cause = await assign
      .execute({
        categoryId: category.id,
        month: '2026-08',
        amountCents: 200_001,
      })
      .catch((error: unknown) => error);
    expect(cause).toBeInstanceOf(InsufficientReadyToAssignError);
    expect((cause as InsufficientReadyToAssignError).requested).toEqual(
      Money.fromCents(200_001),
    );
    expect((cause as InsufficientReadyToAssignError).available).toEqual(
      Money.fromCents(200_000),
    );
    expect((cause as InsufficientReadyToAssignError).missing).toEqual(
      Money.fromCents(1),
    );
    expect(await allocations.findThroughMonth('2026-08')).toEqual([]);
  });

  it('allows reducing an allocation when persisted data already has negative RTA', async () => {
    const { assign, allocations, getBudget } = await setup();
    await allocations.save({
      id: 'overallocated-budget',
      categoryId: category.id,
      month: '2026-08',
      amount: Money.fromCents(210_000),
      createdAt: instant,
      updatedAt: instant,
    });

    await assign.execute({
      categoryId: category.id,
      month: '2026-08',
      amountCents: 190_000,
    });

    await expect(getBudget.execute('2026-08')).resolves.toEqual(
      expect.objectContaining({ readyToAssign: Money.fromCents(10_000) }),
    );
  });

  it('fails for unknown categories, invalid months and non-integer cents', async () => {
    const { assign } = await setup();

    await expect(
      assign.execute({
        categoryId: 'missing',
        month: '2026-08',
        amountCents: 100,
      }),
    ).rejects.toThrow(CategoryNotFoundError);
    await expect(
      assign.execute({
        categoryId: category.id,
        month: '2026-13',
        amountCents: 100,
      }),
    ).rejects.toThrow(InvalidBudgetMonthError);
    await expect(
      assign.execute({
        categoryId: category.id,
        month: '2026-08',
        amountCents: 1.5,
      }),
    ).rejects.toThrow(InvalidMoneyError);
  });
});
