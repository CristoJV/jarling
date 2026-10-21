# Version 4 and editor visual polish

## Goal

Keep the unreleased database upgrade linear and improve the placement and visual
clarity of transaction-tag and category actions.

## Phase 1 — Single version 4 migration

- [x] Remove the pre-release version 4 repair path and its special metadata.
- [x] Retain one complete version 3 to 4 migration for assignment history and
      transaction tags.

Checkpoints:

- [x] Clean databases and released version 3 fixtures still reach version 4.
- [x] The migration remains transactional, idempotent, and integrity-checked.

## Phase 2 — Transaction and category action layout

- [x] Keep the tag confirmation action above the native keyboard.
- [x] Place Tags immediately after Date in the transaction editor.
- [x] Integrate category Move Money and Details labels into their buttons and
      replace the overflow icon with a details icon.

Checkpoints:

- [x] Confirm remains reachable while the tag search input is focused.
- [x] Transaction field ordering and category action accessibility are explicit.
- [x] Full tests, typecheck, lint, formatting, and diff checks pass.
