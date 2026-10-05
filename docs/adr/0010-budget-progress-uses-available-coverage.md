# ADR 0010: Budget progress uses total available coverage

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

Target progress and spend coverage are different values when money rolls over.

## Problem

Using target funding as spend coverage falsely marked covered spending red and
split a monthly bar at the target amount.

## Decision

Use `available + net spending` as visual spend coverage. Monthly targets remain
one segment; red represents only spending beyond that coverage. Target funding
continues to decide whether the target color is complete or warning.

## Alternatives considered

Use current-month target funding for both target completion and spend coverage.

## Consequences

Rollover and current assignment are presented as one pool without changing
accounting or target calculations.
