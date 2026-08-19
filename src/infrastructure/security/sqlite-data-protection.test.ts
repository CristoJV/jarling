import { parsePlanSnapshot } from './sqlite-data-protection';

const emptySnapshot = {
  format: 'com.cristojv.jarling.backup',
  version: 1,
  exportedAt: '2026-08-19T10:00:00.000Z',
  tables: {
    accounts: [],
    category_groups: [],
    categories: [],
    transactions: [],
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
});
