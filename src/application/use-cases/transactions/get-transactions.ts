import type { Transaction } from '@/domain/entities/transaction';
import type { AccountRepository } from '@/domain/repositories/account-repository';
import type { CategoryRepository } from '@/domain/repositories/category-repository';
import type {
  TransactionFilters,
  TransactionRepository,
} from '@/domain/repositories/transaction-repository';

export type GetTransactionsInput = Pick<
  TransactionFilters,
  | 'accountId'
  | 'categoryId'
  | 'uncategorized'
  | 'search'
  | 'payee'
  | 'memo'
  | 'status'
  | 'dateFrom'
  | 'dateTo'
  | 'transactionGroupId'
  | 'limit'
  | 'before'
>;

export type TransactionSummary = Readonly<{
  transaction: Transaction;
  accountName: string;
  categoryName?: string;
}>;

export class GetTransactions {
  constructor(
    private readonly transactions: TransactionRepository,
    private readonly accounts: AccountRepository,
    private readonly categories: CategoryRepository,
  ) {}

  async execute(
    input: GetTransactionsInput = {},
  ): Promise<readonly TransactionSummary[]> {
    const [transactions, accounts, categories] = await Promise.all([
      this.transactions.findAll(input),
      this.accounts.findAll(),
      this.categories.findAll(),
    ]);
    const accountNames = new Map(
      accounts.map((account) => [account.id, account.name]),
    );
    const categoryNames = new Map(
      categories.map((category) => [category.id, category.name]),
    );

    return transactions.map((transaction) => ({
      transaction,
      accountName: accountNames.get(transaction.accountId) ?? 'Unknown account',
      ...(transaction.categoryId
        ? {
            categoryName:
              categoryNames.get(transaction.categoryId) ?? 'Unknown category',
          }
        : {}),
    }));
  }
}
