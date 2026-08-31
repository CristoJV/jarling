# Interaction design

## Navigation and ownership

Budget, Accounts, Transactions, and Reports are persistent tabs. A workflow
that occupies the viewport is an opaque root-stack route opened over the
current tab; Back returns to that origin. Transaction selectors preserve an
editor-owned draft rather than reconstructing the editor through URL state.

Full-screen routes use short horizontal movement and paint the current theme
from their first frame. Compact sheets rise from the bottom while their
backdrop fades independently. Central dialogs fade and scale. Reduce Motion
replaces displacement with a short fade where appropriate.

## Insets and input

Screens, sheets, tab feedback, and primary actions respect Android gesture and
three-button navigation plus iOS safe areas. Native keyboards resize the usable
viewport, and focused fields and Save actions remain reachable. Bottom spacing
uses the greater of requested padding and the safe-area inset rather than
adding both blindly.

Custom numeric keypads consume layout space instead of overlaying content.
The shared money calculator uses terminal-style digit entry and resolves
pending multiply, divide, add, or subtract operations on another operator,
Equals, Done, Save, or blur. Invalid or unsafe results do not replace the last
valid amount.

## Shared flows

The category selector is one configurable full-screen flow. Callers determine
whether Ready to Assign is available, whether creation is allowed, and which
categories are valid. New Outflow defaults to virtual Uncategorized; new Inflow
defaults to Ready to Assign. Category inflows are offered only for supported
on-budget accounts.

Search is progressive: selecting a suggestion applies it, returns to results,
and preserves removable filters for further refinement. Full-screen creation
flows remain mounted across selectors. Small date, rename, memo, and
confirmation interactions may use an appropriately placed native or custom
dialog.

Financial meaning is never color-only. Icon-only controls require accessible
labels and adequate targets. Dates, currency, symbol placement, and number
format follow app preferences. Light and dark themes retain the same hierarchy.

See [ADR 0007](../adr/0007-full-screen-navigation-flows.md).
