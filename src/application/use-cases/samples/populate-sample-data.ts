import type { Clock } from '@/application/ports/clock';
import type { UnitOfWork } from '@/application/ports/unit-of-work';
import { createAccount } from '@/domain/entities/account';
import { createBudgetAllocation } from '@/domain/entities/budget-allocation';
import { createCategoryTarget } from '@/domain/entities/category-target';
import { createTransaction } from '@/domain/entities/transaction';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { BudgetAllocationRepository } from '@/domain/repositories/budget-allocation-repository';
import type { CategoryGroupRepository } from '@/domain/repositories/category-group-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type { CategoryTargetRepository } from '@/domain/repositories/category-target-repository';
import type { TransactionRepository } from '@/domain/repositories/transaction-repository';
import { Money } from '@/domain/value-objects/money';

const SAMPLE_IDS = {
  account: 'sample-account-imagin',
  rent: 'default-category-rent-mortgage',
  groceries: 'default-category-groceries',
  transportation: 'default-category-transportation',
  phone: 'default-category-phone-internet',
  utilities: 'default-category-utilities',
  opening: 'sample-transaction-opening',
  groceriesExpense: 'sample-transaction-groceries',
  transportationExpense: 'sample-transaction-transportation',
  rentTarget: 'sample-target-rent',
  groceriesTarget: 'sample-target-groceries',
  utilitiesTarget: 'sample-target-utilities',
  phoneTarget: 'sample-target-phone',
} as const;

export type PopulateSampleDataResult = Readonly<{
  populated: boolean;
  month: string;
}>;

export class PopulateSampleData {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly groups: CategoryGroupRepository,
    private readonly categories: CategoryRepository,
    private readonly transactions: TransactionRepository,
    private readonly allocations: BudgetAllocationRepository,
    private readonly targets: CategoryTargetRepository,
    private readonly unitOfWork: UnitOfWork,
    private readonly clock: Clock,
  ) {}

  execute(): Promise<PopulateSampleDataResult> {
    return this.unitOfWork.run(async () => {
      const { instant, date } = this.clock.now();
      const month = date.slice(0, 7);

      if (await this.accounts.findById(SAMPLE_IDS.account)) {
        return { populated: false, month };
      }

      const requiredGroupIds = ['default-group-bills', 'default-group-needs'];
      const existingGroups = new Set(
        (await this.groups.findAll()).map(({ id }) => id),
      );
      const requiredCategoryIds = [
        SAMPLE_IDS.rent,
        SAMPLE_IDS.groceries,
        SAMPLE_IDS.transportation,
        SAMPLE_IDS.utilities,
        SAMPLE_IDS.phone,
      ];
      const existingCategories = new Set(
        (await this.categories.findAll()).map(({ id }) => id),
      );
      if (
        requiredGroupIds.some((id) => !existingGroups.has(id)) ||
        requiredCategoryIds.some((id) => !existingCategories.has(id))
      ) {
        throw new Error('Default categories must be created before demo data.');
      }
      const account = createAccount({
        id: SAMPLE_IDS.account,
        name: 'imagin (example)',
        type: 'checking',
        onBudget: true,
        createdAt: instant,
        updatedAt: instant,
      });
      const transactions = [
        createTransaction({
          id: SAMPLE_IDS.opening,
          accountId: account.id,
          payee: 'Opening Balance',
          amount: Money.fromCents(200_000),
          date: `${month}-01`,
          status: 'cleared',
          createdAt: instant,
          updatedAt: instant,
        }),
        createTransaction({
          id: SAMPLE_IDS.groceriesExpense,
          accountId: account.id,
          categoryId: SAMPLE_IDS.groceries,
          payee: 'Mercadona',
          amount: Money.fromCents(-6_000),
          date,
          status: 'cleared',
          createdAt: instant,
          updatedAt: instant,
        }),
        createTransaction({
          id: SAMPLE_IDS.transportationExpense,
          accountId: account.id,
          categoryId: SAMPLE_IDS.transportation,
          payee: 'Fuel station',
          amount: Money.fromCents(-17_000),
          date,
          status: 'cleared',
          createdAt: instant,
          updatedAt: instant,
        }),
      ];
      const assigned = [
        [SAMPLE_IDS.rent, 95_000],
        [SAMPLE_IDS.groceries, 40_000],
        [SAMPLE_IDS.transportation, 15_000],
        [SAMPLE_IDS.utilities, 49_000],
        [SAMPLE_IDS.phone, 1_000],
      ] as const;
      const targets = [
        createCategoryTarget({
          id: SAMPLE_IDS.rentTarget,
          categoryId: SAMPLE_IDS.rent,
          kind: 'monthly',
          amount: Money.fromCents(95_000),
          dayOfMonth: 0,
          fundingMode: 'refill_up_to',
          createdAt: instant,
          updatedAt: instant,
        }),
        createCategoryTarget({
          id: SAMPLE_IDS.groceriesTarget,
          categoryId: SAMPLE_IDS.groceries,
          kind: 'weekly',
          amount: Money.fromCents(10_000),
          dayOfWeek: 6,
          fundingMode: 'set_aside',
          createdAt: instant,
          updatedAt: instant,
        }),
        createCategoryTarget({
          id: SAMPLE_IDS.phoneTarget,
          categoryId: SAMPLE_IDS.phone,
          kind: 'monthly',
          amount: Money.fromCents(3_500),
          dayOfMonth: 0,
          fundingMode: 'set_aside',
          createdAt: instant,
          updatedAt: instant,
        }),
        createCategoryTarget({
          id: SAMPLE_IDS.utilitiesTarget,
          categoryId: SAMPLE_IDS.utilities,
          kind: 'yearly',
          amount: Money.fromCents(80_000),
          targetDate: `${date.slice(0, 4)}-12-31`,
          fundingMode: 'set_aside',
          createdAt: instant,
          updatedAt: instant,
        }),
      ];

      await this.accounts.save(account);
      for (const transaction of transactions)
        await this.transactions.save(transaction);
      for (const target of targets) await this.targets.save(target);
      for (const [categoryId, amountCents] of assigned) {
        await this.allocations.save(
          createBudgetAllocation({
            id: `sample-allocation-${categoryId}`,
            categoryId,
            month,
            amount: Money.fromCents(amountCents),
            createdAt: instant,
            updatedAt: instant,
          }),
        );
      }

      return { populated: true, month };
    });
  }
}
