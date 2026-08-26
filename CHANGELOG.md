# Changelog

All notable user-facing changes to Jarling are documented here. The project
follows [Semantic Versioning](https://semver.org/).

## [1.1.0](https://github.com/CristoJV/jarling/compare/v1.0.0...v1.1.0) (2026-08-26)


### Features

* **budget:** improve move money and category selection ([05ed8d7](https://github.com/CristoJV/jarling/commit/05ed8d7e24663baf8d969e3feb4ba94fe6c6007d))
* **budget:** refine targets, categories and transaction flows ([0ac2b9f](https://github.com/CristoJV/jarling/commit/0ac2b9fa101b5d376b4d2bbfd56078479df2f4e5))
* improve encrypted backups and budget feedback ([82260ea](https://github.com/CristoJV/jarling/commit/82260eafcaa8e51d6f0bc0beffb9406621999dfa))
* **targets:** Unify monthly targets for weekly, montly and yearly targets ([9fdc5b7](https://github.com/CristoJV/jarling/commit/9fdc5b745c05990e38abb8cabc31b9b327f40cdb))
* **ui:** refine visual system and incremental transaction search ([8952a69](https://github.com/CristoJV/jarling/commit/8952a69d12e497337ec372f991a6a669fcc79b16))
* unify plan restore, category selection, and money movement flows ([edce71e](https://github.com/CristoJV/jarling/commit/edce71ea7c02a54a05c3aec9a863d2aae4574f70))


### Bug Fixes

* make encrypted backup restore reliable across platforms ([aa162e5](https://github.com/CristoJV/jarling/commit/aa162e5c85518df66569406b856be9a4f7b536eb))
* **ui:** Smoth progress bar with correct weekly segments, continuous internal regions and a proportional segment for overflow if required ([5d04564](https://github.com/CristoJV/jarling/commit/5d045644fadd5b276f8bfd17b55a357ad3c1598a))

## [Unreleased]

No user-facing changes have been recorded after the 1.0.0 release candidate.

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
