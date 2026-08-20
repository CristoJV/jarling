import {
  currentSchema,
  CURRENT_SCHEMA_VERSION,
  FIRST_RELEASE_SCHEMA_VERSION,
} from './current-schema';
import { migrations } from '../migrations/migrations';

describe('current database schema', () => {
  it('is a direct first-release baseline with no historical migrations', () => {
    expect(currentSchema).toEqual(
      expect.objectContaining({
        version: CURRENT_SCHEMA_VERSION,
        name: `schema_v${CURRENT_SCHEMA_VERSION}`,
      }),
    );
    expect(migrations).toEqual([]);
  });

  it('does not predate the first public database contract', () => {
    expect(CURRENT_SCHEMA_VERSION).toBeGreaterThanOrEqual(
      FIRST_RELEASE_SCHEMA_VERSION,
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
    expect(currentSchema.up).toContain(`CREATE TABLE ${table}`);
  });

  it('contains release constraints and query indexes without transitional SQL', () => {
    expect(currentSchema.up).toContain(
      'REFERENCES accounts(id) ON DELETE RESTRICT',
    );
    expect(currentSchema.up).toContain(
      'REFERENCES categories(id) ON DELETE RESTRICT',
    );
    expect(currentSchema.up).toContain('UNIQUE (category_id, month)');
    expect(currentSchema.up).toContain('category_id TEXT NOT NULL UNIQUE');
    expect(currentSchema.up).toContain(
      'notes TEXT CHECK (notes IS NULL OR length(notes) <= 4000)',
    );
    expect(currentSchema.up).toContain(
      'CHECK (source_transaction_id < target_transaction_id)',
    );
    expect(currentSchema.up).toContain(
      "CHECK (kind <> 'standard' OR amount >= 0 OR category_id IS NOT NULL)",
    );
    expect(currentSchema.up).toContain("OR (kind = 'transfer' AND amount < 0)");
    expect(currentSchema.up).toContain('transactions_account_date_idx');
    expect(currentSchema.up).toContain('transactions_category_date_idx');
    expect(currentSchema.up).toContain('transactions_payee_search_idx');
    expect(currentSchema.up).not.toContain('ALTER TABLE');
    expect(currentSchema.up).not.toContain('DROP TABLE');
  });
});
