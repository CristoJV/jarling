import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { CategoryGroupRepository } from '@/domain/repositories/category-group-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import {
  calculateReports,
  type ReportsSnapshot,
} from '@/domain/services/calculate-reports';
import type { SpendingIntervalUnit } from '@/domain/services/calculate-spending-report';

export type GetReportsInput = Readonly<{
  throughDate: string;
  spendingInterval: SpendingIntervalUnit;
  spendingIntervalCount: number;
}>;

export class GetReports {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly groups: CategoryGroupRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
  ) {}

  async execute(input: GetReportsInput): Promise<ReportsSnapshot> {
    const [accounts, groups, categories, transactions] = await Promise.all([
      this.accounts.findAll(),
      this.groups.findAll(),
      this.categories.findAll(),
      this.transactions.findAll({ dateTo: input.throughDate }),
    ]);
    return calculateReports({
      throughDate: input.throughDate,
      spendingInterval: input.spendingInterval,
      spendingIntervalCount: input.spendingIntervalCount,
      accounts,
      groups,
      categories,
      transactions,
    });
  }
}
