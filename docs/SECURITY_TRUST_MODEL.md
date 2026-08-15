# ChopDot Security & Trust Model

Status: active guardrail for the v1 completion track
Owner: product security
Depends on: `SECURITY_FOUNDATION.md`, `PAYMENT_INTENT_CONTRACT.md`, `PAYMENT_INTENT_SERVICE_FOUNDATION.md`

## Purpose

ChopDot coordinates money between people. The product must never turn a UI event, host claim, URL packet, local cache, or wallet callback into financial truth without the authority and evidence required for that transition.

This document extends the existing security foundation for the v1 completion track. It does not replace the existing payment-intent contract.

## Security Goal

A malicious or buggy client should not be able to:

- fabricate that another person paid;
- confirm money on behalf of the receiver;
- settle the same obligation twice;
- reuse an old payment request against a changed debt;
- substitute a different recipient or asset silently;
- rewrite confirmed history;
- turn untrusted host/storage/link data into canonical money state;
- trick a user into signing a materially different payment than the one shown.

## Assets To Protect

### Financial truth

- expenses
- splits
- payer/receiver relationships
- obligations
- payment intents
- settlement evidence
- confirmations
- corrections/refunds
- current balances

### Identity and authorization

- local profile identity
- host-provided identity
- wallet/account references
- payer authority
- receiver authority
- organizer authority

### Privacy

- names
- group membership
- expense descriptions
- amounts
- payment preferences
- wallet addresses when not necessary to expose
- transaction references
- request links

### Product trust

Users must be able to believe that `paid`, `confirmed`, `settled`, and `history` mean what the product says they mean.

## Authority Hierarchy

Different inputs have different authority. Do not collapse them.

### Tier 0 — Untrusted input

Treat as attacker-controlled until validated:

- URL query data
- QR payloads
- clipboard data
- localStorage / host storage
- Telegram launch data
- arbitrary host messages
- browser-provided display names
- user-entered wallet addresses
- payment links

Tier 0 may populate drafts or display context. It cannot confirm money.

### Tier 1 — Local user action

Examples:

- add/edit expense
- request payment
- payer taps `I paid`
- receiver taps `Confirm received`

Local actions are authoritative only for the actor's allowed role and only inside the current local authority model. They do not prove external money movement by themselves.

### Tier 2 — Host/wallet evidence

Examples:

- host identity result
- signed transaction submission result
- finalized chain transaction
- account selection

These may prove specific facts when cryptographically or independently verified, but must be matched to the exact live intent/obligation before changing financial state.

Under the current v1 payment contract, matched payment evidence may support `marked_paid`/`submitted`, but it does not independently produce `confirmed`.

### Tier 3 — Canonical shared authority

Future cross-device shared mutation must be performed by an authenticated, authorized, idempotent command boundary as specified in `PAYMENT_INTENT_CONTRACT.md`.

The current portable shell does not yet have this production authority.

## Non-Negotiable Invariants

1. `request_sent` is not payment.
2. `marked_paid` is not receiver confirmation.
3. Manual/external payments require receiver confirmation.
4. **Current v1 policy:** chain evidence may prove/match a payment and move it to `marked_paid`/`submitted`, but does not auto-confirm. Direct chain-evidence confirmation requires a deliberate future amendment to `PAYMENT_INTENT_CONTRACT.md` and `SECURITY_FOUNDATION.md` after threat-model review.
5. Confirmed settlement history is append-only.
6. A changed obligation invalidates/replaces the old request scope; old requests cannot silently mutate the new debt.
7. One evidence item may satisfy at most one live intent.
8. Repeated commands must be idempotent.
9. Wrong-network or wrong-asset evidence must never count as settlement.
10. Host capability failure must leave financial truth unchanged.
11. Back/cancel/navigation events must never mutate money state.
12. A user must see the exact recipient, asset, amount, and network before signing a crypto payment.

