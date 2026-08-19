import { initialSchemaMigration } from './001_initial_schema';
import { migrations } from './migrations';

describe('initial schema migration', () => {
  it('contains the complete pre-production baseline', () => {
    expect(migrations).toEqual([initialSchemaMigration]);
    expect(initialSchemaMigration).toEqual(
      expect.objectContaining({ version: 1, name: 'initial_schema' }),
    );
  });

  it.each([
    'accounts',
    'category_groups',
    'categories',
    'transactions',
    'transaction_links',
    'budget_allocations',
    'category_targets',
  ])('creates the %s source of truth', (table) => {
    expect(initialSchemaMigration.up).toContain(`CREATE TABLE ${table}`);
  });

  it('contains the final constraints without transitional rebuilds', () => {
    expect(initialSchemaMigration.up).toContain(
      'REFERENCES accounts(id) ON DELETE RESTRICT',
    );
    expect(initialSchemaMigration.up).toContain(
      'REFERENCES categories(id) ON DELETE RESTRICT',
    );
    expect(initialSchemaMigration.up).toContain('UNIQUE (category_id, month)');
    expect(initialSchemaMigration.up).toContain(
      'category_id TEXT NOT NULL UNIQUE',
    );
    expect(initialSchemaMigration.up).toContain(
      "kind TEXT NOT NULL CHECK (kind IN ('weekly', 'monthly', 'yearly', 'custom'))",
    );
    expect(initialSchemaMigration.up).toContain(
      'transactions_group_account_unique_idx',
    );
    expect(initialSchemaMigration.up).toContain(
      "kind = 'transfer' AND transaction_group_id IS NOT NULL",
    );
    expect(initialSchemaMigration.up).not.toContain('ALTER TABLE');
    expect(initialSchemaMigration.up).not.toContain('DROP TABLE');
  });
});
