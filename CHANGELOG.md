# Changelog

All notable user-facing changes to Jarling are documented here. The project
follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

The first public build is being validated. See the
[release checklist](docs/release-checklist.md).

### Changed

- Transaction, payee, category, account, and account-type creation flows now
  use theme-safe full-screen navigation without switching tabs.
- New expenses default to the built-in Uncategorized category, while the
  financial and backup boundaries reject category-less expenses.
- Transaction search applies one refinement at a time and sample data controls
  are visible only in development builds.

## [1.0.0] - TBD

### Added

- Local-first envelope budgeting with monthly allocations and rollover.
- Cash, credit, and tracking accounts with transfers and reconciliation.
- Transactions, payees, memos, search, targets, and reports.
- English and Spanish interfaces with light, dark, and system themes.
- Human-readable JSON exports and password-encrypted `.jarling` backups.
- Optional device-credential application lock.

[Unreleased]: https://github.com/CristoJV/jarling/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/CristoJV/jarling/releases/tag/v1.0.0
