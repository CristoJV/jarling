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
        ...createHistoricalSampleTransactions(account.id, month, instant),
        createTransaction({
          id: SAMPLE_IDS.opening,
          accountId: account.id,
          payee: 'Opening Balance',
          amount: Money.fromCents(200_000),
          date: `${month}-01`,
          status: 'cleared',
          kind: 'opening_balance',
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
          startsOn: date,
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
          startsOn: date,
          dayOfWeek: 6,
          includePreviousWeeks: false,
          fundingMode: 'set_aside',
          createdAt: instant,
          updatedAt: instant,
        }),
        createCategoryTarget({
          id: SAMPLE_IDS.phoneTarget,
          categoryId: SAMPLE_IDS.phone,
          kind: 'monthly',
          amount: Money.fromCents(3_500),
          startsOn: date,
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
          startsOn: date,
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
      for (const allocation of createHistoricalSampleAllocations(
        month,
        instant,
      )) {
        await this.allocations.save(allocation);
      }
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

type HistoricalExpense = readonly [
  categoryId: string,
  payee: string,
  day: number,
  amountCents: number,
];

const HISTORICAL_EXPENSES: readonly (readonly HistoricalExpense[])[] = [
  [
    [SAMPLE_IDS.rent, 'Example landlord', 3, 12_000],
    [SAMPLE_IDS.groceries, 'Local market', 10, 1_500],
    [SAMPLE_IDS.groceries, 'Supermarket', 24, 2_200],
    [SAMPLE_IDS.phone, 'Mobile provider', 18, 900],
  ],
  [
    [SAMPLE_IDS.groceries, 'Local market', 4, 1_800],
    [SAMPLE_IDS.groceries, 'Supermarket', 19, 2_600],
    [SAMPLE_IDS.transportation, 'Train pass', 11, 3_500],
    [SAMPLE_IDS.utilities, 'Electricity', 26, 1_700],
  ],
  [
    [SAMPLE_IDS.rent, 'Example landlord', 2, 18_000],
    [SAMPLE_IDS.groceries, 'Local market', 8, 2_100],
    [SAMPLE_IDS.groceries, 'Supermarket', 22, 3_300],
    [SAMPLE_IDS.transportation, 'Fuel station', 15, 2_200],
    [SAMPLE_IDS.phone, 'Mobile provider', 19, 1_100],
    [SAMPLE_IDS.utilities, 'Electricity', 27, 4_200],
  ],
  [
    [SAMPLE_IDS.groceries, 'Local market', 5, 1_700],
    [SAMPLE_IDS.groceries, 'Supermarket', 20, 2_800],
    [SAMPLE_IDS.transportation, 'Car service', 12, 6_500],
  ],
  [
    [SAMPLE_IDS.rent, 'Example landlord', 1, 14_000],
    [SAMPLE_IDS.groceries, 'Local market', 7, 2_600],
    [SAMPLE_IDS.groceries, 'Supermarket', 23, 4_100],
    [SAMPLE_IDS.transportation, 'Fuel station', 14, 3_800],
    [SAMPLE_IDS.phone, 'Mobile provider', 18, 950],
    [SAMPLE_IDS.utilities, 'Water', 26, 2_300],
  ],
] as const;

function createHistoricalSampleTransactions(
  accountId: string,
  currentMonth: string,
  instant: string,
) {
  return HISTORICAL_EXPENSES.flatMap((expenses, monthIndex) => {
    const month = shiftMonth(currentMonth, monthIndex - 5);
    const expenseTransactions = expenses.map(
      ([categoryId, payee, day, amountCents], expenseIndex) =>
        createTransaction({
          id: `sample-transaction-history-${monthIndex}-${expenseIndex}`,
          accountId,
          categoryId,
          payee,
          amount: Money.fromCents(-amountCents),
          date: `${month}-${String(day).padStart(2, '0')}`,
          status: 'cleared',
          createdAt: instant,
          updatedAt: instant,
        }),
    );
    const totalExpenses = expenses.reduce(
      (total, expense) => total + expense[3],
      0,
    );
    return [
      createTransaction({
        id: `sample-transaction-income-${monthIndex}`,
        accountId,
        payee: 'Example salary',
        amount: Money.fromCents(totalExpenses),
        date: `${month}-01`,
        status: 'cleared',
        createdAt: instant,
        updatedAt: instant,
      }),
      ...expenseTransactions,
    ];
  });
}

function createHistoricalSampleAllocations(
  currentMonth: string,
  instant: string,
) {
  return HISTORICAL_EXPENSES.flatMap((expenses, monthIndex) => {
    const month = shiftMonth(currentMonth, monthIndex - 5);
    const totalsByCategory = new Map<string, number>();
    for (const [categoryId, , , amountCents] of expenses) {
      totalsByCategory.set(
        categoryId,
        (totalsByCategory.get(categoryId) ?? 0) + amountCents,
      );
    }
    return [...totalsByCategory].map(([categoryId, amountCents]) =>
      createBudgetAllocation({
        id: `sample-allocation-history-${monthIndex}-${categoryId}`,
        categoryId,
        month,
        amount: Money.fromCents(amountCents),
        createdAt: instant,
        updatedAt: instant,
      }),
    );
  });
}

function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year!, monthNumber! - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}
