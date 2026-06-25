# Coinage Payment Evidence Source Map

Status: `lab-only`
Date: 2026-06-21
Programme: `B + product readiness`

## Purpose

Map the exact W3S payment modules that matter to ChopDot before we adopt Coinage-style checkout evidence.

The product target is narrow:

```text
checkout payment evidence -> strength check -> claim or received -> closeout rule check
```

Coinage, W3SPay, T3RMINAL, Statement Store, and the payment processor can reduce typing and improve evidence capture. Weak evidence supports a claim. Strong evidence that verifies expected recipient and amount can clear a payment leg. None of this directly closes unrelated approvals, disputes, delays, or privacy requirements.

## Official Sources Reviewed

| Source | What it proves | ChopDot use |
| --- | --- | --- |
| [`paritytech/t3rminal`](https://github.com/paritytech/t3rminal) | Static `.dot` terminal app, payment request generation, pallet-revive contract references, Bulletin metadata, and repeated prototype/non-audited warnings. | Checkout QR/deeplink pattern and Coinage request source map. |
| [`paritytech/w3s-payment-processor`](https://github.com/paritytech/w3s-payment-processor) | Merchant-side processor for on-chain credits and Statement Store payment claims, with reconciliation and network/report state. | Payment-status and closeout-blocking patterns. |
| [`paritytech/w3spay`](https://github.com/paritytech/w3spay) | Customer-side scanner/payment app that asks the Polkadot host to execute payment and keeps local receipt history. | User-facing payment status language and scan-to-pay friction model. |

All three sources describe summit/prototype/reference implementations. They are not evidence that ChopDot can claim production custody, escrow, settlement, or live host readiness.

## Source Map

| Module | Behavior | ChopDot adoption decision |
| --- | --- | --- |
| `t3rminal/lib/payments/coinage/deeplink.ts` | Builds the native payment deeplink: `polkadotapp://pay/cheque?id=<id>&amount=<amount>&key=<key>[&name=<name>]`. The id is alphanumeric, amount is capped, and key is a compressed P-256 public key. | Adopt the shape as checkout evidence input only. Do not expose this protocol language in normal UI. |
| `t3rminal/lib/payments/coinage/topic.ts` | Derives the Statement Store topic with `blake2b256("pay-w3s:" || id)`. | Useful for host-sim tests when we wire real Statement Store payment messages. Not product truth. |
| `t3rminal/lib/payments/coinage/use-coinage-payment.ts` | Creates ephemeral payment key/id, subscribes to Statement Store, decrypts an ECIES cheque envelope, validates id/amount, and asks the host payment manager to top up with bearer coins. Handles waiting, claiming, paid, and error states. | Lab-only reference for success, timeout, offline, duplicate, and rejected payment evidence. |
| `w3s-payment-processor/src/features/v2/api/orchestrator.ts` | Matches topics, decrypts messages, dedupes by topic/id/timestamp, records pending line items, queues claim, and ends as claimed, blocked, or failed. | Adopt the reconciliation discipline: observed payment evidence can still be pending, blocked, or failed. |
| `w3s-payment-processor/src/features/v2/api/claim-engine.ts` | Fails closed when host bearer-coin support is missing, retries with timeout, and records blocked/failed claim states. | Adopt fail-visible behavior. Never silently treat unsupported host payment as success. |
| `w3spay/src/features/payment/api/send-payment.ts` | Requests host payment and maps subscription results into settled, unconfirmed/interrupted, or failed outcomes. | Adopt status language for ChopDot parser and UI: settled, submitted, unconfirmed, interrupted, failed. |

## What We Implemented Now

- `PaymentEvidenceAdapter` reads W3S/Coinage/T3RMINAL-style checkout links and receipt payloads into a `PaymentEvidenceRef`.
- Failed, interrupted, and unknown payment states are rejected visibly instead of becoming hidden success.
- Spend Card checkout capture can prefill amount and memo from payment evidence.
- Payment-clearance tests distinguish weak evidence from strong received evidence so settled activity does not require duplicate ceremony when the recipient and amount are verified.
- `CoinageHostEvidenceAdapter` now has host-sim behavior tests for success, timeout, rejected, host-unavailable, duplicate redelivery, and private-secret rejection.

## What We Have Not Adopted

- No host `paymentTopUp` call.
- No direct Statement Store cheque claim.
- No custody, escrow, automatic payout, or atomic release.
- No claim that unverified Coinage settlement equals received money.
- No public receipt with sensitive member/payment details.

## Required Host-Sim Gates Before Promotion

| Gate | Pass condition | Current evidence |
| --- | --- |
| Success | A host-supported payment message becomes a payment signal; it clears the leg only when expected recipient and amount are verified. | `coinageEvidence.test.ts`; `paymentClearance.test.ts` |
| Timeout | A waiting/expired cheque appears as blocked or needs review. | `coinageEvidence.test.ts` |
| Rejected | A declined/failed host payment cannot be used as success evidence. | `coinageEvidence.test.ts` |
| Offline / standalone | Missing host support fails visibly, not as local success. | `coinageEvidence.test.ts` |
| Duplicate redelivery | Replayed payment messages do not double-count or close a leg. | `coinageEvidence.test.ts` |
| Privacy | Raw keys, receipt details, and sensitive member names stay out of redacted closeout packets. | `coinageEvidence.test.ts`; receipt-packet tests |

## ChopDot Rule

```text
Coinage observed/claimed
-> payment evidence
-> weak evidence supports a member claim
-> verified recipient+amount evidence clears the payment leg
-> unresolved blockers still prevent clean closeout
```
