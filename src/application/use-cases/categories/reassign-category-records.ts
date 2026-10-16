import type { BudgetAllocationRepository } from '@/domain/repositories/budget-allocation-repository';
import type { BudgetAllocationMovementRepository } from '@/domain/repositories/budget-allocation-movement-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { CategoryTargetRepository } from '@/domain/repositories/category-target-repository';
import type { CategoryTargetSnoozeRepository } from '@/domain/repositories/category-target-snooze-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';

type ReassignCategoryRecordsInput = Readonly<{
  sourceCategoryId: string;
  destinationCategoryId: string;
  updatedAt: string;
}>;

type ReassignCategoryRecordsDependencies = Readonly<{
  categories: CategoryRepository;
  transactions: TransactionRepository;
  allocations: BudgetAllocationRepository;
  movements: BudgetAllocationMovementRepository;
  targets: CategoryTargetRepository;
  snoozes: CategoryTargetSnoozeRepository;
}>;

/** Must run inside the caller's UnitOfWork. */
export async function reassignCategoryRecords(
  input: ReassignCategoryRecordsInput,
  dependencies: ReassignCategoryRecordsDependencies,
): Promise<void> {
  await dependencies.transactions.reassignCategory(
    input.sourceCategoryId,
    input.destinationCategoryId,
    input.updatedAt,
  );
  await dependencies.allocations.reassignCategory(
    input.sourceCategoryId,
    input.destinationCategoryId,
    input.updatedAt,
  );
  await dependencies.movements.replaceCategory(
    input.sourceCategoryId,
    input.destinationCategoryId,
  );
  await dependencies.snoozes.deleteByCategory(input.sourceCategoryId);
  await dependencies.targets.deleteByCategory(input.sourceCategoryId);
  await dependencies.categories.deleteById(input.sourceCategoryId);
}
