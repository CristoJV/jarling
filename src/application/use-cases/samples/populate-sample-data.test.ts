import type { Clock } from '@/application/ports/clock';
import { GetAccounts } from '@/application/use-cases/accounts/get-accounts';
import { GetBudgetMonth } from '@/application/use-cases/budget/get-budget-month';
import { EnsureDefaultCategories } from '@/application/use-cases/categories/ensure-default-categories';
import { Money } from '@/domain/value-objects/money';
import { calculateTargetProgress } from '@/domain/services/calculate-target-progress';
import { ImmediateUnitOfWork } from '@/infrastructure/persistence/in-memory/immediate-unit-of-work';
import { InMemoryAccountRepository } from '@/infrastructure/persistence/in-memory/in-memory-account-repository';
import { InMemoryBudgetAllocationRepository } from '@/infrastructure/persistence/in-memory/in-memory-budget-allocation-repository';
import { InMemoryCategoryGroupRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-group-repository';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';
import { InMemoryCategoryTargetRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-target-repository';
import { InMemoryTransactionRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-repository';

import { PopulateSampleData } from './populate-sample-data';

class FixedClock implements Clock {
  now() {
    return { instant: '2026-08-18T12:00:00.000Z', date: '2026-08-18' };
  }
}

function setup() {
  const accounts = new InMemoryAccountRepository();
  const groups = new InMemoryCategoryGroupRepository();
  const categories = new InMemoryCategoryRepository();
  const transactions = new InMemoryTransactionRepository();
  const allocations = new InMemoryBudgetAllocationRepository();
  const targets = new InMemoryCategoryTargetRepository();
  const ensureDefaults = new EnsureDefaultCategories(
    groups,
    categories,
    new ImmediateUnitOfWork(),
    new FixedClock(),
  );
  const populate = new PopulateSampleData(
    accounts,
    groups,
    categories,
    transactions,
    allocations,
    targets,
    new ImmediateUnitOfWork(),
    new FixedClock(),
  );

  return {
    accounts,
    groups,
    categories,
    transactions,
    allocations,
    targets,
    ensureDefaults,
    populate,
  };
}

describe('PopulateSampleData', () => {
  it('creates a coherent overspending example', async () => {
    const {
      accounts,
      groups,
      categories,
      transactions,
      allocations,
      targets,
      ensureDefaults,
      populate,
    } = setup();

    await ensureDefaults.execute();

    await expect(populate.execute()).resolves.toEqual({
      populated: true,
      month: '2026-08',
    });

    const budget = await new GetBudgetMonth(
      accounts,
      groups,
      categories,
      transactions,
      allocations,
    ).execute('2026-08');
    const values = new Map(
      budget.groups.flatMap(({ categories }) =>
        categories.map(
          (category) => [category.category.name, category] as const,
        ),
      ),
    );
    const overview = await new GetAccounts(accounts, transactions).execute();

    expect(overview.accounts[0]?.balance).toEqual(Money.fromCents(177_000));
    expect(budget.readyToAssign).toEqual(Money.zero());
    expect(values.get('🛒 Groceries')).toEqual(
      expect.objectContaining({
        assigned: Money.fromCents(40_000),
        activity: Money.fromCents(-6_000),
        available: Money.fromCents(34_000),
      }),
    );
    expect(values.get('🚗 Transportation')?.available).toEqual(
      Money.fromCents(-2_000),
    );
    expect(values.get('⚡ Utilities')?.available).toEqual(
      Money.fromCents(49_000),
    );
    expect(values.get('📱 Phone & Internet')?.available).toEqual(
      Money.fromCents(1_000),
    );
    const allTargets = await targets.findAll();
    expect(allTargets).toEqual([
      expect.objectContaining({ categoryId: 'default-category-groceries' }),
      expect.objectContaining({
        categoryId: 'default-category-phone-internet',
      }),
      expect.objectContaining({ categoryId: 'default-category-rent-mortgage' }),
      expect.objectContaining({ categoryId: 'default-category-utilities' }),
    ]);
    const phoneValues = values.get('📱 Phone & Internet');
    const phoneTarget = allTargets.find(
      ({ categoryId }) => categoryId === 'default-category-phone-internet',
    );
    if (!phoneValues || !phoneTarget) throw new Error('Expected phone target.');
    expect(
      calculateTargetProgress({
        target: phoneTarget,
        assigned: phoneValues.assigned,
        available: phoneValues.available,
        spent: Money.zero(),
        month: '2026-08',
        today: '2026-08-18',
      }),
    ).toEqual(
      expect.objectContaining({
        recommended: Money.fromCents(2_500),
        status: 'underfunded',
      }),
    );
  });

  it('is idempotent and does not duplicate the sample dataset', async () => {
    const {
      accounts,
      groups,
      categories,
      transactions,
      targets,
      ensureDefaults,
      populate,
    } = setup();
    await ensureDefaults.execute();
    await populate.execute();

    await expect(populate.execute()).resolves.toEqual({
      populated: false,
      month: '2026-08',
    });
    expect(await accounts.findAll()).toHaveLength(1);
    expect(await groups.findAll()).toHaveLength(5);
    expect(await categories.findAll()).toHaveLength(6);
    expect(await transactions.findAll()).toHaveLength(3);
    expect(await targets.findAll()).toHaveLength(4);
  });
});
