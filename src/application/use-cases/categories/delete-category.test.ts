import type { Clock } from '@/application/ports/clock';
import type { IdGenerator } from '@/application/ports/id-generator';
import type { BudgetAllocation } from '@/domain/entities/budget-allocation';
import type { Category } from '@/domain/entities/category';
import type { Transaction } from '@/domain/entities/transaction';
import { CategoryReassignmentRequiredError } from '@/domain/errors/category-reassignment-required-error';
import { InvalidCategoryReassignmentError } from '@/domain/errors/invalid-category-reassignment-error';
import { ProtectedCategoryError } from '@/domain/errors/protected-category-error';
import { Money } from '@/domain/value-objects/money';
import { InMemoryBudgetAllocationRepository } from '@/infrastructure/persistence/in-memory/in-memory-budget-allocation-repository';
import { InMemoryCategoryRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-repository';
import { InMemoryCategoryGroupRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-group-repository';
import { InMemoryCategoryTargetRepository } from '@/infrastructure/persistence/in-memory/in-memory-category-target-repository';
import { InMemoryTransactionRepository } from '@/infrastructure/persistence/in-memory/in-memory-transaction-repository';
import { ImmediateUnitOfWork } from '@/infrastructure/persistence/in-memory/immediate-unit-of-work';

import { DeleteCategory } from './delete-category';
import { CreateCategoryReplacement } from './create-category-replacement';
import { GetCategoryDeletionImpact } from './get-category-deletion-impact';

const instant = '2026-08-25T10:00:00.000Z';

class FixedClock implements Clock {
  now() {
    return { instant, date: '2026-08-25' };
  }
}

class FixedId implements IdGenerator {
  next() {
    return 'created-destination';
  }
}

function category(id: string, name: string): Category {
  return {
    id,
    groupId: 'group-1',
    name,
    hidden: false,
    sortOrder: 0,
    createdAt: instant,
    updatedAt: instant,
  };
}

function allocation(
  id: string,
  categoryId: string,
  month: string,
  amountCents: number,
): BudgetAllocation {
  return {
    id,
    categoryId,
    month,
    amount: Money.fromCents(amountCents),
    createdAt: instant,
    updatedAt: instant,
  };
}

function expense(
  id: string,
  categoryId: string,
  amountCents: number,
): Transaction {
  return {
    id,
    accountId: 'account-1',
    categoryId,
    payee: 'Shop',
    amount: Money.fromCents(amountCents),
    date: '2026-08-20',
    status: 'cleared',
    kind: 'standard',
    createdAt: instant,
    updatedAt: instant,
  };
}

function setup() {
  const categories = new InMemoryCategoryRepository();
  const groups = new InMemoryCategoryGroupRepository();
  const transactions = new InMemoryTransactionRepository();
  const allocations = new InMemoryBudgetAllocationRepository();
  const targets = new InMemoryCategoryTargetRepository();
  const remove = new DeleteCategory(
    categories,
    transactions,
    allocations,
    targets,
    new ImmediateUnitOfWork(),
    new FixedClock(),
  );
  const impact = new GetCategoryDeletionImpact(
    categories,
    transactions,
    allocations,
  );
  const createReplacement = new CreateCategoryReplacement(
    groups,
    categories,
    transactions,
    allocations,
    targets,
    new ImmediateUnitOfWork(),
    new FixedId(),
    new FixedClock(),
  );
  return {
    allocations,
    categories,
    createReplacement,
    groups,
    impact,
    remove,
    targets,
    transactions,
  };
}

describe('category deletion', () => {
  it('reports an empty category and deletes it without a replacement', async () => {
    const { categories, impact, remove } = setup();
    await categories.save(category('source', 'Old'));

    await expect(impact.execute('source')).resolves.toEqual({
      transactionCount: 0,
      assigned: Money.zero(),
      available: Money.zero(),
      requiresReassignment: false,
      hasMoney: false,
    });
    await remove.execute({ categoryId: 'source' });

    await expect(categories.findById('source')).resolves.toBeNull();
  });

  it('returns money to Ready to Assign by removing allocations when there is no activity', async () => {
    const { allocations, categories, impact, remove } = setup();
    await categories.save(category('source', 'Old'));
    await allocations.save(
      allocation('allocation-1', 'source', '2026-08', 30_000),
    );

    await expect(impact.execute('source')).resolves.toEqual(
      expect.objectContaining({
        transactionCount: 0,
        assigned: Money.fromCents(30_000),
        available: Money.fromCents(30_000),
        hasMoney: true,
      }),
    );
    await remove.execute({ categoryId: 'source' });

    await expect(allocations.findByCategory('source')).resolves.toEqual([]);
    await expect(categories.findById('source')).resolves.toBeNull();
  });

  it('requires a destination whenever past transactions exist', async () => {
    const { categories, remove, transactions } = setup();
    await categories.save(category('source', 'Old'));
    await transactions.save(expense('transaction-1', 'source', -2_000));

    await expect(remove.execute({ categoryId: 'source' })).rejects.toThrow(
      CategoryReassignmentRequiredError,
    );
    await expect(categories.findById('source')).resolves.not.toBeNull();
    await expect(transactions.findById('transaction-1')).resolves.toEqual(
      expect.objectContaining({ categoryId: 'source' }),
    );
  });

  it('reassigns every transaction and merges allocation history before deleting', async () => {
    const { allocations, categories, remove, transactions } = setup();
    await categories.save(category('source', 'Old'));
    await categories.save(category('destination', 'New'));
    await transactions.save(expense('transaction-1', 'source', -2_000));
    await allocations.save(
      allocation('source-aug', 'source', '2026-08', 30_000),
    );
    await allocations.save(
      allocation('source-sep', 'source', '2026-09', 10_000),
    );
    await allocations.save(
      allocation('destination-aug', 'destination', '2026-08', 5_000),
    );

    await remove.execute({
      categoryId: 'source',
      replacementCategoryId: 'destination',
    });

    await expect(categories.findById('source')).resolves.toBeNull();
    await expect(transactions.findById('transaction-1')).resolves.toEqual(
      expect.objectContaining({ categoryId: 'destination' }),
    );
    await expect(allocations.findByCategory('source')).resolves.toEqual([]);
    await expect(allocations.findByCategory('destination')).resolves.toEqual([
      expect.objectContaining({
        id: 'destination-aug',
        month: '2026-08',
        amount: Money.fromCents(35_000),
      }),
      expect.objectContaining({
        id: 'source-sep',
        month: '2026-09',
        amount: Money.fromCents(10_000),
      }),
    ]);
  });

  it('creates a new destination and completes reassignment in the same use case', async () => {
    const { allocations, categories, createReplacement, groups, transactions } =
      setup();
    await groups.save({
      id: 'group-1',
      name: 'Bills',
      sortOrder: 0,
      createdAt: instant,
      updatedAt: instant,
    });
    await categories.save(category('source', 'Old'));
    await transactions.save(expense('transaction-1', 'source', -2_000));
    await allocations.save(
      allocation('source-aug', 'source', '2026-08', 30_000),
    );

    await expect(
      createReplacement.execute({
        sourceCategoryId: 'source',
        groupId: 'group-1',
        name: 'Replacement',
      }),
    ).resolves.toEqual(
      expect.objectContaining({
        id: 'created-destination',
        name: 'Replacement',
      }),
    );
    await expect(categories.findById('source')).resolves.toBeNull();
    await expect(
      categories.findById('created-destination'),
    ).resolves.not.toBeNull();
    await expect(transactions.findById('transaction-1')).resolves.toEqual(
      expect.objectContaining({ categoryId: 'created-destination' }),
    );
    await expect(
      allocations.findByCategory('created-destination'),
    ).resolves.toEqual([
      expect.objectContaining({ amount: Money.fromCents(30_000) }),
    ]);
  });

  it('rejects the source and linked payment categories as destinations', async () => {
    const { categories, remove, transactions } = setup();
    await categories.save(category('source', 'Old'));
    await categories.save({
      ...category('linked', 'Card payment'),
      linkedAccountId: 'account-1',
    });
    await transactions.save(expense('transaction-1', 'source', -2_000));

    await expect(
      remove.execute({
        categoryId: 'source',
        replacementCategoryId: 'source',
      }),
    ).rejects.toThrow(InvalidCategoryReassignmentError);
    await expect(
      remove.execute({
        categoryId: 'source',
        replacementCategoryId: 'linked',
      }),
    ).rejects.toThrow(InvalidCategoryReassignmentError);
  });

  it('never deletes linked payment categories', async () => {
    const { categories, remove } = setup();
    await categories.save({
      ...category('linked', 'Card payment'),
      linkedAccountId: 'account-1',
    });

    await expect(remove.execute({ categoryId: 'linked' })).rejects.toThrow(
      ProtectedCategoryError,
    );
  });
});
