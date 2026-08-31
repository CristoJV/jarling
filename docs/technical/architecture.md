# Architecture

Jarling is a local-first Expo application organized as a pragmatic clean
architecture:

```text
Presentation → Application → Domain ← Infrastructure
                         ↑
                     Bootstrap
```

## Responsibilities

- `src/domain` owns entities, value objects, errors, repository contracts, and
  pure financial calculations. It has no React Native, Expo, or SQLite
  dependency.
- `src/application` coordinates use cases through Domain repositories and ports.
  It defines transaction boundaries and translates user intent into domain
  operations.
- `src/infrastructure` implements persistence, portability, and platform
  services. SQLite repositories map records without owning financial policy.
- `src/bootstrap` is the composition root. It creates adapters, repositories,
  and application services and is the only layer that wires concrete
  implementations together.
- `src/presentation` owns screens, reusable components, themes, localization,
  navigation state, and view models. It consumes application services and does
  not execute SQL or reproduce accounting formulas.
- `src/app` contains the Expo Router route adapters. Routes stay thin and hand
  rendering and behavior to Presentation.

Dependencies point inward. Domain never imports an outer layer; Application
depends on abstractions rather than SQLite; Presentation cannot bypass a use
case for a financial write.

## Main read and write flows

A read use case loads source records through repositories, calls pure Domain
services, and returns a result suited to Presentation. Derived totals are not
persisted as a competing source of truth.

A write use case validates intent and performs every related repository change
inside `UnitOfWork`. Transfers, reconciliation, category reassignment, budget
moves, and restore must either commit completely or leave no partial state.

## Extending the product

1. Define the financial behavior and invariants in Domain.
2. Add or adapt a use case against repository or platform ports.
3. Implement boundary adapters in Infrastructure only when storage or platform
   behavior is required.
4. Wire the implementation in Bootstrap.
5. Expose it through Presentation without duplicating the policy.
6. Test from pure rules outward, including persistence and interaction seams
   proportional to the risk.

New cloud or synchronization work must enter through Application ports. The
local database remains the authoritative offline store, not a disposable cache.

See [Financial model](financial-model.md),
[Persistence and portability](persistence-and-portability.md), and
[ADR 0001](../adr/0001-local-first-clean-architecture.md).
