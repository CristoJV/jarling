import type { BudgetAllocationRepository } from '@/domain/repositories/budget-allocation-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import { CategoryNotFoundError } from '@/domain/errors/category-not-found-error';
import { Money } from '@/domain/value-objects/money';

export type CategoryDeletionImpact = Readonly<{
  transactionCount: number;
  assigned: Money;
  available: Money;
  requiresReassignment: boolean;
  hasMoney: boolean;
}>;

export class GetCategoryDeletionImpact {
  constructor(
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly allocations: BudgetAllocationRepository,
  ) {}

  async execute(categoryId: string): Promise<CategoryDeletionImpact> {
    if (!(await this.categories.findById(categoryId))) {
      throw new CategoryNotFoundError(categoryId);
    }
    const [transactions, allocations] = await Promise.all([
      this.transactions.findAll({ categoryId }),
      this.allocations.findByCategory(categoryId),
    ]);
    const assignedCents = allocations.reduce(
      (total, allocation) => total + allocation.amount.cents,
      0,
    );
    const availableCents =
      assignedCents +
      transactions.reduce(
        (total, transaction) => total + transaction.amount.cents,
        0,
      );

    return {
      transactionCount: transactions.length,
      assigned: Money.fromCents(assignedCents),
      available: Money.fromCents(availableCents),
      requiresReassignment: transactions.length > 0,
      hasMoney: assignedCents !== 0 || availableCents !== 0,
    };
  }
}
