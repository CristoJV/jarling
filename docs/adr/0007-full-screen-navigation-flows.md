# ADR 0007: Route-backed full-screen creation flows

- Status: Accepted
- Date: 2026-08-20

## Context

Opening a transaction from Budget previously switched to the Transactions tab,
waited for that screen's complete query, and then mounted a native `Modal`. The
tab bar remained visible during part of the transition and the modal host
exposed a white background in dark mode. Nested full-screen modals for payee and
category selection compounded the delay and made Android back behavior
inconsistent.

## Problem

Tab-mediated modal workflows exposed intermediate UI, rebuilt editor state,
and produced platform-specific transition and Back behavior.

## Decision

Primary creation and editing flows use opaque routes in the root Expo Router
stack. Transaction and account creation open directly over the current route
and return with `back`, preserving the originating tab. Root full-screen routes
use horizontal transitions and paint the active theme background from their
first frame.

Transaction type, account, category, and payee selectors are full-screen flow
views owned by the transaction editor. They preserve the draft, animate
horizontally, and intercept Android hardware back before returning to the
editor. Native date dialogs and small confirmation/input dialogs may remain
modal when their interaction is genuinely bounded.

Data required for the first editor frame is queried independently from the
Transactions list. Payees are prefetched after that frame and their distinct
query is indexed.

## Consequences

- Opening an editor never switches tabs or mounts a second copy of a tab screen.
- Closing returns to Budget, Transactions, or Accounts according to the origin.
- Dark and light themes have no unpainted modal frame during full-screen entry.
- Full-screen flow state stays local to its owning editor and is discarded on
  exit.
- New primary workflows should use a root route rather than a full-screen
  React Native `Modal`.

## Alternatives considered

- Keeping the query-parameter handoff through Transactions was rejected because
  it couples creation to a tab and delays the editor.
- Passing complete transaction drafts through URL parameters was rejected
  because it is fragile, exposes internal state, and does not scale to nested
  selectors.
- Making every small prompt a route was rejected because confirmations and
  short input dialogs do not benefit from full-screen navigation.
