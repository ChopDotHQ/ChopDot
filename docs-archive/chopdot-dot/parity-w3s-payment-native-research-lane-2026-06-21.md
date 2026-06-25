# Parity W3S Payment + Native Research Lane

Status: `active-research`
Date: 2026-06-21
Programme: `B` native truth + payment evidence review

## Plain-English Summary

Parity's new W3S work does not give ChopDot a finished group-money product to copy. It gives us a stronger set of native building blocks and reference apps:

- `w3spay` shows how a customer scans a payment/receipt code, asks the Polkadot host to make a payment, and stores local receipt history.
- `t3rminal` shows how a merchant terminal can generate a QR payment request, publish as a `.dot` app, use Bulletin metadata, and run in a host-tested frame.
- `w3s-payment-processor` shows how a merchant reconciles payment streams, claims Coinage-style bearer payments, blocks premature closeout, and publishes encrypted reports.
- `polkadot-apps` gives the serious native path: host detection, Product Account/host APIs, Statement Store, and host-test-sdk examples.
- `polkadot-bulletin-chain` gives the archive path: content-addressed storage with authorization, retention, renewal, IPFS retrieval, and SDK helpers.

The smart ChopDot move is not "become W3SPay." It is:

```text
ChopDot group truth
-> checkout capture at the moment of purchase
-> signed person events
-> Statement Store sync
-> optional payment evidence from W3S/Coinage/Asset Hub-style rails
-> redacted Bulletin receipt packet
-> human confirmation and closeout stay in ChopDot
```

## Source Review

Primary sources reviewed:

