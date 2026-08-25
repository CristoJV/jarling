import type { SQLiteDatabase } from 'expo-sqlite';

import type { ApplicationServices } from '@/application/application-services';
import { CloseAccount } from '@/application/use-cases/accounts/close-account';
import { CreateAccount } from '@/application/use-cases/accounts/create-account';
import { GetAccounts } from '@/application/use-cases/accounts/get-accounts';
import { GetAccountDetails } from '@/application/use-cases/accounts/get-account-details';
import { GetReconciliation } from '@/application/use-cases/accounts/get-reconciliation';
import { ReconcileAccount } from '@/application/use-cases/accounts/reconcile-account';
import { RenameAccount } from '@/application/use-cases/accounts/rename-account';
import { CreateCategoryGroup } from '@/application/use-cases/categories/create-category-group';
import { CreateCategory } from '@/application/use-cases/categories/create-category';
import { CreateCategoryReplacement } from '@/application/use-cases/categories/create-category-replacement';
import { DeleteCategory } from '@/application/use-cases/categories/delete-category';
import { EnsureDefaultCategories } from '@/application/use-cases/categories/ensure-default-categories';
import { GetCategoryDeletionImpact } from '@/application/use-cases/categories/get-category-deletion-impact';
import { GetCategoryGroups } from '@/application/use-cases/categories/get-category-groups';
import { GetCategoryDetails } from '@/application/use-cases/categories/get-category-details';
import { RenameCategoryGroup } from '@/application/use-cases/categories/rename-category-group';
import { RenameCategory } from '@/application/use-cases/categories/rename-category';
import { ReorderCategories } from '@/application/use-cases/categories/reorder-categories';
import { ReorderCategoryGroups } from '@/application/use-cases/categories/reorder-category-groups';
import { SetCategoryHidden } from '@/application/use-cases/categories/set-category-hidden';
import { UpdateCategoryNotes } from '@/application/use-cases/categories/update-category-notes';
import { AssignBudget } from '@/application/use-cases/budget/assign-budget';
import { GetBudgetMonth } from '@/application/use-cases/budget/get-budget-month';
import { MoveBudget } from '@/application/use-cases/budget/move-budget';
import { CreateTransaction } from '@/application/use-cases/transactions/create-transaction';
import { DeleteTransaction } from '@/application/use-cases/transactions/delete-transaction';
import { GetTransactions } from '@/application/use-cases/transactions/get-transactions';
import { GetTransaction } from '@/application/use-cases/transactions/get-transaction';
import { GetPayees } from '@/application/use-cases/transactions/get-payees';
import { UpdateTransaction } from '@/application/use-cases/transactions/update-transaction';
import { CreateTransactionLink } from '@/application/use-cases/transactions/create-transaction-link';
import { DeleteTransactionLink } from '@/application/use-cases/transactions/delete-transaction-link';
import { GetTransactionLinks } from '@/application/use-cases/transactions/get-transaction-links';
import { PopulateSampleData } from '@/application/use-cases/samples/populate-sample-data';
import { DeleteCategoryTarget } from '@/application/use-cases/targets/delete-category-target';
import { GetCategoryTargets } from '@/application/use-cases/targets/get-category-targets';
import { SetCategoryTarget } from '@/application/use-cases/targets/set-category-target';
import { CreateTransfer } from '@/application/use-cases/transfers/create-transfer';
import { UpdateTransfer } from '@/application/use-cases/transfers/update-transfer';
import { GetReports } from '@/application/use-cases/reports/get-reports';
import { DeletePlan } from '@/application/use-cases/plan/delete-plan';
import { SQLiteUnitOfWork } from '@/infrastructure/persistence/sqlite/database/sqlite-unit-of-work';
import { SQLitePlanDataStore } from '@/infrastructure/persistence/sqlite/database/sqlite-plan-data-store';
import { SQLiteAccountRepository } from '@/infrastructure/persistence/sqlite/repositories/sqlite-account-repository';
import { SQLiteBudgetAllocationRepository } from '@/infrastructure/persistence/sqlite/repositories/sqlite-budget-allocation-repository';
import { SQLiteCategoryGroupRepository } from '@/infrastructure/persistence/sqlite/repositories/sqlite-category-group-repository';
import { SQLiteCategoryRepository } from '@/infrastructure/persistence/sqlite/repositories/sqlite-category-repository';
import { SQLiteCategoryTargetRepository } from '@/infrastructure/persistence/sqlite/repositories/sqlite-category-target-repository';
import { SQLiteTransactionRepository } from '@/infrastructure/persistence/sqlite/repositories/sqlite-transaction-repository';
import { SQLiteTransactionLinkRepository } from '@/infrastructure/persistence/sqlite/repositories/sqlite-transaction-link-repository';
import { ExpoIdGenerator } from '@/infrastructure/system/expo-id-generator';
import { SystemClock } from '@/infrastructure/system/system-clock';
import { SQLitePlanPortability } from '@/infrastructure/portability/sqlite-plan-portability';

