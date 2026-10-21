import {
  detectPortablePlanFormat,
  parsePlanSnapshot,
} from './sqlite-plan-portability';

const emptySnapshot = {
  format: 'com.cristojv.jarling.backup',
  version: 1,
  exportedAt: '2026-08-19T10:00:00.000Z',
  tables: {
    accounts: [],
    category_groups: [],
    categories: [],
    transactions: [],
    tags: [],
    transaction_tags: [],
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
      version: 4,
      preferences: { currency: 'EUR', theme: 'dark' },
      tables: {
        ...emptySnapshot.tables,
        category_target_snoozes: [],
        budget_allocation_movements: [],
      },
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

  it('creates assignment baselines while upgrading a version 3 backup', () => {
    const timestamp = '2026-08-19T10:00:00.000Z';
    const parsed = parsePlanSnapshot({
      ...emptySnapshot,
      version: 3,
      tables: {
        ...emptySnapshot.tables,
        category_groups: [
          {
            id: 'group-1',
            name: 'Needs',
            sort_order: 0,
            created_at: timestamp,
            updated_at: timestamp,
          },
        ],
        categories: [
          {
            id: 'category-1',
            group_id: 'group-1',
            name: 'Groceries',
            notes: null,
            hidden: 0,
            linked_account_id: null,
            sort_order: 0,
            created_at: timestamp,
            updated_at: timestamp,
          },
        ],
        budget_allocations: [
          {
            id: 'allocation-1',
            category_id: 'category-1',
            month: '2026-08',
            amount: 3_000,
            created_at: timestamp,
            updated_at: timestamp,
          },
        ],
        category_target_snoozes: [],
      },
    });

    expect(parsed.tables.budget_allocation_movements).toEqual([
      {
        id: 'allocation-baseline:allocation-1',
        month: '2026-08',
        amount: 3_000,
        source_category_id: null,
        destination_category_id: 'category-1',
        occurred_at: null,
        occurred_on: null,
        provenance: 'migration_baseline',
        recorded_at: timestamp,
      },
    ]);
  });

  it('adds the transaction links table missing from genuine version 1 backups', () => {
    const { transaction_links: _, ...legacyTables } = emptySnapshot.tables;
    expect(
      parsePlanSnapshot({ ...emptySnapshot, tables: legacyTables }).tables
        .transaction_links,
    ).toEqual([]);
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

  it('round-trips current monthly target snoozes and rejects orphaned ones', () => {
    const current = {
      ...emptySnapshot,
      version: 3,
      tables: {
        ...emptySnapshot.tables,
        category_groups: [
          {
            id: 'group-1',
            name: 'Bills',
            sort_order: 0,
            created_at: '2026-08-01T00:00:00.000Z',
            updated_at: '2026-08-01T00:00:00.000Z',
          },
        ],
        categories: [
          {
            id: 'category-1',
            group_id: 'group-1',
            name: 'Rent',
            notes: null,
            hidden: 0,
            linked_account_id: null,
            sort_order: 0,
            created_at: '2026-08-01T00:00:00.000Z',
            updated_at: '2026-08-01T00:00:00.000Z',
          },
        ],
        category_targets: [
          {
            id: 'target-1',
            category_id: 'category-1',
            kind: 'monthly',
            amount: 10_000,
            starts_on: '2026-08-01',
            day_of_week: null,
            include_previous_weeks: null,
            funding_mode: 'set_aside',
            day_of_month: 31,
            target_date: null,
            custom_funding_mode: null,
            created_at: '2026-08-01T00:00:00.000Z',
            updated_at: '2026-08-01T00:00:00.000Z',
          },
        ],
        category_target_snoozes: [
          { category_id: 'category-1', month: '2026-08' },
        ],
      },
    };

    expect(parsePlanSnapshot(current)).toEqual({
      ...current,
      version: 4,
      tables: { ...current.tables, budget_allocation_movements: [] },
    });
    expect(() =>
      parsePlanSnapshot({
        ...current,
        tables: { ...current.tables, category_targets: [] },
      }),
    ).toThrow('invalid target snooze');
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
          category_target_snoozes: [],
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
    expect(parsePlanSnapshot(cardPaymentSnapshot)).toEqual({
      ...cardPaymentSnapshot,
      version: 4,
      tables: {
        ...cardPaymentSnapshot.tables,
        category_target_snoozes: [],
        budget_allocation_movements: [],
      },
    });
  });

  it('detects portable formats from content instead of file extensions', () => {
    expect(detectPortablePlanFormat(emptySnapshot)).toBe('snapshot');
    expect(
      detectPortablePlanFormat({
        format: 'com.cristojv.jarling.backup',
        version: 2,
        encryption: 'AES-256-GCM',
        kdf: {
          name: 'PBKDF2-HMAC-SHA256',
          iterations: 310_000,
          salt: '00'.repeat(16),
        },
        payload: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
      }),
    ).toBe('encrypted');
  });

  it('rejects unrecognized portable content', () => {
    expect(() => detectPortablePlanFormat({ version: 2 })).toThrow(
      'not a supported Jarling backup',
    );
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

  it('round-trips a standard category inflow without changing backup version', () => {
    const snapshot = {
      ...emptySnapshot,
      version: 4,
      tables: {
        ...emptySnapshot.tables,
        category_groups: [
          {
            id: 'group-1',
            name: 'Needs',
            sort_order: 0,
            created_at: '2026-08-19T10:00:00.000Z',
            updated_at: '2026-08-19T10:00:00.000Z',
          },
        ],
        categories: [
          {
            id: 'category-1',
            group_id: 'group-1',
            name: 'Clothing',
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
            id: 'refund-1',
            account_id: 'account-1',
            category_id: 'category-1',
            payee: 'Refund',
            amount: 4_000,
            date: '2026-08-19',
            notes: null,
            status: 'cleared',
            kind: 'standard',
            transaction_group_id: null,
            created_at: '2026-08-19T10:00:00.000Z',
            updated_at: '2026-08-19T10:00:00.000Z',
          },
        ],
        category_target_snoozes: [],
        budget_allocation_movements: [],
      },
    };

    const serialized = JSON.stringify(snapshot);
    expect(parsePlanSnapshot(JSON.parse(serialized))).toEqual(snapshot);
  });

  it('round-trips normalized transaction tags and rejects orphan associations', () => {
    const base = {
      ...emptySnapshot,
      version: 4,
      tables: {
        ...emptySnapshot.tables,
        budget_allocation_movements: [],
        category_target_snoozes: [],
        accounts: [
          {
            id: 'account-1',
            name: 'Cash',
            type: 'checking',
            on_budget: 1,
            closed: 0,
            created_at: '2026-10-16T10:00:00.000Z',
            updated_at: '2026-10-16T10:00:00.000Z',
          },
        ],
        transactions: [
          {
            id: 'transaction-1',
            account_id: 'account-1',
            category_id: null,
            payee: null,
            amount: -100,
            date: '2026-10-16',
            notes: null,
            status: 'uncleared',
            kind: 'standard',
            transaction_group_id: null,
            created_at: '2026-10-16T10:00:00.000Z',
            updated_at: '2026-10-16T10:00:00.000Z',
          },
        ],
        tags: [
          {
            id: 'tag-1',
            name: 'Viaje',
            name_key: 'viaje',
            created_at: '2026-10-16T10:00:00.000Z',
            updated_at: '2026-10-16T10:00:00.000Z',
          },
        ],
        transaction_tags: [
          {
            transaction_id: 'transaction-1',
            tag_id: 'tag-1',
            attached_at: '2026-10-16T10:00:00.000Z',
          },
        ],
      },
    };

    expect(parsePlanSnapshot(base)).toEqual(base);
    expect(() =>
      parsePlanSnapshot({
        ...base,
        tables: {
          ...base.tables,
          transaction_tags: [
            {
              transaction_id: 'missing',
              tag_id: 'tag-1',
              attached_at: '2026-10-16T10:00:00.000Z',
            },
          ],
        },
      }),
    ).toThrow('invalid transaction tag');
  });

  it.each([-4_000, 4_000])(
    'rejects categorized standard activity on a tracking account (%s cents)',
    (amount) => {
      const snapshot = {
        ...emptySnapshot,
        version: 3,
        tables: {
          ...emptySnapshot.tables,
          accounts: [
            {
              id: 'tracking-1',
              name: 'Broker',
              type: 'tracking',
              on_budget: 0,
              closed: 0,
              created_at: '2026-08-19T10:00:00.000Z',
              updated_at: '2026-08-19T10:00:00.000Z',
            },
          ],
          category_groups: [
            {
              id: 'group-1',
              name: 'Needs',
              sort_order: 0,
              created_at: '2026-08-19T10:00:00.000Z',
              updated_at: '2026-08-19T10:00:00.000Z',
            },
          ],
          categories: [
            {
              id: 'category-1',
              group_id: 'group-1',
              name: 'Clothing',
              notes: null,
              hidden: 0,
              linked_account_id: null,
              sort_order: 0,
              created_at: '2026-08-19T10:00:00.000Z',
              updated_at: '2026-08-19T10:00:00.000Z',
            },
          ],
          transactions: [
            {
              id: 'tracking-activity',
              account_id: 'tracking-1',
              category_id: 'category-1',
              payee: 'Invalid category activity',
              amount,
              date: '2026-08-19',
              notes: null,
              status: 'cleared',
              kind: 'standard',
              transaction_group_id: null,
              created_at: '2026-08-19T10:00:00.000Z',
              updated_at: '2026-08-19T10:00:00.000Z',
            },
          ],
          category_target_snoozes: [],
        },
      };

      expect(() => parsePlanSnapshot(snapshot)).toThrow('unsupported account');
    },
  );

  it.each([
    ['tracking', 1],
    ['loan', 1],
    ['credit_card', 0],
    ['line_of_credit', 0],
  ] as const)('rejects the invalid %s on-budget state %s', (type, onBudget) => {
    const snapshot = {
      ...emptySnapshot,
      version: 3,
      tables: {
        ...emptySnapshot.tables,
        category_target_snoozes: [],
        accounts: [
          {
            id: 'invalid-account',
            name: 'Invalid account',
            type,
            on_budget: onBudget,
            closed: 0,
            created_at: '2026-08-19T10:00:00.000Z',
            updated_at: '2026-08-19T10:00:00.000Z',
          },
        ],
      },
    };

    expect(() => parsePlanSnapshot(snapshot)).toThrow(
      'invalid account budget state',
    );
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
        budget_allocations: [
          {
            id: 'legacy-allocation',
            category_id: 'default-category-uncategorized',
            month: '2026-08',
            amount: 1_000,
            created_at: '2026-08-19T10:00:00.000Z',
            updated_at: '2026-08-19T10:00:00.000Z',
          },
        ],
      },
    });

    expect(parsed.tables.category_groups).toEqual([]);
    expect(parsed.tables.categories).toEqual([]);
    expect(parsed.tables.budget_allocations).toEqual([]);
    expect(parsed.tables.budget_allocation_movements).toEqual([]);
    expect(parsed.tables.transactions[0]).toEqual(
      expect.objectContaining({ category_id: null }),
    );
  });
});
