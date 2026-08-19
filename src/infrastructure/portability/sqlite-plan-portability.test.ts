import { parsePlanSnapshot } from './sqlite-plan-portability';

const emptySnapshot = {
  format: 'com.cristojv.jarling.backup',
  version: 1,
  exportedAt: '2026-08-19T10:00:00.000Z',
  tables: {
    accounts: [],
    category_groups: [],
    categories: [],
    transactions: [],
    transaction_links: [],
    budget_allocations: [],
    category_targets: [],
  },
};

describe('Jarling plan snapshots', () => {
  it('accepts the current portable format and optional preferences', () => {
    expect(
      parsePlanSnapshot({
        ...emptySnapshot,
        preferences: { currency: 'EUR', theme: 'dark' },
      }),
    ).toEqual({
      ...emptySnapshot,
      preferences: { currency: 'EUR', theme: 'dark' },
    });
  });

  it('rejects an incomplete backup before touching SQLite', () => {
    expect(() =>
      parsePlanSnapshot({
        ...emptySnapshot,
        tables: { ...emptySnapshot.tables, transactions: undefined },
      }),
    ).toThrow('Backup table transactions is missing.');
  });

  it('rejects rows with missing or non-bindable fields', () => {
    expect(() =>
      parsePlanSnapshot({
        ...emptySnapshot,
        tables: {
          ...emptySnapshot.tables,
          accounts: [{ id: 'account-1' }],
        },
      }),
    ).toThrow('Invalid accounts.name value.');
  });

  it('rejects dangling relationships before replacing local data', () => {
    expect(() =>
      parsePlanSnapshot({
        ...emptySnapshot,
        tables: {
          ...emptySnapshot.tables,
          category_groups: [
            {
              id: 'group-1',
              name: 'Bills',
              sort_order: 0,
              created_at: '2026-08-19T10:00:00.000Z',
              updated_at: '2026-08-19T10:00:00.000Z',
            },
          ],
          categories: [
            {
              id: 'category-1',
              group_id: 'missing-group',
              name: 'Rent',
              hidden: 0,
              linked_account_id: null,
              sort_order: 0,
              created_at: '2026-08-19T10:00:00.000Z',
              updated_at: '2026-08-19T10:00:00.000Z',
            },
          ],
        },
      }),
    ).toThrow('invalid category relationship');
  });

  it('rejects an incomplete transfer before touching SQLite', () => {
    expect(() =>
      parsePlanSnapshot({
        ...emptySnapshot,
        tables: {
          ...emptySnapshot.tables,
          accounts: [
            {
              id: 'account-1',
              name: 'Cash',
              type: 'checking',
              on_budget: 1,
              closed: 0,
              created_at: '2026-08-19T10:00:00.000Z',
              updated_at: '2026-08-19T10:00:00.000Z',
            },
          ],
          transactions: [
            {
              id: 'transaction-1',
              account_id: 'account-1',
              category_id: null,
              payee: 'Transfer',
              amount: -1000,
              date: '2026-08-19',
              notes: null,
              status: 'cleared',
              kind: 'transfer',
              transaction_group_id: 'transfer-1',
              created_at: '2026-08-19T10:00:00.000Z',
              updated_at: '2026-08-19T10:00:00.000Z',
            },
          ],
        },
      }),
    ).toThrow('unbalanced transfer');
  });
});
