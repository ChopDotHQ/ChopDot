---
title: ChopDot Dot Overview
status: current
owner: Dev
last_reviewed: 2026-07-15
review_frequency: weekly
source_of_truth: false
related_code:
  - src/chopdot-dot/polkadotSession.ts
  - .worktrees/portable-shell-trial/src/environment/polkadotHostBridge.ts
  - .worktrees/portable-shell-trial/src/environment/encryptedSession.ts
  - .worktrees/portable-shell-trial/src/environment/hostSessionSync.ts
related_docs:
  - .cursor/rules/chopdot-dot-programme.mdc
  - .cursor/rules/chopdot-dot-implementation.mdc
  - product/cards.md
  - docs/wiki/08-context-intake/w3s-open-source-map-2026-07-07.md
  - .worktrees/portable-shell-trial/HOSTS.md
  - docs/adr/0005-portable-product-native-host-boundary.md
tags:
  - polkadot-native
  - chopdot-dot
  - portable-shell
---

# ChopDot.dot Overview

ChopDot.dot is the Polkadot-native direction for ChopDot.

## Current Evidence

- Static `.dot` delivery is proven on Paseo.
- The portable ChopDot group-money shell is deployed at
  `chopdot-shell-proof.dot` and passes the complete local-state journey inside
  the current host.
- The Polkadot iOS and Android source repositories are public reference
  implementations. They are explicitly unaudited prototypes and are not normal
  App Store or Google Play downloads yet.
- The portable shell now has a typed Product SDK boundary for product-scoped
  identity, encrypted Statement Store packets, observed-only payment status,
  and redacted receipt archive input.
- The bridge-enabled bundle is deployed. Its live capability report sees a real
  host container, reports Product Account identity as `needs_login`, and finds
  Statement Store, payment, and receipt archive managers available.
- The real host account control opens the Polkadot Mobile QR login ceremony.
  This is browser-proven, but the QR has not been completed because no
  distributed Polkadot Mobile client is installed. Full Xcode is not a ChopDot
  requirement; building the community iOS source is only an optional fallback.
- Parity's official `@parity/host-api-test-sdk@0.10.0` now passes the complete
  local integration sequence with separate Alice and Bob Product Accounts:
  encrypted shared-session convergence, observed-only payment status, and
  redacted receipt submit/retrieval. The report is
  `.worktrees/portable-shell-trial/proof/polkadot-host-sim/report.json`.
- The same official simulator now passes a five-person stress run with five
  distinct Product Accounts, five concurrent encrypted events received by
  every host without retries, wrong-secret isolation, duplicate suppression,
  three isolated observed-only payments, and a redacted receipt. The report is
  `.worktrees/portable-shell-trial/proof/polkadot-host-stress/report.json`.
- That stress run caught a shared-channel last-write-wins defect that the
  two-person test missed. Session events are now explicitly append-only.
- A separate five-person real-UI proof now runs Mina, Leo, Nina, Omar, and Vera
  through the normal portable-shell screens in five isolated official test
  hosts. The journey covers first entry, group creation, one spend, four
  payment links, four payer actions, four receiver confirmations, finish, and
  the saved summary. No developer actions or direct state mutation are used.
  The report is
  `.worktrees/portable-shell-trial/proof/polkadot-host-real-ui/report.json`.
- A further five-person wallet run now replaces the old report-backed payment
  simulation for PAS. Mina, Leo, Nina, Omar, and Casey use separate browser
  profiles; each payer taps `Pay Mina`; four disposable funded wallets sign
  four real Polkadot Hub TestNet transactions; every peer checks the finalized
  transaction directly; and the group closes with zero open amount. See
  `.worktrees/portable-shell-trial/proof/polkadot-host-wallet-settlement/`.
- The real-UI proof exposed two host constraints now handled locally: signed
  Statement Store payloads have a 512-byte limit, so larger encrypted events
  are chunked and reassembled; and the tested Statement Store signer differs
  from the Product Account key, so the first valid signer is bound to the
  stable Product Account participant. A live host-owned attestation for that
  binding remains required before production promotion.

## Remaining Boundary

The current `.dot` proof is product portability plus live capability discovery,
with the full manager sequence proven in the official local host simulator. It
is not full live-native truth. It does not yet prove completed Product Account
sign-in, live multi-person Statement Store convergence, live receipt
submit/retrieval, or an exact live host payment as one integrated ChopDot
journey. The PAS connected-browser-wallet path is now proven in the current
local build against the public testnet, but it has not yet been redeployed into
the live `.dot` bundle and does not prove the host PaymentManager. Those gates
remain experimental and must stay fail-visible.

The local capability proof correctly reports these capabilities as unavailable
outside a compatible host, while the live proof reports their real host state.
Full Xcode is not installed on the current workstation. This affects only the
optional iOS source-build route and is not a failed or blocked ChopDot gate.

The live identity gate is therefore `blocked_external_distribution`, not
`not_started`: ChopDot reaches the real login prompt, while a runnable client
is the missing piece.
The real-UI binding gate is complete locally. It proves normal product behavior
across five isolated official test hosts, but it does not turn local SDK proof
into a live-network, live-mobile, or real-payment claim.

## Architecture Rule

ChopDot remains one portable React product. The native Parity applications are
host and conformance references, not an application architecture for ChopDot to
copy. See ADR 0005.

## Product Rule

Polkadot-native infrastructure must reduce friction or increase trust invisibly.

## Source Truth

- `.cursor/rules/chopdot-dot-programme.mdc`
- `.cursor/rules/chopdot-dot-implementation.mdc`
- `src/chopdot-dot/polkadotSession.ts`
- `docs/adr/0005-portable-product-native-host-boundary.md`
