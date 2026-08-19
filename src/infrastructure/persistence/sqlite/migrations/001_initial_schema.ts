import type { Migration } from './migration';

export const initialSchemaMigration: Migration = {
  version: 1,
  name: 'initial_schema',
  up: `
    CREATE TABLE accounts (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) > 0),
      type TEXT NOT NULL CHECK (type IN (
        'checking', 'savings', 'cash', 'credit_card', 'line_of_credit',
        'tracking', 'loan'
      )),
      on_budget INTEGER NOT NULL CHECK (on_budget IN (0, 1)),
      closed INTEGER NOT NULL CHECK (closed IN (0, 1)),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE category_groups (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) > 0),
      sort_order INTEGER NOT NULL CHECK (typeof(sort_order) = 'integer'),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE categories (
      id TEXT PRIMARY KEY NOT NULL,
      group_id TEXT NOT NULL,
      name TEXT NOT NULL CHECK (length(trim(name)) > 0),
      hidden INTEGER NOT NULL CHECK (hidden IN (0, 1)),
      linked_account_id TEXT UNIQUE,
      sort_order INTEGER NOT NULL CHECK (typeof(sort_order) = 'integer'),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (group_id) REFERENCES category_groups(id) ON DELETE RESTRICT,
      FOREIGN KEY (linked_account_id) REFERENCES accounts(id) ON DELETE RESTRICT
    );

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
      )
    );

    CREATE TABLE transaction_links (
      id TEXT PRIMARY KEY NOT NULL,
      source_transaction_id TEXT NOT NULL,
      target_transaction_id TEXT NOT NULL,
      link_type TEXT NOT NULL CHECK (link_type IN ('related', 'bizum')),
      created_at TEXT NOT NULL,
      CHECK (source_transaction_id <> target_transaction_id),
      UNIQUE (source_transaction_id, target_transaction_id, link_type),
      FOREIGN KEY (source_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (target_transaction_id) REFERENCES transactions(id) ON DELETE CASCADE
    );

    CREATE TABLE budget_allocations (
      id TEXT PRIMARY KEY NOT NULL,
      category_id TEXT NOT NULL,
      month TEXT NOT NULL CHECK (
        length(month) = 7
        AND month GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'
        AND CAST(substr(month, 6, 2) AS INTEGER) BETWEEN 1 AND 12
      ),
      amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer'),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
      UNIQUE (category_id, month)
    );

    CREATE TABLE category_targets (
      id TEXT PRIMARY KEY NOT NULL,
      category_id TEXT NOT NULL UNIQUE,
      kind TEXT NOT NULL CHECK (kind IN ('weekly', 'monthly', 'yearly', 'custom')),
      amount INTEGER NOT NULL CHECK (typeof(amount) = 'integer' AND amount > 0),
      day_of_week INTEGER CHECK (day_of_week BETWEEN 1 AND 7),
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
        (kind = 'weekly' AND day_of_week IS NOT NULL AND funding_mode IS NOT NULL
          AND day_of_month IS NULL AND target_date IS NULL AND custom_funding_mode IS NULL)
        OR (kind = 'monthly' AND day_of_week IS NULL AND funding_mode IS NOT NULL
          AND day_of_month IS NOT NULL AND target_date IS NULL AND custom_funding_mode IS NULL)
        OR (kind = 'yearly' AND day_of_week IS NULL AND funding_mode IS NOT NULL
          AND day_of_month IS NULL AND target_date IS NOT NULL AND custom_funding_mode IS NULL)
        OR (kind = 'custom' AND day_of_week IS NULL AND funding_mode IS NULL
          AND day_of_month IS NULL AND custom_funding_mode IS NOT NULL)
      )
    );

    CREATE INDEX category_groups_sort_order_idx ON category_groups(sort_order);
    CREATE INDEX categories_group_sort_order_idx ON categories(group_id, sort_order);
    CREATE INDEX categories_hidden_idx ON categories(hidden);
    CREATE INDEX transactions_account_id_idx ON transactions(account_id);
    CREATE INDEX transactions_category_id_idx ON transactions(category_id);
    CREATE INDEX transactions_date_idx ON transactions(date);
    CREATE INDEX transactions_group_id_idx ON transactions(transaction_group_id);
    CREATE INDEX transactions_kind_idx ON transactions(kind);
    CREATE UNIQUE INDEX transactions_group_account_unique_idx
      ON transactions(transaction_group_id, account_id)
      WHERE transaction_group_id IS NOT NULL;
    CREATE INDEX transaction_links_source_idx ON transaction_links(source_transaction_id);
    CREATE INDEX transaction_links_target_idx ON transaction_links(target_transaction_id);
    CREATE INDEX budget_allocations_month_idx ON budget_allocations(month);
    CREATE INDEX category_targets_kind_idx ON category_targets(kind);
  `,
};
