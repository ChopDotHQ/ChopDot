---
title: Statement Store
status: draft
owner: Dev
last_reviewed: 2026-07-14
review_frequency: weekly
source_of_truth: false
related_code:
  - src/chopdot-dot/polkadotSession.ts
  - .worktrees/portable-shell-trial/src/environment/polkadotHostBridge.ts
  - .worktrees/portable-shell-trial/src/environment/encryptedSession.ts
  - .worktrees/portable-shell-trial/src/environment/hostSessionSync.ts
related_docs:
  - .cursor/rules/chopdot-dot-programme.mdc
  - docs/wiki/03-state-models/native-session-state.md
tags:
  - polkadot-native
  - statement-store
---

# Statement Store

Statement Store is the candidate transport for shared signed ChopDot events.

## Boundary

Statement Store can move events. It does not decide who owes, who paid, who confirmed, or what can close.

ChopDot's bridge now rejects plaintext packets and derives a private routing
name from the group id plus a 32-byte session secret. Session events are
append-only: they do not share a last-write-wins channel, because concurrent
participant actions must not replace one another.

The official local host simulator now proves five distinct Product Accounts
can publish five concurrent encrypted events and converge without retries. It
also proves wrong-secret isolation and duplicate suppression.

A separate real-UI run now proves five isolated participants using only normal
ChopDot controls through saved summary. The test relay transports official
signed statements but never calls the reducer or mutates product state. This
closes the local UI-binding gate; it remains local SDK proof, not a live-network
claim.

The tested Statement Store has a 512-byte signed-payload limit. ChopDot chunks
larger encrypted events and applies them only after complete reassembly and
validation. The tested statement signer is also distinct from the Product
Account key. The current local model binds the first valid statement signer to
the stable Product Account participant and rejects later signer changes. Live
promotion requires a host-owned attestation or equivalent authority contract.

The live host reports the Statement Store manager available. Live publish,
subscribe, signer attribution, replay, and separate-device convergence still
require runtime proof after Product Account login becomes usable.

## Source Truth

- `.cursor/rules/chopdot-dot-programme.mdc`
- `docs/wiki/03-state-models/native-session-state.md`
- `.worktrees/portable-shell-trial/proof/polkadot-host-stress/report.json`
- `.worktrees/portable-shell-trial/proof/polkadot-host-real-ui/report.json`