| Source | What it is | ChopDot relevance |
| --- | --- | --- |
| [paritytech/w3spay](https://github.com/paritytech/w3spay) | Mobile-first customer checkout for W3S Receipts. Scans merchant receipt/payment codes, requests host-executed CASH payment, keeps local wallet-style receipts. | Payment request, QR/deeplink parsing, settlement status language, receipt history pattern. |
| [paritytech/t3rminal](https://github.com/paritytech/t3rminal) | Static `.dot` terminal app backed by pallet-revive contract and Bulletin metadata. Includes Coinage terminal tests. | Merchant/payment-request generation, host-tested QR flow, Coinage evidence model, Bulletin upload guardrails. |
| [paritytech/w3s-payment-processor](https://github.com/paritytech/w3s-payment-processor) | Per-merchant payment dashboard that monitors chain credits and Statement Store payments, claims supported Coinage payments, reconciles totals and reports. | Reconciliation, closeout blocking, encrypted report packets, "payment observed" vs "report finalized" discipline. |
| [paritytech/polkadot-apps](https://github.com/paritytech/polkadot-apps) | Reusable Polkadot app packages, including host, statement-store, storage, signer, tx, contracts, and examples. | Programme B implementation substrate: Host API Test SDK, Statement Store client, host detection, storage/signer packages. |
| [paritytech/polkadot-bulletin-chain](https://github.com/paritytech/polkadot-bulletin-chain) | Reference Bulletin Chain for authorized content-addressed storage, retrieval, retention, renewal, and SDK helpers. | G5 receipt archive and redacted packet storage. |

Important shared caveat: these repositories repeatedly label themselves as prototype/reference/proof-of-concept, experimental, not audited, and not production products operated by Parity. ChopDot must treat them as candidate patterns and adapter references, not production-ready dependencies.

## ChopDot Product Law

These rules do not change:

```text
payment evidence != claim != confirmation != approval != release != closeout
```

For a normal user this means:

- "I paid" is a claim.
- "The chain says a payment finalized" is evidence.
- "I received it" is confirmation.
- "We agree this can be released" is approval.
- "The record is closed" is a ChopDot closeout decision.

No W3S payment rail, Coinage claim, Statement Store statement, Bulletin CID, contract event, or Asset Hub transaction may skip those human-facing steps.

## 1. Payment Behavior Review

### w3spay

What it proves:

- QR/deeplink payment requests can carry address, amount, terminal id, and amount-locking fields.
- The app can wait for host-reported payment status and distinguish settled vs unconfirmed/interrupted status.
- Receipt save is treated as a record artifact, not a payment by itself.
- Payment UI needs strict error states around camera, malformed QR, unknown merchant, failure, and interrupted settlement.

What ChopDot should copy:

- A compact payment-evidence parser for QR/link inputs.
- Clear rail status labels: `submitted`, `settled`, `unconfirmed`, `failed`.
- The discipline that an interrupted settlement is not silently upgraded to success.
- Receipt scanning/saving as evidence attached to a person action.

What ChopDot should not copy directly:

- A merchant checkout product surface.
- "Paid" as final group truth.
- Local-only receipt history as the source of shared group state.

ChopDot verdict: `spike`.

### t3rminal

What it proves:

- A terminal can create a simple QR payment request.
- A `.dot` app can be packaged as a static app with Bulletin metadata and host testing.
- Coinage-style payment evidence can be generated from a terminal-side ephemeral keypair, encrypted payload, deterministic topic, and sender/receiver round trip.

What ChopDot should copy:

- Checkout capture: amount, payee/merchant context, terminal/payment request id, and receipt evidence should enter ChopDot at the moment of purchase.
- Payment request generation for "Pay this person/group amount" moments.
- Host-test-sdk style browser tests for native paths.
- Coinage topic/deeplink concepts as a lab-only payment evidence input.

What ChopDot should not copy directly:

- Merchant/till mental model.
- POS-first UI.
- Any assumption that Coinage claim means receiver confirmation.

ChopDot verdict: `spike`, with Coinage separated as lab-only until we map the full host claim path.

### w3s-payment-processor

What it proves:

- A live payment monitor needs explicit boot/hydration state before closeout.
- Closeout should be blocked while fiscal store, chain watch, or coin monitor state is not ready.
- Encrypted report packets can be uploaded and then read back/verified.
- Claim engines need queueing, retry, timeout, and fail-closed behavior.
- Remote merchant configuration can be encrypted, stored on Bulletin, and referenced through a registry.

What ChopDot should copy:

- Closeout preflight language and blockers.
- Reconciliation view: "observed, claimed, confirmed, unresolved, closed."
- Retry/timeout/fail-closed handling for any payment-evidence adapter.
- Encrypted report packet shape for closeout receipts.

What ChopDot should not copy directly:

- Per-merchant passkey unlock as the normal group onboarding flow.
- Merchant registry contract as ChopDot group truth.
- Staff payment dashboard UI as the main user experience.

ChopDot verdict: `adopt-pattern`, not `adopt-app`.

## 2. Statement Store + Host API Test SDK Proof

What the official package gives us:

- `@polkadot-apps/statement-store` publishes and subscribes to JSON statements by app/topic/channel.
- Host mode delegates proof creation/submission to the Polkadot host. No app-owned WebSocket endpoint is required.
- Local mode can sign locally and submit over WebSocket RPC for tests and development.
- Host subscriptions replay existing statements; local mode has query support.
- Payload data is limited to 512 bytes.
- `@polkadot-apps/host` detects the Polkadot container and exposes host local storage, host provider, and host Statement Store access.
- The examples use Playwright with `@parity/host-api-test-sdk` to run app flows inside a simulated host container.

ChopDot implication:

Statement Store is the right Programme B replacement candidate for Supabase realtime/native truth sync, but only for compact signed/encrypted events. It is not a document database.

Required ChopDot shape:

```text
chapter topic
-> small signed encrypted event envelope
-> deterministic replay
-> sidecar private data off shared statement if needed
-> receipt/archive packet on closeout
```

Immediate gates:

| Gate | Requirement |
| --- | --- |
| Distinct people | Leo, Nina, Omar, and Mina must sign as distinct Product Account identities. One shared signer is a fail. |
| Small events | Event envelope must stay under 512 bytes or store only a pointer/hash to encrypted sidecar data. |
| Replay | Loading the same events on separate devices must produce the same ChopDot state. |
| Authority | Wrong-person events must be rejected before affecting state. |
| Privacy | No plaintext emergency reasons, payment refs, dispute notes, or identity details on shared Statement Store. |
| Host proof | `host-api-test-sdk` must exercise the real host path before any host-ready claim. |

ChopDot verdict: `adopt-as-G4-spike`.

## 3. Bulletin Redacted Receipt Packet

What Bulletin gives us:

- Authorized content-addressed storage.
- IPFS-compatible retrieval.
- Chunking and DAG-PB helpers.
- Authorization by account or preimage.
- Retention and renewal mechanics; default retention is roughly 14 days in the reference chain.

ChopDot implication:

Bulletin is a good archive for redacted closeout receipts, not a payment oracle and not permanent storage by default.

Receipt packet should contain:

- chapter id hash, not raw private title where privacy-sensitive;
- mode;
- closed state;
- totals and counts that are safe to share;
- redacted participant labels where needed;
- evidence hashes/refs, not raw sensitive payment data;
- closeout timestamp;
- signer/approver summary;
- unresolved/open-item annotations;
- schema version;
- receipt hash.

Receipt packet should not contain:

- emergency reason details;
- public recipient identity by default;
- raw payment refs for sensitive modes;
- direct private notes;
- keys, secrets, passkeys, or wallet private material;
- a claim that stored receipt equals legal settlement.

Immediate gates:

| Gate | Requirement |
| --- | --- |
| Redaction | Emergency receipt export excludes sensitive title, reason, names, notes, and raw payment refs. |
| Round trip | Save, retrieve, and hash-match the same redacted packet. |
| Retention | UI/docs must say "receipt saved" without implying permanent public storage unless renewal policy is implemented. |
| Separation | Receipt archive event is recorded after closeout; it does not close the chapter by itself. |

ChopDot verdict: `adopt-as-G5-spike`.

## 4. Coinage Payment-Evidence Spike

Discovery:

- No standalone `paritytech/Coinage` repository was found by GitHub org search.
- Coinage appears in the W3S codebase as embedded payment logic, especially `t3rminal` terminal tests and `w3s-payment-processor` v2 claim engine.
- The code points to encrypted payment payloads, deterministic `pay-w3s:` topics, 64-byte sr25519 coin secrets, and host `paymentTopUp` claim behavior.

What Coinage may offer ChopDot:

- A payment-evidence rail that does not require a classic wallet transfer per user action.
- A way for a payment request to produce claimable evidence through the Polkadot host.
- Potential fit for "I contributed" or "this payment was observed" events.

What is unsafe:

- Treating a successful Coinage claim as "receiver confirmed."
- Treating Coinage as custody/escrow readiness.
- Showing it in normal UI before people understand the state boundary.
- Depending on it before host support, error cases, privacy, and replay semantics are proven.

Spike definition:

```text
Coinage observed/claimed
-> creates payment evidence event
-> supports a person claim
-> receiver/treasurer still confirms
-> closeout still waits for blockers
```

Immediate gates:

| Gate | Requirement |
| --- | --- |
| Source map | Identify the exact Coinage modules and host requirements used by t3rminal and w3s-payment-processor. |
| Host behavior | Prove `paymentTopUp` success, timeout, rejected variant, and offline behavior in host-sim. |
| Evidence-only replay | A Coinage evidence event must not mutate confirmation, approval, release, or closeout state. |
| Privacy | Encrypted payment payload must not leak member identity or emergency details into shared statements. |

ChopDot verdict: `lab-only`.

## Integration Map

| ChopDot layer | Candidate | Decision | Why |
| --- | --- | --- | --- |
| Catch | w3spay QR/deeplink parsing | `spike` | Helps people attach payment evidence without manual typing. |
| Management | Statement Store events | `adopt-spike` | Best current no-Supabase native sync candidate. |
| Payout | Asset Hub + W3S/Coinage evidence | `lab-only/evidence-only` | Supports claims but cannot confirm or close. |
| History | Bulletin redacted receipt packet | `adopt-spike` | Fits closeout/archive without exposing sensitive group data. |
| Operator review | w3s-payment-processor reconciliation patterns | `adopt-pattern` | Good closeout blockers and report discipline. |
| UI | W3S app chrome | `reject` | ChopDot must keep its own group-first UX, not POS-first flow. |
| Contracts/escrow | t3rminal/revive patterns | `defer` | Useful reference, but ChopDot escrow remains lab-only until user comprehension passes. |

## How We Bake This Into ChopDot

### Product surface

Normal users should see:

- `Mark paid`
- `Confirm received`
- `Waiting for Mina`
- `Payment evidence attached`
- `Receipt saved`
- `Needs review`
- `Closed with open items`

Normal users should not see:

- Product SDK
- Statement Store
- Bulletin
- Coinage
- host API
- CID
- preimage
- pallet
- revive contract

### Engineering backlog

| Priority | Work item | Acceptance |
| --- | --- | --- |
| P0 | Build the checkout capture wedge around t3rminal/W3SPay-style request and receipt evidence. | A payer records purchase context at checkout with less manual entry than the current ChopDot flow. |
| P0 | Add a `PaymentEvidenceAdapter` contract for QR/link/on-chain/Coinage evidence. | Evidence can support claim, but tests prove it cannot confirm or close. |
| P0 | Replace local native session transport with a `polkadot-apps` Statement Store adapter behind the same interface. | Host-required mode fails without host; host-sim proves append/load/replay under distinct people. |
| P0 | Define `RedactedReceiptPacketV1`. | Emergency/community redaction tests pass; packet hash round-trips. |
| P1 | Add W3S-style payment request parser spike. | Valid QR/link becomes evidence candidate; malformed/unknown/failed paths are user-readable. |
| P1 | Add Coinage source map and host-sim spike. | Exact source modules, host calls, failure modes, and privacy boundaries documented. |
| P1 | Add reconciliation panel pattern to closeout readiness. | Users see observed/claimed/confirmed/unresolved without protocol language. |
| P2 | Investigate registry/config patterns from w3spay-admin/payment-processor. | Only adopted if group setup friction improves without adding merchant admin complexity. |

### Test strategy

New tests should prove:

- payment evidence does not auto-confirm;
- completed Coinage/top-up evidence does not auto-confirm;
- Statement Store replay converges across Leo, Nina, Omar, and Mina;
- event payloads fit under 512 bytes or use encrypted sidecars;
- emergency receipt packet redacts sensitive fields;
- Bulletin archive round-trip hash matches;
- closeout blocks while monitor/session/archive state is not ready;
- host-required mode cannot pass through local fallback.

## Current Decision

Use the W3S repos as reference implementations and test design sources. Do not merge their product model into ChopDot.

The next real build step is:

```text
PaymentEvidenceAdapter + RedactedReceiptPacketV1 + host-sim Statement Store proof
```

That gives ChopDot the native path we wanted while protecting the thing users actually care about: the group knows who acted, who still needs to act, what was confirmed, and what record can be trusted later.
