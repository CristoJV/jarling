# RFC 0009: Presentation interaction test coverage

- Status: Draft
- Last reviewed: 2026-10-03

## Problem

Most financial rules have unit coverage, but important screen interactions
such as discard prompts, destructive-action pending states and route fallbacks
have less direct regression protection.

## Proposal

Add a small interaction-test layer around extracted visual sections and flow
screens. Prioritize behavior that coordinates async state or navigation; avoid
large snapshots and duplicating domain tests.

## Impact and exit criteria

Provide shared render helpers for localization, theme and application context.
Cover the highest-risk save/delete/dismiss paths with readable assertions and
keep the suite fast enough for the normal pre-commit test command.
