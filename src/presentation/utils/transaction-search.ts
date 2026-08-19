export type TransactionSearchField = 'search' | 'payee' | 'memo';

export type AppliedTransactionSearch = Readonly<{
  field: TransactionSearchField;
  value: string;
}>;

export function upsertTransactionSearch(
  current: readonly AppliedTransactionSearch[],
  next: AppliedTransactionSearch,
): readonly AppliedTransactionSearch[] {
  return [...current.filter(({ field }) => field !== next.field), next];
}