export function createApplication(
  database: SQLiteDatabase,
): ApplicationServices {
  const unitOfWork = new SQLiteUnitOfWork(database);
  const connection = unitOfWork.connection;
  const accounts = new SQLiteAccountRepository(connection);
  const categoryGroups = new SQLiteCategoryGroupRepository(connection);
  const categories = new SQLiteCategoryRepository(connection);
  const allocations = new SQLiteBudgetAllocationRepository(connection);
  const transactions = new SQLiteTransactionRepository(connection);
  const transactionLinks = new SQLiteTransactionLinkRepository(connection);
  const targets = new SQLiteCategoryTargetRepository(connection);
  const clock = new SystemClock();
  const ids = new ExpoIdGenerator();
  const ensureDefaults = new EnsureDefaultCategories(
    categoryGroups,
    categories,
    unitOfWork,
    clock,
  );
  const getBudgetMonth = new GetBudgetMonth(
    accounts,
    categoryGroups,
    categories,
    transactions,
    allocations,
  );
  const planPortability = new SQLitePlanPortability(database);

  return {
    accounts: {
      create: new CreateAccount(
        accounts,
        categoryGroups,
        categories,
        transactions,
        unitOfWork,
        ids,
        clock,
      ),
      getAll: new GetAccounts(accounts, transactions),
      getDetails: new GetAccountDetails(accounts, transactions, clock),
      rename: new RenameAccount(accounts, unitOfWork, clock),
      close: new CloseAccount(
        accounts,
        categories,
        transactions,
        unitOfWork,
        clock,
      ),
      getReconciliation: new GetReconciliation(accounts, transactions, clock),
      reconcile: new ReconcileAccount(
        accounts,
        transactions,
        unitOfWork,
        ids,
        clock,
      ),
    },
    categories: {
      ensureDefaults,
      createGroup: new CreateCategoryGroup(
        categoryGroups,
        unitOfWork,
        ids,
        clock,
      ),
      create: new CreateCategory(
        categoryGroups,
        categories,
        unitOfWork,
        ids,
        clock,
      ),
      createReplacement: new CreateCategoryReplacement(
        categoryGroups,
        categories,
        transactions,
        allocations,
        targets,
        unitOfWork,
        ids,
        clock,
      ),
      delete: new DeleteCategory(
        categories,
        transactions,
        allocations,
        targets,
        unitOfWork,
        clock,
      ),
      getDeletionImpact: new GetCategoryDeletionImpact(
        categories,
        transactions,
        allocations,
      ),
      getGroups: new GetCategoryGroups(categoryGroups, categories),
      getDetails: new GetCategoryDetails(getBudgetMonth, targets, clock),
      renameGroup: new RenameCategoryGroup(categoryGroups, unitOfWork, clock),
      rename: new RenameCategory(categories, unitOfWork, clock),
      updateNotes: new UpdateCategoryNotes(categories, unitOfWork, clock),
      reorderGroups: new ReorderCategoryGroups(
        categoryGroups,
        unitOfWork,
        clock,
      ),
      reorder: new ReorderCategories(categories, unitOfWork, clock),
      setHidden: new SetCategoryHidden(categories, unitOfWork, clock),
    },
    transactions: {
      create: new CreateTransaction(
        accounts,
        categories,
        transactions,
        unitOfWork,
        ids,
        clock,
      ),
      update: new UpdateTransaction(
        accounts,
        categories,
        transactions,
        unitOfWork,
        clock,
      ),
      delete: new DeleteTransaction(transactions, unitOfWork),
      getAll: new GetTransactions(transactions, accounts, categories),
      getById: new GetTransaction(transactions, accounts, categories),
      getPayees: new GetPayees(transactions),
      createLink: new CreateTransactionLink(
        transactions,
        transactionLinks,
        unitOfWork,
        ids,
        clock,
      ),
      getLinks: new GetTransactionLinks(transactionLinks),
      deleteLink: new DeleteTransactionLink(transactionLinks, unitOfWork),
    },
    budget: {
      getMonth: getBudgetMonth,
      assign: new AssignBudget(
        categories,
        allocations,
        getBudgetMonth,
        unitOfWork,
        ids,
        clock,
      ),
      move: new MoveBudget(
        categories,
        allocations,
        getBudgetMonth,
        unitOfWork,
        ids,
        clock,
      ),
    },
    targets: {
      getAll: new GetCategoryTargets(targets),
      set: new SetCategoryTarget(categories, targets, unitOfWork, ids, clock),
      delete: new DeleteCategoryTarget(categories, targets, unitOfWork),
    },
    transfers: {
      create: new CreateTransfer(
        accounts,
        categories,
        transactions,
        unitOfWork,
        ids,
        clock,
      ),
      update: new UpdateTransfer(
        accounts,
        categories,
        transactions,
        unitOfWork,
        clock,
      ),
    },
    reports: {
      get: new GetReports(accounts, categoryGroups, categories, transactions),
    },
    samples: {
      populate: new PopulateSampleData(
        accounts,
        categoryGroups,
        categories,
        transactions,
        allocations,
        targets,
        unitOfWork,
        clock,
      ),
    },
    plan: {
      delete: new DeletePlan(
        new SQLitePlanDataStore(connection),
        ensureDefaults,
        unitOfWork,
      ),
    },
    planPortability: {
      exportData: (preferences) => planPortability.exportData(preferences),
      createBackup: (password, preferences, onProgress) =>
        planPortability.createBackup(password, preferences, onProgress),
      selectRestoreSource: async (onProgress) => {
        const source = await planPortability.selectRestoreSource(onProgress);
        if (!source) return null;
        return {
          encrypted: source.encrypted,
          restore: async (password, restoreProgress) => {
            const result = await source.restore(password, restoreProgress);
            if (result.restored) await ensureDefaults.execute();
            return result;
          },
        };
      },
    },
  };
}
