# Architecture Decision Records

This directory records decisions whose rationale must survive individual code
changes. ADRs are immutable after acceptance: if a decision changes, add a new
ADR that supersedes the previous one instead of rewriting history.

## Status values

- **Proposed**: under discussion and not yet binding.
- **Accepted**: the current architectural contract.
- **Superseded**: replaced by a later ADR, which must be linked.
- **Rejected**: considered but deliberately not adopted.

## Index

| ADR                                                    | Decision                                           | Status   |
| ------------------------------------------------------ | -------------------------------------------------- | -------- |
| [0001](0001-local-first-clean-architecture.md)         | Local-first pragmatic clean architecture           | Accepted |
| [0002](0002-envelope-budgeting-domain-rules.md)        | Envelope-budgeting financial invariants            | Accepted |
| [0003](0003-sqlite-baseline-and-forward-migrations.md) | Direct SQLite baseline and forward-only migrations | Accepted |
| [0004](0004-data-protection-and-portability.md)        | Data protection and portability boundaries         | Accepted |
| [0005](0005-first-release-scope.md)                    | First-release scope and deferred CSV import        | Accepted |
| [0006](0006-atomic-sqlite-application-writes.md)       | Atomic SQLite application writes                   | Accepted |
| [0007](0007-full-screen-navigation-flows.md)           | Route-backed full-screen creation flows            | Accepted |

## Creating an ADR

Copy the structure used by the existing records, choose the next four-digit
number, and include context, decision, consequences, and alternatives. Keep
implementation detail in code or technical documentation unless it explains a
long-lived trade-off.
