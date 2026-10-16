# ADR 0013: Assignment movement history follows current categories

- **Status:** Accepted
- **Date:** 2026-10-16

## Context

Jarling stores one allocation total per category and month. Users need to see
how that total changed without treating assignment changes as account
transactions. Categories may also be deleted or replaced, and the existing
product already removes or reclassifies their transactions and allocations.

## Problem

Preserving deleted category identities forever would turn a focused history
feature into a larger category-archival system. Rewriting history carelessly,
however, could make its totals disagree with the current budget.

## Decision

Store each assignment action as one movement with a positive amount, a budget
month, its real recording time, and source and destination locations. Ready to
Assign is a location but not a category. Allocation totals remain the source
used by budget calculations; movement history explains their changes and is
written in the same application unit of work.

Movement history is intentionally mutable and follows the current category
structure rather than acting as an immutable audit log:

- deleting a category without replacement maps every occurrence of it to Ready
  to Assign;
- replacing a category maps every occurrence of it to the replacement;
- mappings apply to both source and destination;
- movements whose endpoints become equal are removed.

Existing non-zero allocations migrate as synthetic baseline movements. Their
actual occurrence time is unknown, so they are identified as migration
baselines and displayed at the start of their budget month.

## Alternatives considered

Keep deleted category identities forever or archive categories. This would
preserve immutable history but materially expand category lifecycle and user
interface complexity. Store two independent signed changes per move. This was
rejected because it loses the source-to-destination relationship.

## Consequences

- Category history remains understandable using the plan's current categories
  and agrees algebraically with merged or removed allocation totals.
- Deleting or replacing a category can change how earlier movements are shown.
- The history must not be described as an immutable audit trail.
- When movements are combined with Activity in the monthly Available chart,
  category reinterpretation can also change the earlier plotted balance path.
- Writes, category reinterpretation, backup restore, and migration must keep
  allocation totals and movements consistent atomically.
- A category-to-category move remains one operation even though it changes two
  allocation totals.
