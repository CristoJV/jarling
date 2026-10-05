# ADR 0012: Monthly reports expose direction and change

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

Monthly Income and Net Worth values showed composition and closing totals, but
their direction of change required comparing rows mentally.

## Problem

Users need to distinguish a Net Worth balance from its monthly movement and to
scan positive and negative Net Income at a glance.

## Decision

Show each Net Worth closing value with a separately colored signed change from
the previous close. Add a centered Net Income bar chart where positive values
grow upward in green and negative values grow downward in red. Reuse the
six-step, five-populated-entry viewport and complete monthly history established
for Net Worth.

## Alternatives considered

Color the entire Net Worth row by monthly movement, or show Net Income with an
always-positive magnitude chart and a separate sign legend.

## Consequences

Balance sign and monthly direction remain independent, and both historical
reports share one navigation model without persisting derived values.
