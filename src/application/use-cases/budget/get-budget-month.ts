import { assertValidBudgetMonth } from '@/domain/entities/budget-allocation';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { BudgetAllocationRepository } from '@/domain/repositories/budget-allocation-repository';
import type { CategoryGroupRepository } from '@/domain/repositories/category-group-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import {
  calculateBudgetMonth,
  type BudgetMonthValues,
} from '@/domain/services/calculate-budget-month';

export class GetBudgetMonth {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly groups: CategoryGroupRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly allocations: BudgetAllocationRepository,
  ) {}

  async execute(month: string): Promise<BudgetMonthValues> {
    assertValidBudgetMonth(month);
    const [accounts, groups, categories, transactions, allocations] =
      await Promise.all([
        this.accounts.findAll(),
        this.groups.findAll(),
        this.categories.findAll(),
        this.transactions.findAll(),
        this.allocations.findAll(),
      ]);

    return calculateBudgetMonth({
      month,
      accounts,
      groups,
      categories,
      transactions,
      allocations,
    });
  }
}
