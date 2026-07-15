---
title: Bulletin
status: draft
owner: Dev
last_reviewed: 2026-07-14
review_frequency: weekly
source_of_truth: false
related_code:
  - src/chopdot-dot/receiptPacket.ts
  - .worktrees/portable-shell-trial/src/environment/polkadotHostBridge.ts
related_docs:
  - .cursor/rules/chopdot-dot-programme.mdc
  - docs/wiki/03-state-models/pot-closeout-state.md
tags:
  - polkadot-native
  - bulletin
---

# Bulletin

Bulletin is a candidate storage layer for redacted closeout receipts.

## Boundary

Storage is not payment truth. A saved receipt is a record of the ChopDot closeout, not proof that every payment moved unless the record says so.

The portable host bridge accepts only an explicitly redacted receipt packet for
the preimage path. The live host exposes the receipt archive manager; submit and
retrieval remain unproven.

## Source Truth

- `.cursor/rules/chopdot-dot-programme.mdc`
- `docs/wiki/03-state-models/pot-closeout-state.md`
