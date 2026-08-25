import type { Migration } from './migration';

/**
 * Forward-only changes for databases created by an earlier public release.
 * Fresh installations use current-schema.ts directly. Released databases
 * advance through this list without rebuilding user data.
 */
export const migrations: readonly Migration[] = [
  {
    version: 2,
    name: 'monthly_targets_and_uncategorized_transactions',
    up: `
      DROP INDEX category_targets_kind_idx;
      ALTER TABLE category_targets RENAME TO category_targets_v1;

      CREATE TABLE category_targets (
        id TEXT PRIMARY KEY NOT NULL,
        category_id TEXT NOT NULL UNIQUE,
        kind TEXT NOT NULL CHECK (kind IN ('weekly', 'monthly', 'yearly', 'custom')),
        amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer' AND amount > 0),
        starts_on TEXT NOT NULL CHECK (
          length(starts_on) = 10
          AND starts_on GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
        ),
        day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7),
        include_previous_weeks INTEGER CHECK (include_previous_weeks IN (0, 1)),
        funding_mode TEXT CHECK (funding_mode IN ('set_aside', 'refill_up_to')),
        day_of_month INTEGER CHECK (day_of_month BETWEEN 0 AND 31),
        target_date TEXT CHECK (
          target_date IS NULL OR (
            length(target_date) = 10
            AND target_date GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'
          )
        ),
        custom_funding_mode TEXT CHECK (
          custom_funding_mode IN ('set_aside', 'fill_up_to', 'balance')
        ),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
        CHECK (
          (kind = 'weekly' AND day_of_week IS NOT NULL
            AND include_previous_weeks IS NOT NULL AND funding_mode IS NOT NULL
            AND day_of_month IS NULL AND target_date IS NULL AND custom_funding_mode IS NULL)
          OR (kind = 'monthly' AND day_of_week IS NULL
            AND include_previous_weeks IS NULL AND funding_mode IS NOT NULL
            AND day_of_month IS NOT NULL AND target_date IS NULL AND custom_funding_mode IS NULL)
          OR (kind = 'yearly' AND day_of_week IS NULL
            AND include_previous_weeks IS NULL AND funding_mode IS NOT NULL
            AND day_of_month IS NULL AND target_date IS NOT NULL AND custom_funding_mode IS NULL)
          OR (kind = 'custom' AND day_of_week IS NULL
            AND include_previous_weeks IS NULL AND funding_mode IS NULL
            AND day_of_month IS NULL AND custom_funding_mode IS NOT NULL)
        )
      );

      INSERT INTO category_targets (
        id, category_id, kind, amount, starts_on, day_of_week,
        include_previous_weeks, funding_mode, day_of_month, target_date,
        custom_funding_mode, created_at, updated_at
      )
      SELECT
        id, category_id, kind, amount, substr(created_at, 1, 10), day_of_week,
        CASE WHEN kind = 'weekly' THEN 0 ELSE NULL END, funding_mode,
        day_of_month, target_date, custom_funding_mode, created_at, updated_at
      FROM category_targets_v1;

      DROP TABLE category_targets_v1;
      CREATE INDEX category_targets_kind_idx ON category_targets(kind);

      DROP INDEX transactions_account_date_idx;
      DROP INDEX transactions_category_date_idx;
      DROP INDEX transactions_date_idx;
      DROP INDEX transactions_group_id_idx;
      DROP INDEX transactions_kind_idx;
      DROP INDEX transactions_payee_search_idx;
      DROP INDEX transactions_group_account_unique_idx;
      DROP INDEX transaction_links_source_idx;
      DROP INDEX transaction_links_target_idx;

      ALTER TABLE transaction_links RENAME TO transaction_links_v1;
      ALTER TABLE transactions RENAME TO transactions_v1;

      CREATE TABLE transactions (
        id TEXT PRIMARY KEY NOT NULL,
        account_id TEXT NOT NULL,
        category_id TEXT,
        payee TEXT,
        amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer'),
        date TEXT NOT NULL CHECK (length(date) = 10),
        notes TEXT,
        status TEXT NOT NULL CHECK (status IN ('uncleared', 'cleared', 'reconciled')),
        kind TEXT NOT NULL DEFAULT 'standard' CHECK (kind IN (
          'standard', 'opening_balance', 'transfer', 'reconciliation_adjustment'
        )),
        transaction_group_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
        CHECK (
          (kind = 'transfer' AND transaction_group_id IS NOT NULL)
          OR (kind <> 'transfer' AND transaction_group_id IS NULL)
        ),
        CHECK (
          category_id IS NULL
          OR kind = 'standard'
          OR (kind = 'transfer' AND amount < 0)
        )
      );

      INSERT INTO transactions (
        id, account_id, category_id, payee, amount, date, notes, status,
        kind, transaction_group_id, created_at, updated_at
      )
      SELECT
        id, account_id,
        CASE
          WHEN category_id = 'default-category-uncategorized' THEN NULL
          ELSE category_id
        END,
        payee, amount, date, notes, status, kind, transaction_group_id,
        created_at, updated_at
      FROM transactions_v1;

      CREATE TABLE transaction_links (
        id TEXT PRIMARY KEY NOT NULL,
        source_transaction_id TEXT NOT NULL,
        target_transaction_id TEXT NOT NULL,
        link_type TEXT NOT NULL CHECK (link_type IN ('related', 'bizum')),
        created_at TEXT NOT NULL,
        CHECK (source_transaction_id < target_transaction_id),
        UNIQUE (source_transaction_id, target_transaction_id, link_type),
        FOREIGN KEY (source_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
        FOREIGN KEY (target_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
      );

      INSERT INTO transaction_links (
        id, source_transaction_id, target_transaction_id, link_type, created_at
      )
      SELECT id, source_transaction_id, target_transaction_id, link_type, created_at
      FROM transaction_links_v1;

      DROP TABLE transaction_links_v1;
      DROP TABLE transactions_v1;

      CREATE INDEX transactions_account_date_idx
        ON transactions(account_id, date DESC, created_at DESC, id DESC);
      CREATE INDEX transactions_category_date_idx
        ON transactions(category_id, date DESC);
      CREATE INDEX transactions_date_idx ON transactions(date);
      CREATE INDEX transactions_group_id_idx ON transactions(transaction_group_id);
      CREATE INDEX transactions_kind_idx ON transactions(kind);
      CREATE INDEX transactions_payee_search_idx
        ON transactions(lower(trim(payee)))
        WHERE payee IS NOT NULL AND kind = 'standard' AND transaction_group_id IS NULL;
      CREATE UNIQUE INDEX transactions_group_account_unique_idx
        ON transactions(transaction_group_id, account_id)
        WHERE transaction_group_id IS NOT NULL;
      CREATE INDEX transaction_links_source_idx
        ON transaction_links(source_transaction_id);
      CREATE INDEX transaction_links_target_idx
        ON transaction_links(target_transaction_id);

      DELETE FROM category_targets
      WHERE category_id = 'default-category-uncategorized';
      DELETE FROM budget_allocations
      WHERE category_id = 'default-category-uncategorized';
      DELETE FROM categories
      WHERE id = 'default-category-uncategorized';
      DELETE FROM category_groups
      WHERE id = 'system-group-uncategorized';
    `,
  },
];
