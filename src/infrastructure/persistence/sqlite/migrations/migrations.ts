import type { Migration } from './migration';

/**
 * Forward-only changes for databases created by an earlier public release.
 * Fresh installations use current-schema.ts directly. Released databases
 * advance through this list without rebuilding user data.
 */
export const migrations: readonly Migration[] = [
  {
    version: 2,
    name: 'target_monthly_schedule',
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
    `,
  },
];
