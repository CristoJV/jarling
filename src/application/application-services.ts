import type { CloseAccount } from '@/application/use-cases/accounts/close-account';
import type { CreateAccount } from '@/application/use-cases/accounts/create-account';
import type { GetAccounts } from '@/application/use-cases/accounts/get-accounts';
import type { GetReconciliation } from '@/application/use-cases/accounts/get-reconciliation';
import type { ReconcileAccount } from '@/application/use-cases/accounts/reconcile-account';
import type { CreateCategoryGroup } from '@/application/use-cases/categories/create-category-group';
import type { CreateCategory } from '@/application/use-cases/categories/create-category';
import type { EnsureDefaultCategories } from '@/application/use-cases/categories/ensure-default-categories';
import type { GetCategoryGroups } from '@/application/use-cases/categories/get-category-groups';
import type { RenameCategoryGroup } from '@/application/use-cases/categories/rename-category-group';
import type { RenameCategory } from '@/application/use-cases/categories/rename-category';
import type { ReorderCategories } from '@/application/use-cases/categories/reorder-categories';
import type { ReorderCategoryGroups } from '@/application/use-cases/categories/reorder-category-groups';
import type { SetCategoryHidden } from '@/application/use-cases/categories/set-category-hidden';
import type { AssignBudget } from '@/application/use-cases/budget/assign-budget';
import type { GetBudgetMonth } from '@/application/use-cases/budget/get-budget-month';
import type { MoveBudgetBetweenCategories } from '@/application/use-cases/budget/move-budget-between-categories';
import type { CreateTransaction } from '@/application/use-cases/transactions/create-transaction';
import type { DeleteTransaction } from '@/application/use-cases/transactions/delete-transaction';
import type { GetTransactions } from '@/application/use-cases/transactions/get-transactions';
import type { GetTransaction } from '@/application/use-cases/transactions/get-transaction';
import type { GetPayees } from '@/application/use-cases/transactions/get-payees';
import type { UpdateTransaction } from '@/application/use-cases/transactions/update-transaction';
import type { CreateTransactionLink } from '@/application/use-cases/transactions/create-transaction-link';
import type { DeleteTransactionLink } from '@/application/use-cases/transactions/delete-transaction-link';
import type { GetTransactionLinks } from '@/application/use-cases/transactions/get-transaction-links';
import type { PopulateSampleData } from '@/application/use-cases/samples/populate-sample-data';
import type { DeleteCategoryTarget } from '@/application/use-cases/targets/delete-category-target';
import type { GetCategoryTargets } from '@/application/use-cases/targets/get-category-targets';
import type { SetCategoryTarget } from '@/application/use-cases/targets/set-category-target';
import type { CreateTransfer } from '@/application/use-cases/transfers/create-transfer';
import type { UpdateTransfer } from '@/application/use-cases/transfers/update-transfer';
import type { GetReports } from '@/application/use-cases/reports/get-reports';
import type { DeletePlan } from '@/application/use-cases/plan/delete-plan';
import type { PlanPortability } from '@/application/ports/plan-portability';

export type ApplicationServices = Readonly<{
  accounts: Readonly<{
    create: Pick<CreateAccount, 'execute'>;
    getAll: Pick<GetAccounts, 'execute'>;
    close: Pick<CloseAccount, 'execute'>;
    getReconciliation: Pick<GetReconciliation, 'execute'>;
    reconcile: Pick<ReconcileAccount, 'execute'>;
  }>;
  categories: Readonly<{
    ensureDefaults: Pick<EnsureDefaultCategories, 'execute'>;
    createGroup: Pick<CreateCategoryGroup, 'execute'>;
    create: Pick<CreateCategory, 'execute'>;
    getGroups: Pick<GetCategoryGroups, 'execute'>;
    renameGroup: Pick<RenameCategoryGroup, 'execute'>;
    rename: Pick<RenameCategory, 'execute'>;
    reorderGroups: Pick<ReorderCategoryGroups, 'execute'>;
    reorder: Pick<ReorderCategories, 'execute'>;
    setHidden: Pick<SetCategoryHidden, 'execute'>;
  }>;
  transactions: Readonly<{
    create: Pick<CreateTransaction, 'execute'>;
    update: Pick<UpdateTransaction, 'execute'>;
    delete: Pick<DeleteTransaction, 'execute'>;
    getAll: Pick<GetTransactions, 'execute'>;
    getById: Pick<GetTransaction, 'execute'>;
    getPayees: Pick<GetPayees, 'execute'>;
    createLink: Pick<CreateTransactionLink, 'execute'>;
    getLinks: Pick<GetTransactionLinks, 'execute'>;
    deleteLink: Pick<DeleteTransactionLink, 'execute'>;
  }>;
  budget: Readonly<{
    getMonth: Pick<GetBudgetMonth, 'execute'>;
    assign: Pick<AssignBudget, 'execute'>;
    move: Pick<MoveBudgetBetweenCategories, 'execute'>;
  }>;
  targets: Readonly<{
    getAll: Pick<GetCategoryTargets, 'execute'>;
    set: Pick<SetCategoryTarget, 'execute'>;
    delete: Pick<DeleteCategoryTarget, 'execute'>;
  }>;
  transfers: Readonly<{
    create: Pick<CreateTransfer, 'execute'>;
    update: Pick<UpdateTransfer, 'execute'>;
  }>;
  reports: Readonly<{
    get: Pick<GetReports, 'execute'>;
  }>;
  samples: Readonly<{
    populate: Pick<PopulateSampleData, 'execute'>;
  }>;
  plan: Readonly<{
    delete: Pick<DeletePlan, 'execute'>;
  }>;
  planPortability: PlanPortability;
}>;
