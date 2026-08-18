import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import { CreateAccount } from '@/application/use-cases/accounts/create-account';
import { GetAccounts } from '@/application/use-cases/accounts/get-accounts';
import { AssignBudget } from '@/application/use-cases/budget/assign-budget';
import { GetBudgetMonth } from '@/application/use-cases/budget/get-budget-month';
import { CreateCategoryGroup } from '@/application/use-cases/categories/create-category-group';
import { CreateCategory } from '@/application/use-cases/categories/create-category';
import { CreateTransaction } from '@/application/use-cases/transactions/create-transaction';
import { SetCategoryTarget } from '@/application/use-cases/targets/set-category-target';
import { Money } from '@/domain/value-objects/money';
import { ImmediateUnitOfWork } from '@/infrastructure/persistence/in-memory/immediate-unit-of-work';
import { InMemoryAccountRepository } from '@/infrastructure/persistence/in-memory/in-memory-account-repository';
import { InMemoryBudgetAllocationRepository } from '@/infrastructure/persistence/in-memory/in-memory-budget-allocation-repository';
import { InMemoryCategoryGroupRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-group-repository';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';
import { InMemoryCategoryTargetRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-target-repository';
import { InMemoryTransactionRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-repository';

class FixedClock implements Clock {
  now() {
    return { instant: '2026-08-18T12:00:00.000Z', date: '2026-08-18' };
  }
}

class SequenceIdGenerator implements IdGenerator {
  private index = 0;

  constructor(private readonly ids: readonly string[]) {}

  next(): string {
    const id = this.ids[this.index++];
    if (!id) throw new Error('No test ID configured.');
    return id;
  }
}

describe('accounts, transactions and budget integration', () => {
  it('derives balances and budget values from the same financial facts', async () => {
    const accounts = new InMemoryAccountRepository();
    const groups = new InMemoryCategoryGroupRepository();
    const categories = new InMemoryCategoryRepository();
    const transactions = new InMemoryTransactionRepository();
    const allocations = new InMemoryBudgetAllocationRepository();
    const unitOfWork = new ImmediateUnitOfWork();
    const clock = new FixedClock();
    const ids = new SequenceIdGenerator([
      'account-1',
      'opening-1',
      'group-1',
      'category-1',
      'allocation-1',
      'expense-1',
      'target-1',
    ]);
    const account = await new CreateAccount(
      accounts,
      transactions,
      unitOfWork,
      ids,
      clock,
    ).execute({
      name: 'imagin',
      type: 'checking',
      onBudget: true,
      openingBalanceCents: 200_000,
    });
    const group = await new CreateCategoryGroup(
      groups,
      unitOfWork,
      ids,
      clock,
    ).execute('Needs');
    const category = await new CreateCategory(
      groups,
      categories,
      unitOfWork,
      ids,
      clock,
    ).execute({ groupId: group.id, name: 'Groceries' });
    const getBudget = new GetBudgetMonth(
      accounts,
      groups,
      categories,
      transactions,
      allocations,
    );
    await new AssignBudget(
      categories,
      allocations,
      getBudget,
      unitOfWork,
      ids,
      clock,
    ).execute({
      categoryId: category.id,
      month: '2026-08',
      amountCents: 40_000,
    });
    await new CreateTransaction(
      accounts,
      categories,
      transactions,
      unitOfWork,
      ids,
      clock,
    ).execute({
      kind: 'expense',
      accountId: account.id,
      categoryId: category.id,
      amountCents: 6_000,
      payee: 'Mercadona',
      date: '2026-08-18',
      status: 'cleared',
    });

    const accountsOverview = await new GetAccounts(
      accounts,
      transactions,
    ).execute();
    const budget = await getBudget.execute('2026-08');
    const values = budget.groups[0]?.categories[0];
    const targets = new InMemoryCategoryTargetRepository();
    const beforeTarget = await getBudget.execute('2026-08');
    await new SetCategoryTarget(
      categories,
      targets,
      unitOfWork,
      ids,
      clock,
    ).execute({
      categoryId: category.id,
      kind: 'monthly',
      amountCents: 50_000,
      dayOfMonth: 0,
      fundingMode: 'refill_up_to',
    });
    const afterTarget = await getBudget.execute('2026-08');

    expect(accountsOverview.accounts[0]?.balance).toEqual(
      Money.fromCents(194_000),
    );
    expect(budget.readyToAssign).toEqual(Money.fromCents(160_000));
    expect(values).toEqual(
      expect.objectContaining({
        assigned: Money.fromCents(40_000),
        activity: Money.fromCents(-6_000),
        available: Money.fromCents(34_000),
      }),
    );
    expect(afterTarget).toEqual(beforeTarget);
  });
});
