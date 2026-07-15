---
title: Native Session State Model
status: draft
owner: Dev
last_reviewed: 2026-07-14
review_frequency: weekly
source_of_truth: false
related_code:
  - src/chopdot-dot/polkadotSession.ts
  - .worktrees/portable-shell-trial/src/environment/polkadotHostBridge.ts
  - .worktrees/portable-shell-trial/src/environment/encryptedSession.ts
related_docs:
  - docs/wiki/05-polkadot-native/chopdot-dot-overview.md
  - docs/wiki/05-polkadot-native/native-boundaries.md
  - .cursor/rules/chopdot-dot-programme.mdc
tags:
  - state-model
  - polkadot-native
---

# Native Session State Model

Native session state is the no-Supabase direction for ChopDot.dot.

## Current Boundary

Static `.dot` delivery and live host capability discovery are proven. The
portable shell now has a typed host boundary and encrypted packet format. The
live host reports Statement Store available and identity `needs_login`, but
completed product-scoped login and two-device convergence are not yet proven.

Host packets are inputs. After decryption, ChopDot still validates actor,
payment intent, ordering, duplication, and closeout rules before applying an
action.

## Source Truth

- `.cursor/rules/chopdot-dot-programme.mdc`
- `.cursor/rules/chopdot-dot-implementation.mdc`
- `src/chopdot-dot/polkadotSession.ts`
