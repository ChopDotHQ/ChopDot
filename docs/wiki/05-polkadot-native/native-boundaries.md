---
title: Native Boundaries
status: current
owner: Dev
last_reviewed: 2026-07-14
review_frequency: weekly
source_of_truth: false
related_code:
  - src/chopdot-dot/polkadotSession.ts
  - .worktrees/portable-shell-trial/src/environment/polkadotHostBridge.ts
related_docs:
  - .cursor/rules/chopdot-dot-programme.mdc
  - .cursor/rules/chopdot-dot-implementation.mdc
tags:
  - polkadot-native
  - boundaries
---

# Native Boundaries

Do not confuse product truth with adapter behavior.

## Rule

Track 1 capture can remain hybrid while Programme B native truth requires host-first signed, encrypted, replayable state.

Static `.dot` delivery proves hosting only. Identity, Statement Store,
payments, and receipt storage must each pass their own runtime gate before the
native journey can be promoted.

## Source Truth

- `.cursor/rules/chopdot-dot-programme.mdc`
- `.cursor/rules/chopdot-dot-implementation.mdc`
