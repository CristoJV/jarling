# RFC 0008: Budget read scaling

- Status: Draft
- Last reviewed: 2026-10-03

## Problem

Loading a budget month currently assembles broad allocation and transaction
histories before calculating the visible result. Read cost will grow with the
entire lifetime of a plan, even for a recent month.

## Proposal

Measure first, then add bounded repository queries or monthly aggregates only
where profiling shows value. Preserve the current pure domain calculation as a
reference implementation for equivalence tests.

## Impact and exit criteria

Create representative large-plan benchmarks and query-count assertions. Any
optimized path must return byte-for-byte equivalent monetary values and remain
compatible with restore and migration flows.
