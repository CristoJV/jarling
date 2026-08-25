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

const cardPaymentSnapshot = {
  ...emptySnapshot,
  tables: {
    ...emptySnapshot.tables,
    accounts: [
      {
        id: 'checking',
        name: 'Checking',
        type: 'checking',
        on_budget: 1,
        closed: 0,
        created_at: '2026-08-19T10:00:00.000Z',
        updated_at: '2026-08-19T10:00:00.000Z',
      },
      {
        id: 'credit-card',
        name: 'Credit card',
        type: 'credit_card',
        on_budget: 1,
        closed: 0,
        created_at: '2026-08-19T10:00:00.000Z',
        updated_at: '2026-08-19T10:00:00.000Z',
      },
      {
        id: 'savings',
        name: 'Savings',
        type: 'savings',
        on_budget: 1,
        closed: 0,
        created_at: '2026-08-19T10:00:00.000Z',
        updated_at: '2026-08-19T10:00:00.000Z',
      },
    ],
    category_groups: [
      {
        id: 'credit-payments',
        name: 'Credit Card Payments',
        sort_order: 0,
        created_at: '2026-08-19T10:00:00.000Z',
        updated_at: '2026-08-19T10:00:00.000Z',
      },
    ],
    categories: [
      {
        id: 'card-payment',
        group_id: 'credit-payments',
        name: 'Credit card payment',
        notes: null,
        hidden: 0,
        linked_account_id: 'credit-card',
        sort_order: 0,
        created_at: '2026-08-19T10:00:00.000Z',
        updated_at: '2026-08-19T10:00:00.000Z',
      },
    ],
    transactions: [
      {
        id: 'payment-source',
        account_id: 'checking',
        category_id: 'card-payment',
        payee: 'Transfer to Credit card',
        amount: -10_000,
        date: '2026-08-19',
        notes: null,
        status: 'cleared',
        kind: 'transfer',
        transaction_group_id: 'card-payment-transfer',
        created_at: '2026-08-19T10:00:00.000Z',
        updated_at: '2026-08-19T10:00:00.000Z',
      },
      {
        id: 'payment-destination',
        account_id: 'credit-card',
        category_id: null,
        payee: 'Transfer from Checking',
        amount: 10_000,
        date: '2026-08-19',
        notes: null,
        status: 'cleared',
        kind: 'transfer',
        transaction_group_id: 'card-payment-transfer',
        created_at: '2026-08-19T10:00:00.000Z',
        updated_at: '2026-08-19T10:00:00.000Z',
      },
    ],
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

  it('upgrades target schedule defaults from a version 1 backup', () => {
    const parsed = parsePlanSnapshot({
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
            group_id: 'group-1',
            name: 'Rent',
            hidden: 0,
            linked_account_id: null,
            sort_order: 0,
            created_at: '2026-08-19T10:00:00.000Z',
            updated_at: '2026-08-19T10:00:00.000Z',
          },
        ],
        category_targets: [
          {
            id: 'target-1',
            category_id: 'category-1',
            kind: 'weekly',
            amount: 10_000,
            day_of_week: 5,
            funding_mode: 'set_aside',
            day_of_month: null,
            target_date: null,
            custom_funding_mode: null,
            created_at: '2026-08-19T10:00:00.000Z',
            updated_at: '2026-08-19T10:00:00.000Z',
          },
        ],
      },
    });

    expect(parsed.tables.category_targets[0]).toEqual(
      expect.objectContaining({
        starts_on: '2026-08-19',
        include_previous_weeks: 0,
      }),
    );
  });

  it('requires explicit target schedule fields in version 2 backups', () => {
    expect(() =>
      parsePlanSnapshot({
        ...emptySnapshot,
        version: 2,
        tables: {
          ...emptySnapshot.tables,
          category_targets: [
            {
              id: 'target-1',
              category_id: 'category-1',
              kind: 'weekly',
              amount: 10_000,
              day_of_week: 5,
              funding_mode: 'set_aside',
              day_of_month: null,
              target_date: null,
              custom_funding_mode: null,
              created_at: '2026-08-19T10:00:00.000Z',
              updated_at: '2026-08-19T10:00:00.000Z',
            },
          ],
        },
      }),
    ).toThrow('Invalid category_targets.starts_on value.');
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

  it('accepts a categorized transfer into its linked credit account', () => {
    expect(parsePlanSnapshot(cardPaymentSnapshot)).toEqual(cardPaymentSnapshot);
  });

  it('rejects a categorized transfer that does not pay the linked card', () => {
    expect(() =>
      parsePlanSnapshot({
        ...cardPaymentSnapshot,
        tables: {
          ...cardPaymentSnapshot.tables,
          transactions: cardPaymentSnapshot.tables.transactions.map(
            (transaction) =>
              transaction.id === 'payment-destination'
                ? { ...transaction, account_id: 'savings' }
                : transaction,
          ),
        },
      }),
    ).toThrow('invalid card payment transfer');
  });

  it('rejects category notes above the domain limit', () => {
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
              group_id: 'group-1',
              name: 'Rent',
              notes: 'x'.repeat(4_001),
              hidden: 0,
              linked_account_id: null,
              sort_order: 0,
              created_at: '2026-08-19T10:00:00.000Z',
              updated_at: '2026-08-19T10:00:00.000Z',
            },
          ],
        },
      }),
    ).toThrow('invalid category notes');
  });

  it('accepts an expense without a category', () => {
    expect(
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
              payee: 'Shop',
              amount: -1000,
              date: '2026-08-19',
              notes: null,
              status: 'cleared',
              kind: 'standard',
              transaction_group_id: null,
              created_at: '2026-08-19T10:00:00.000Z',
              updated_at: '2026-08-19T10:00:00.000Z',
            },
          ],
        },
      }).tables.transactions[0],
    ).toEqual(expect.objectContaining({ category_id: null, amount: -1000 }));
  });

  it('normalizes the legacy Uncategorized envelope into null category ids', () => {
    const parsed = parsePlanSnapshot({
      ...emptySnapshot,
      tables: {
        ...emptySnapshot.tables,
        category_groups: [
          {
            id: 'system-group-uncategorized',
            name: 'Uncategorized',
            sort_order: 0,
            created_at: '2026-08-19T10:00:00.000Z',
            updated_at: '2026-08-19T10:00:00.000Z',
          },
        ],
        categories: [
          {
            id: 'default-category-uncategorized',
            group_id: 'system-group-uncategorized',
            name: 'Uncategorized',
            notes: null,
            hidden: 0,
            linked_account_id: null,
            sort_order: 0,
            created_at: '2026-08-19T10:00:00.000Z',
            updated_at: '2026-08-19T10:00:00.000Z',
          },
        ],
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
            category_id: 'default-category-uncategorized',
            payee: 'Shop',
            amount: -1000,
            date: '2026-08-19',
            notes: null,
            status: 'cleared',
            kind: 'standard',
            transaction_group_id: null,
            created_at: '2026-08-19T10:00:00.000Z',
            updated_at: '2026-08-19T10:00:00.000Z',
          },
        ],
      },
    });

    expect(parsed.tables.category_groups).toEqual([]);
    expect(parsed.tables.categories).toEqual([]);
    expect(parsed.tables.transactions[0]).toEqual(
      expect.objectContaining({ category_id: null }),
    );
  });
});
