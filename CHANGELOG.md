# Changelog

All notable user-facing changes to Jarling are documented here. The project
follows [Semantic Versioning](https://semver.org/).

## [1.1.0](https://github.com/CristoJV/jarling/compare/v1.0.0...v1.1.0) (2026-08-26)

### Features

- Add unified Monthly Target calculations for weekly, monthly, yearly, and custom targets.
- Add weekly occurrence tracking, including optional previous weeks and monthly rollover behavior.
- Add segmented target progress with funded, spent, underfunded, and proportional overspending states.
- Add safe category deletion with transaction reassignment and Ready to Assign recovery.
- Improve category selection, in-context category creation, and Move Money workflows.
- Add incremental transaction search with refinable account, category, status, payee, and memo filters.
- Add encrypted `.jarling` backups with validation, progress feedback, version migration, and cross-platform restore support.
- Improve Budget status banners, navigation transitions, themes, and reusable selection components.

### Bug Fixes

- Fix encrypted backup restoration across JavaScript and native environments.
- Fix weekly target segments so internal states remain continuous and overspending uses a single proportional overflow segment.
- Fix legacy Uncategorized transactions and allocations during database migration.
- Fix inconsistent navigation and selection state across transaction and budgeting flows.


## [1.0.0] - 2026-08-25

### Added

- Local-first envelope budgeting with monthly allocations and rollover.
- Cash, credit, and tracking accounts, atomic transfers, account details, and
  reconciliation against a real-world balance.
- Transactions with payees, categories, memos, cleared states, refinable
  search, calculator input, linked records, and swipe-to-delete confirmation.
- Protected `Uncategorized` group and category as the safe default for new
  expenses.
- Weekly, monthly, yearly, and custom targets with monthly funding guidance,
  progress states, and category details.
- Ready to Assign and category-to-category money movement with actionable
  insufficient-funds errors.
- Spending, income-versus-spending, and net-worth reports.
- English and Spanish interfaces with light, dark, and system themes.
- Budget display preferences, human-readable JSON exports, and independently
  password-encrypted `.jarling` backups with validated restore.
- Optional device-credential application lock.

### Changed

- Full-screen workflows now use theme-safe route navigation and return to the
  originating tab without reconstructing transaction drafts.
- Keyboards, custom money keypads, bottom sheets, and tab feedback share safe
  area behavior that respects Android system navigation.
- Category and target progress distinguish underfunded, on-track, complete,
  spent, and overspent states from derived financial data.
- Sample-data controls are restricted to development builds.

### Internal

- Established a direct SQLite schema-version-1 baseline with a retained
  forward-only migration engine for post-release changes.
- Financial writes use application-level units of work and database
  constraints; automated tests cover domain, application, persistence, and
  backup boundaries.
- Aligned the SQLite and backup contracts with categorized credit-card payment
  transfers.

[Unreleased]: https://github.com/CristoJV/jarling/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/CristoJV/jarling/releases/tag/v1.0.0