## Threat Scenarios We Must Test

### Forged paid state

Attacker modifies local state or a return URL to claim payment.

Required defense:

- no confirmation from URL/local packet alone;
- exact live-request matching;
- receiver authority required for confirmation under current v1 policy.

### Replay of stale request

An old CHF 300 request is opened after the expense was corrected to CHF 250.

Required defense:

- request bound to obligation/split versions or scope digest;
- stale request cannot settle the new obligation;
- UI explains that the request changed or expired.

### Duplicate payment submission

User double taps or wallet callback is delivered twice.

Required defense:

- stable settlement/payment ids;
- idempotent submission handling;
- one obligation cannot be settled twice.

### Address substitution

Recipient address is changed between review and signing.

Required defense:

- bind reviewed recipient to payment intent;
- show truncated human-verifiable recipient identity/address at review;
- verify returned transaction destination before accepting it as matched evidence.

### Wrong asset / network

User intends USDC on the supported Polkadot asset environment but signs a different asset/network transfer.

Required defense:

- explicit asset id/network binding;
- decimal-safe amount handling;
- reject evidence that does not match intent.

### Tampered local persistence

Local storage is corrupt or modified.

Required defense:

- schema validation and migrations;
- fail safe rather than invent balances;
- recover or isolate invalid records;
- never turn corrupted local data into host/shared authority.

### Malicious group member

A member attempts to change splits or confirm on behalf of another person.

Required defense:

- actor-bound commands;
- role checks;
- clear ownership of confirm/cancel/edit operations.

### Privacy leakage

Telemetry, proofs, URLs, or screenshots leak names/payment data.

Required defense:

- minimal telemetry;
- redact query parameters and secrets;
- no private keys/signatures in logs;
- avoid embedding sensitive mutable authority in public URLs.

## Crypto Payment Review Standard

Before asking the user to sign, ChopDot must display or make unambiguous:

- who is being paid;
- amount;
- asset;
- network/environment;
- fees if known and materially relevant;
- what will happen in ChopDot after submission.

After submission:

```text
submitted != confirmed
```

Under current v1 policy, a verified/finalized transaction may supply strong matched evidence and move the obligation to `marked_paid`/`submitted`; receiver confirmation remains the final transition. Any future auto-confirm policy must first change the canonical payment/security contracts explicitly.

## Secure Failure Behavior

On timeout, host failure, rejected signature, malformed response, stale intent, or uncertain finality:

- do not optimistically mark confirmed;
- preserve the prior money state;
- store enough non-sensitive diagnostic context to retry safely;
- show a human recovery action;
- avoid automatic retries that could create duplicate transfers unless the payment rail proves idempotency.

## Data Minimization

Store only what is required for the product and evidence model.

Avoid copying the same sensitive identity/payment information into multiple caches. Prefer references over duplicated secrets. Never store private keys or seed phrases.

## Security Review Trigger

A dedicated threat-model review is required before merging any slice that introduces:

- a new wallet/signing action;
- a new payment rail;
- cross-device mutation;
- public mutation links/capabilities;
- backend authority;
- custody/escrow/shared funds;
- automatic confirmation from third-party evidence;
- receipt/OCR/AI ingestion that can influence money state.

## Existing Canonical Contracts

Do not duplicate or weaken these existing boundaries:

- `SECURITY_FOUNDATION.md`
- `PAYMENT_INTENT_CONTRACT.md`
- `PAYMENT_INTENT_SERVICE_FOUNDATION.md`
- `HOSTS.md`

Known historical inconsistency: `HOSTS.md` contains older wording that permits an exactly matched finalized wallet transfer to confirm directly, while the current payment-intent/security contracts require receiver confirmation. The v1 completion track follows the stricter payment-intent contract until that older host wording is deliberately reconciled.

If this file conflicts with the canonical payment/security contracts, stop the slice and resolve the architecture explicitly before implementation.
