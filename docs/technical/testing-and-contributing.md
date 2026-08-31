# Testing and contributing

## Quality strategy

Test the narrowest authoritative layer first:

- Domain unit tests cover money, classification, balances, rollover, targets,
  reports, credit funding, and transfer-pair invariants.
- Application tests cover validation, orchestration, atomic use cases, and
  repository interactions using in-memory adapters.
- Infrastructure tests cover SQLite mapping, schema/migrations, transactions,
  encrypted codecs, validation, and export/restore round trips.
- Presentation tests cover reusable state machines, view models, filters, and
  critical component behavior.
- Maestro and manual device checks cover navigation, keyboards, safe areas,
  themes, Android Back, and real platform dialogs.

Regression tests should characterize existing behavior before a risky change.
A missing unrelated feature discovered during that work does not automatically
expand the change's scope.

## Local validation

Install the exact dependency graph with `npm ci`, then run the checks relevant
to the change. The complete gate is:

```bash
npm run doctor
npm run format:check
npm run typecheck
npm run lint
npm run test:coverage
npm run export:web
npm run export:android
npm run export:ios
```

`npm run test:e2e` additionally requires Maestro and a running native build or
emulator. Native release work must also be exercised on a small Android device
or emulator with gesture and three-button navigation.

## Change rules

- Keep financial formulas in Domain and orchestration in Application.
- Use `UnitOfWork` for every multi-record financial mutation.
- Do not persist derived totals to simplify one screen.
- Treat existing user changes in the worktree as owned by the user.
- Update schema and migrations according to the released baseline contract.
- Add a backup-version migration only when the portable format changes.
- Do not expose development sample data in production.
- Do not broaden a feature because analysis reveals an unrelated limitation.

Documentation is updated in an explicit documentation-review task, not as an
automatic requirement of every code change. See the
[documentation policy](../README.md#update-policy).
