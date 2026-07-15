---
title: Portable Product and Native Host Boundary
status: current
owner: Dev
last_reviewed: 2026-07-14
review_frequency: quarterly
source_of_truth: true
related_code:
  - .worktrees/portable-shell-trial/src/environment/polkadotHostBridge.ts
  - .worktrees/portable-shell-trial/src/environment/encryptedSession.ts
related_docs:
  - .worktrees/portable-shell-trial/HOSTS.md
  - .worktrees/portable-shell-trial/plans/2026-07-14-polkadot-hosted-two-person-journey-v1.md
  - docs/wiki/05-polkadot-native/chopdot-dot-overview.md
tags:
  - adr
  - polkadot-native
  - portable-shell
  - product-sdk
---

# ADR 0005: Portable Product and Native Host Boundary

## Decision

ChopDot remains one portable React product. Web, Telegram, and the Polkadot
host run the same product journey and state semantics through replaceable host
adapters.

The Parity iOS and Android community applications are native host and
conformance references. ChopDot does not copy their UIKit/VIPER or Android
application architecture and does not maintain a second native ChopDot product.

The Polkadot host adapter may provide:

- product-scoped identity;
- encrypted ephemeral group packets through Statement Store;
- observed payment status for exact payment-intent matching;
- redacted receipt storage through the preimage/Bulletin path.

These host capabilities are inputs. The ChopDot command boundary and reducer
remain authoritative for who may act and whether a payment, group, or saved
record changes state.

## Context

The portable shell already completes the same Mina/Leo journey on web,
Telegram, and a live Paseo `.dot` deployment. The next question is not whether
to rebuild that interface in Swift. It is whether the native Polkadot host can
remove central dependencies beneath the same experience without changing what
users understand.

Parity's community mobile repositories are valuable because they expose the
host behavior, Product SDK integration, signing, device permission, storage,
and distribution conventions needed for conformance testing. Their internal
application structure solves the host's problem, not ChopDot's product problem.

## Consequences

- Normal ChopDot UI stays host-neutral and contains no Product SDK, Statement
  Store, Bulletin, `.dot`, protocol, proof, or adapter language.
- Capability probing never prompts the user. Login or permission requests occur
  only after an explicit product action needs them.
- Statement Store never receives plaintext participant or money data from
  ChopDot. Session packets are encrypted before publish.
- Shared money events are append-only. They must not share a Statement Store
  last-write-wins channel; channels are reserved for replaceable snapshots such
  as presence or latest status.
- A host payment completion is `observed_only` until an exact live ChopDot
  payment intent accepts it. It cannot confirm unrelated money or close a group.
- Only explicitly redacted receipt packets enter the host archive path.
- Missing host capabilities report `unavailable`, `needs_login`, or `error` in
  developer proof. The product must not simulate success.
- Full Xcode is a local prerequisite for compiling the iOS reference host; its
  absence does not block portable-shell or Product SDK boundary work.

## Verification

- `.worktrees/portable-shell-trial/npm run test:host-adapter`
- `.worktrees/portable-shell-trial/npm run test:payment-intents`
- `.worktrees/portable-shell-trial/npm run test:host-sim`
- `.worktrees/portable-shell-trial/npm run test:host-stress`
- `.worktrees/portable-shell-trial/npm run proof:host-capabilities`
- unchanged web, Telegram, and `.dot` product-journey proof packets
- future two-device host proof for identity, encrypted sync, payment matching,
  and redacted receipt retrieval
