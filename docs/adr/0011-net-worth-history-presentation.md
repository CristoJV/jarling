# ADR 0011: Net Worth presents monthly history as a scrollable line

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

Reports already derive a closing Net Worth snapshot for every month but exposed
it only as a vertical asset/debt breakdown.

## Problem

The direction and scale of Net Worth changes were difficult to scan.

## Decision

Render the existing monthly snapshots oldest-to-newest in a six-step horizontal
line chart. Open on at most five recent points with one empty step, allow access
to older points by scrolling, and keep the Y axis free of divisions. Use the
muted report surface for the Net Worth summary.

## Alternatives considered

Compress the full history into one fixed-width chart or persist separate chart
snapshots.

## Consequences

Long histories stay legible without adding stored derived state; sparse and
negative histories use the same presentation.
