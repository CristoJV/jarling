# Jarling documentation

This is the entry point for Jarling's English documentation. Each section has a
different purpose and only one section owns the complete explanation of a
concept.

## Choose your path

### Use Jarling

- [Getting started](user/getting-started.md)
- [Budgeting and monthly rollover](user/budgeting.md)
- [Transactions and accounts](user/transactions-and-accounts.md)
- [Targets and reports](user/targets-and-reports.md)
- [Privacy, backups, and data](user/privacy-and-data.md)

These guides describe what the released application does and what users should
expect. They deliberately avoid storage and code-level details.

### Develop Jarling

- [Architecture](technical/architecture.md)
- [Financial model](technical/financial-model.md)
- [Persistence and portability](technical/persistence-and-portability.md)
- [Interaction design](technical/interaction-design.md)
- [Testing and contributing](technical/testing-and-contributing.md)

Technical documents describe the current system: boundaries, invariants, and
contracts that changes must preserve. They are not class-by-class API docs.

### Understand decisions and possible futures

- [Architecture Decision Records](adr/README.md) explain accepted historical
  decisions and their trade-offs. Current behavior still belongs in `user/` or
  `technical/`.
- [Requests for Comments](rfc/README.md) describe proposals that are not
  implemented. An RFC is not a product promise.
- [Changelog](../CHANGELOG.md) records concise release history.

## Canonical-document rule

`user/` and `technical/` describe the present. `adr/` explains decisions that
were made. `rfc/` describes potential future changes. A proposal must not be
presented as existing behavior, and a completed implementation must be folded
into the present-tense documentation instead of remaining an active plan.

## Update policy

Documentation is reviewed deliberately and in batches. Do not update guides,
create ADRs, or create RFCs automatically for every implementation or
refactor. Perform a documentation synchronization only when explicitly
requested. During that review, use current code and tests as the authority,
remove obsolete material, and update this index when ownership changes.
