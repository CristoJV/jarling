# RFC 0004: Future assignment reservation

- Status: Draft
- Last reviewed: 2026-10-03

## Problem

Positive and negative allocations in a future month can cancel each other when
calculating the amount reserved from Ready to Assign. That may release money
that is still required by another category in the same month.

## Proposal

Specify reservation as a peak funding requirement over the future timeline,
not merely a signed monthly net. Build a pure calculation from per-category
allocations and month balances, then use it in Budget funding state.

## Impact and exit criteria

Add cases for mixed positive/negative assignments, moves between categories and
several future months. Ready to Assign must never overstate spendable money,
while genuine future de-assignments must not be counted twice.
