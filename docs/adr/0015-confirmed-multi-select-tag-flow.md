# ADR 0015: Confirmed multi-select transaction tag flow

- Status: Accepted
- Date: 2026-10-16

## Context

The transaction editor already owns drafts while full-screen account, category,
and payee selectors temporarily cover it. Tags differ because multiple rows can
be toggled, a new name can be drafted, and the same component must serve the
transaction search filter without permitting catalogue creation there.

## Problem

Applying each tap immediately would make Back unable to cancel a partial
selection. Persisting a newly typed tag before the transaction Save would leave
unintended catalogue entries when the editor is discarded. A bottom action can
also be obscured by native keyboards or system navigation.

## Decision

- The full-screen tag selector owns a temporary multi-selection draft. Tapping
  toggles a checkbox row, Clear all empties it, Back discards it, and Confirm
  returns it to the parent draft.
- A typed non-duplicate name becomes a selected draft tag. Persistence waits
  for the transaction Save and shares that transaction's unit of work.
- When search is empty, show up to three most recently used tags followed by
  the remaining tags alphabetically without duplication. Searching removes the
  recent section.
- Place Confirm in the keyboard-responsive bottom layout and display the
  selection count. Rows expose checkbox accessibility state.
- The editor allows creation; the Transactions filter reuses the selector with
  creation disabled.
- Transaction filtering matches any selected tag. One grouped removable chip
  represents the selection, and Without tags remains a distinct filter.

## Consequences

- Users can explore and cancel multi-selection without mutating the editor.
- Discard protection includes tag-only changes.
- New tag and filter behavior remain consistent across English and Spanish.
- Selecting every required tag is a separate future mode; the initial filter is
  deliberately any-match.

## Alternatives considered

- Closing after every tag tap was rejected because it prevents efficient
  multi-selection.
- Applying toggles directly to the editor was rejected because Back would have
  surprising commit semantics.
- Reusing the existing floating add button was rejected because its plus-sign
  affordance is incorrect for confirmation and does not define keyboard layout.
