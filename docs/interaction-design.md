# Jarling interaction design

This document records durable interaction behavior. It describes the resulting
experience rather than the sequence in which it was implemented.

## Navigation model

- Budget, Accounts, Transactions, and Reports are the four persistent tabs.
- Workflows that occupy the full viewport are opaque routes in the root Expo
  Router stack. They open over the current tab and Back returns to that exact
  origin.
- Full-screen routes use a short horizontal transition and paint the active
  theme from their first frame.
- Partial sheets rise from the bottom while their backdrop fades independently.
  Central dialogs fade and scale without exposing an unthemed frame.
- Native dialogs are reserved for dates, short input, and confirmations.
- The system Reduce Motion preference removes displacement or replaces it with
  a short fade.

See [ADR 0007](adr/0007-full-screen-navigation-flows.md) for the architectural
boundary between routes and modals.

## Viewport, safe areas, and keyboards

- Every screen and partial sheet respects all safe-area insets, including
  Android gesture and three-button navigation.
- The tab selection background is clipped to the tab bar and never extends
  into the system navigation area.
- A native keyboard resizes the usable viewport. The focused field and its
  primary action remain reachable instead of being covered.
- Android uses its native resize behavior without a second artificial offset.
  iOS applies keyboard avoidance using the real header offset.
- Long forms scroll only as much as needed to reveal the focused input.
- Custom numeric keypads participate in normal flex layout and consume space
  from the bottom; they are never absolutely overlaid on content.
- Bottom spacing uses the greater of the requested padding and safe-area inset,
  not their sum.

## Monetary input and calculator

- Direct digit entry behaves like a payment terminal: digits enter from minor
  units (`0.01`, `0.10`, `1.00`, `10.05`, `100.50`).
- The active amount displays a blinking cursor unless Reduce Motion is enabled.
- Focusing an existing value marks it for replacement. The first digit starts
  from zero; subsequent digits continue normal terminal entry.
- The shared keypad supports multiply, divide, add, subtract, equals, and Done.
- Starting a new operator resolves the previous pending expression. Equals,
  Done, Save, or leaving the amount resolves the final expression.
- Division by zero, non-finite results, and results outside safe integer minor
  units are rejected without corrupting the previous amount.
- The UI may display decimal intermediate values, but the value crossing the
  application boundary is always rounded integer minor units.

## Transaction workflow

- New Transaction opens immediately above the current tab without navigating
  through Transactions first.
- Type, payee, account, and category selectors are full-screen flow views owned
  by the editor. The editor remains mounted, so the complete draft and keypad
  state survive the round trip.
- Category selection is one configurable full-screen flow shared by
  transactions, category deletion, and Move Money. It groups results, supports
  search and in-context creation, and exposes Ready to Assign only when the
  caller explicitly enables that virtual option.
- New expenses initially show Uncategorized without creating or referencing a
  synthetic category record.
- The amount keypad is visible only while the amount has focus. Memo uses a
  spacious central editor and keeps Save visible above the native keyboard.
- Show more reveals secondary fields such as cleared status without permanently
  consuming the compact entry space.
- Closing a changed, unsaved transaction asks whether to continue editing or
  discard the draft.
- Transaction rows show status immediately after the amount: lock for
  reconciled, check for cleared, and an appropriate pending indicator for
  uncleared.
- A swipe beyond the delete threshold moves the complete row and asks for
  confirmation as soon as it is released. It does not require tapping a
  revealed action.

## Transaction search

- Search filters live inside the search experience and do not occupy permanent
  space in the transaction list.
- Empty search suggestions include available status filters, accounts, and
  categories, separated into labelled sections.
- Text suggestions offer Anything contains, Payee contains, and Memo contains.
- Selecting one suggestion applies that step, closes suggestions, refreshes
  results, and changes the prompt to Refine search.
- Applied filters remain removable chips. Reopening search exposes only useful
  refinements, and typing remains available after any selection.

## Budget and category workflow

- The month control uses a circular downward chevron and opens a centered
  year/month selector.
- Ready to Assign is informative rather than styled as navigation.
- Category groups use one consistent rotating chevron to expand and collapse.
- Category progress is segmented by spending transaction. Overspending keeps
  the funded portion bounded by the planned total and represents only the
  excess proportion in red.
- Target underfunding is yellow and communicates how much more is needed this
  month; on-track progress is green; full completion includes a check.
- Selecting a category opens Category Details. That screen shows previous
  availability, current Assigned, current Activity, current Available, target
  progress, target actions, and notes.
- Assign with insufficient Ready to Assign opens an actionable error dialog
  that reports the missing amount and offers Move Money.
- Quick category assignment is a compact bottom sheet with the shared
  calculator. It has one Done action, clear separation between calculator and
  Move Money/Details, no unnecessary scroll, and never enters the Android
  navigation area.
- Move Money is a compact full-screen route with one Done action, amount,
  stacked From/To selectors, a guarded swap, and the shared calculator. Ready
  to Assign is a virtual option only in this workflow.

## Account and target workflow

- Tapping an account opens Account Details rather than an action modal. Details
  show type, Working, Cleared, and Uncleared balances and offer rename,
  reconciliation, and close actions.
- Account Type is a full-screen explanation grouped into cash and credit
  choices before creation.
- Target creation and editing are full-screen routes. Weekly, monthly, yearly,
  and custom tabs expose only fields relevant to their semantics; dates use the
  platform date picker.
- Category Details reloads computed values after assignment or target changes
  instead of locally approximating the result.

## Accessibility and visual consistency

- Every icon-only action has an accessible label and an adequate touch target.
- Meaningful financial state is never conveyed by color alone.
- Amounts and dates follow the configured locale preferences.
- Light and dark themes use the same layout and interaction hierarchy.
- Loading work is split or deferred so the first themed frame is not blocked;
  deprecated `InteractionManager` is not used.

## Release acceptance

Automated tests verify financial state machines and shared layout helpers.
Device acceptance must additionally cover small Android screens, gesture and
three-button navigation, native keyboards, physical Back, both themes, and the
Reduce Motion preference. These checks must be recorded as part of each release
review.
