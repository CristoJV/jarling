import type { SQLiteDatabase } from 'expo-sqlite';

import type { PlanDataStore } from '@/application/ports/plan-data-store';

export class SQLitePlanDataStore implements PlanDataStore {
  constructor(private readonly database: SQLiteDatabase) {}

  async deleteAll(): Promise<void> {
    await this.database.withTransactionAsync(async () => {
      await this.database.execAsync(`
        DELETE FROM budget_allocations;
        DELETE FROM category_targets;
        DELETE FROM transactions;
        DELETE FROM categories;
        DELETE FROM category_groups;
        DELETE FROM accounts;
      `);
    });
  }
}
