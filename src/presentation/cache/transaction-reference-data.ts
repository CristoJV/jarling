import type { ApplicationServices } from '@/application/application-services';
import type { AccountsOverview } from '@/application/use-cases/accounts/get-accounts';
import type { CategoryGroupSummary } from '@/application/use-cases/categories/get-category-groups';
import type { Tag } from '@/domain/entities/tag';

export type TransactionReferenceData = Readonly<{
  accounts: AccountsOverview;
  categoryGroups: readonly CategoryGroupSummary[];
  payees: readonly string[];
  tags: readonly Tag[];
  recentTags: readonly Tag[];
}>;

let cached:
  | Readonly<{
      application: ApplicationServices;
      promise: Promise<TransactionReferenceData>;
    }>
  | undefined;

export function getTransactionReferenceData(
  application: ApplicationServices,
): Promise<TransactionReferenceData> {
  if (cached?.application === application) return cached.promise;
  const promise = Promise.all([
    application.accounts.getAll.execute(),
    application.categories.getGroups.execute(),
    application.transactions.getPayees.execute(),
    application.transactions.getTags.execute(),
  ]).then(([accounts, categoryGroups, payees, tagData]) => ({
    accounts,
    categoryGroups,
    payees,
    tags: tagData.all,
    recentTags: tagData.recent,
  }));
  cached = { application, promise };
  void promise.catch(() => {
    if (cached?.promise === promise) cached = undefined;
  });
  return promise;
}

export function invalidateTransactionReferenceData(): void {
  cached = undefined;
}

export function prefetchTransactionReferenceData(
  application: ApplicationServices,
): () => void {
  const schedule = globalThis.requestIdleCallback;
  if (schedule) {
    const handle = schedule(
      () => void getTransactionReferenceData(application),
      { timeout: 500 },
    );
    return () => globalThis.cancelIdleCallback(handle);
  }
  const handle = setTimeout(
    () => void getTransactionReferenceData(application),
    0,
  );
  return () => clearTimeout(handle);
}
