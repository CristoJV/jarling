import type { GetTransactionsInput } from '@/application/use-cases/transactions/get-transactions';
import type { TransactionStatus } from '@/domain/entities/transaction';
import type { TransactionDateFilter } from '@/presentation/utils/transaction-date-filter';

export type TransactionSearchField = 'search' | 'payee' | 'memo';

export type AppliedTransactionSearch = Readonly<{
  field: TransactionSearchField;
  value: string;
}>;

export type TransactionQuery = Readonly<{
  searches: readonly AppliedTransactionSearch[];
  accountId?: string;
  categoryId?: string;
  status?: TransactionStatus;
  uncategorized?: boolean;
  dateFilter?: TransactionDateFilter;
}>;

export type TransactionFilterKey =
  | TransactionSearchField
  | 'account'
  | 'category'
  | 'status'
  | 'uncategorized'
  | 'date';

export type TransactionFilterChip = Readonly<{
  key: TransactionFilterKey;
  label: string;
}>;

export function buildTransactionQuery(
  query: TransactionQuery,
): GetTransactionsInput {
  return {
    ...Object.fromEntries(
      query.searches.map(({ field, value }) => [field, value]),
    ),
    ...(query.accountId ? { accountId: query.accountId } : {}),
    ...(query.categoryId ? { categoryId: query.categoryId } : {}),
    ...(query.status ? { status: query.status } : {}),
    ...(query.uncategorized ? { uncategorized: true } : {}),
    ...(query.dateFilter?.dateFrom
      ? { dateFrom: query.dateFilter.dateFrom }
      : {}),
    ...(query.dateFilter?.dateTo ? { dateTo: query.dateFilter.dateTo } : {}),
  };
}

export function upsertTransactionSearch(
  current: readonly AppliedTransactionSearch[],
  next: AppliedTransactionSearch,
): readonly AppliedTransactionSearch[] {
  return [...current.filter(({ field }) => field !== next.field), next];
}
