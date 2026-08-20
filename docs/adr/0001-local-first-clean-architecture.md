# ADR 0001: Local-first pragmatic clean architecture

- Status: Accepted
- Date: 2026-08-20

## Context

Jarling handles personal financial information and must remain useful without
an account, network connection, or Jarling-operated backend. Its financial
rules also need to be testable independently from React Native, Expo, and
SQLite.

## Decision

Jarling is local-first and uses this dependency direction:

```text
Presentation → Application → Domain ← Infrastructure
                         ↑
                     Bootstrap
```

Domain contains entities, values, and pure financial calculations. Application
coordinates use cases through ports. Infrastructure implements those ports.
Bootstrap is the only composition root. Presentation does not execute SQL or
reimplement financial formulas.

No network service is required for the core product. A future synchronization
feature must enter through an application port and must not make the local
database a disposable cache.

## Consequences

- Financial behavior can be tested without a device or database.
- Expo and SQLite changes remain at the boundaries.
- Some mapping and composition code is intentionally explicit.
- Cross-layer shortcuts are rejected even when convenient for a single screen.

## Alternatives considered

- A React-centric global store was rejected because it would couple financial
  rules to UI lifecycle.
- A mandatory cloud backend was rejected because it conflicts with offline use
  and the privacy model.
