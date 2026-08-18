import type { SQLiteDatabase } from 'expo-sqlite';

import type { ApplicationServices } from '@/application/application-services';
import { CloseAccount } from '@/application/use-cases/accounts/close-account';
import { CreateAccount } from '@/application/use-cases/accounts/create-account';
import { GetAccounts } from '@/application/use-cases/accounts/get-accounts';
import { GetReconciliation } from '@/application/use-cases/accounts/get-reconciliation';
import { ReconcileAccount } from '@/application/use-cases/accounts/reconcile-account';
import { CreateCategoryGroup } from '@/application/use-cases/categories/create-category-group';
import { CreateCategory } from '@/application/use-cases/categories/create-category';
import { EnsureDefaultCategories } from '@/application/use-cases/categories/ensure-default-categories';
import { GetCategoryGroups } from '@/application/use-cases/categories/get-category-groups';
import { RenameCategoryGroup } from '@/application/use-cases/categories/rename-category-group';
import { RenameCategory } from '@/application/use-cases/categories/rename-category';
import { ReorderCategories } from '@/application/use-cases/categories/reorder-categories';
import { ReorderCategoryGroups } from '@/application/use-cases/categories/reorder-category-groups';
import { SetCategoryHidden } from '@/application/use-cases/categories/set-category-hidden';
import { AssignBudget } from '@/application/use-cases/budget/assign-budget';
import { GetBudgetMonth } from '@/application/use-cases/budget/get-budget-month';
import { MoveBudgetBetweenCategories } from '@/application/use-cases/budget/move-budget-between-categories';
import { CreateTransaction } from '@/application/use-cases/transactions/create-transaction';
import { DeleteTransaction } from '@/application/use-cases/transactions/delete-transaction';
import { GetTransactions } from '@/application/use-cases/transactions/get-transactions';
import { GetPayees } from '@/application/use-cases/transactions/get-payees';
import { UpdateTransaction } from '@/application/use-cases/transactions/update-transaction';
import { PopulateSampleData } from '@/application/use-cases/samples/populate-sample-data';
import { DeleteCategoryTarget } from '@/application/use-cases/targets/delete-category-target';
import { GetCategoryTargets } from '@/application/use-cases/targets/get-category-targets';
import { SetCategoryTarget } from '@/application/use-cases/targets/set-category-target';
import { CreateTransfer } from '@/application/use-cases/transfers/create-transfer';
import { UpdateTransfer } from '@/application/use-cases/transfers/update-transfer';
import { GetReports } from '@/application/use-cases/reports/get-reports';
import { SQLiteUnitOfWork } from '@/infrastructure/persistence/sqlite/database/sqlite-unit-of-work';
import { SQLiteAccountRepository } from '@/infrastructure/persistence/sqlite/repositories/sqlite-account-repository';
import { SQLiteBudgetAllocationRepository } from '@/infrastructure/persistence/sqlite/repositories/sqlite-budget-allocation-repository';
import { SQLiteCategoryGroupRepository } from '@/infrastructure/persistence/sqlite/repositories/sqlite-category-group-repository';
import { SQLiteCategoryRepository } from '@/infrastructure/persistence/sqlite/repositories/sqlite-category-repository';
import { SQLiteCategoryTargetRepository } from '@/infrastructure/persistence/sqlite/repositories/sqlite-category-target-repository';
import { SQLiteTransactionRepository } from '@/infrastructure/persistence/sqlite/repositories/sqlite-transaction-repository';
import { ExpoIdGenerator } from '@/infrastructure/system/expo-id-generator';
import { SystemClock } from '@/infrastructure/system/system-clock';

export function createApplication(
  database: SQLiteDatabase,
): ApplicationServices {
  const accounts = new SQLiteAccountRepository(database);
  const categoryGroups = new SQLiteCategoryGroupRepository(database);
  const categories = new SQLiteCategoryRepository(database);
  const allocations = new SQLiteBudgetAllocationRepository(database);
  const transactions = new SQLiteTransactionRepository(database);
  const targets = new SQLiteCategoryTargetRepository(database);
  const unitOfWork = new SQLiteUnitOfWork(database);
  const clock = new SystemClock();
  const ids = new ExpoIdGenerator();
  const getBudgetMonth = new GetBudgetMonth(
    accounts,
    categoryGroups,
    categories,
    transactions,
    allocations,
  );

  return {
    accounts: {
      create: new CreateAccount(accounts, transactions, unitOfWork, ids, clock),
      getAll: new GetAccounts(accounts, transactions),
      close: new CloseAccount(accounts, unitOfWork, clock),
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
      ensureDefaults: new EnsureDefaultCategories(
        categoryGroups,
        categories,
        unitOfWork,
        clock,
      ),
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
      getGroups: new GetCategoryGroups(categoryGroups, categories),
      renameGroup: new RenameCategoryGroup(categoryGroups, unitOfWork, clock),
      rename: new RenameCategory(categories, unitOfWork, clock),
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
      getPayees: new GetPayees(transactions),
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
      move: new MoveBudgetBetweenCategories(
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
        transactions,
        unitOfWork,
        ids,
        clock,
      ),
      update: new UpdateTransfer(accounts, transactions, unitOfWork, clock),
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
  };
}
