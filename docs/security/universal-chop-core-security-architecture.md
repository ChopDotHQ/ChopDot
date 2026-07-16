# Universal Chop Core Security Architecture

Status: draft
Created: 2026-06-30
Owner: product/security
Scope: Chop Core, guest links, and future mini-app surfaces

## Implementation Status

Updated: 2026-07-16

The target architecture in this document is not fully implemented.

Enforced at the current Express boundary:

- Supabase bearer access tokens are verified server-side;
- the verified user is resolved to an active pot member;
- only the bound payer may mark paid;
- only the bound receiver may confirm received;
- pending actions are self-only;
- settlement and closeout events use the verified actor;
- `x-user-id` and host-provided identity hints have no authority.
- authenticated browser roles cannot mutate settlement, payment, or event
  tables directly; member reads remain scoped by RLS;
- authenticated browser roles cannot directly change the backend-owned pot
  closeout status, while ordinary group edits remain available;
- the migration-owned normal payment vocabulary accepts `pending`, `paid`, and
  `confirmed`, and the real migrated-database actor proof passes.

Still blocking production shared-money claims:

- one canonical Chop state across browser, API, Telegram, and host surfaces;
- backend-owned durable payment intents and complete evidence matching;
- complete capture-token privacy and capability scope;
- scoped, revocable guest capabilities with no confirm/close authority;
- atomic command, audit-event, and closeout persistence;
- complete exception-state vocabulary across migrations, Prisma, routes, and
  clients.

See `docs/adr/0004-server-derived-payment-actor.md` and
`docs/security/p025-security-foundation-crosswalk-2026-07-14.md` for the
implemented boundary and current control grades.

## Purpose

ChopDot can expand across Circles/Gnosis, Telegram, Farcaster, Base, Solana,
Polkadot, TWINT-style payment surfaces, and guest links only if every surface
acts on the same trusted record.

This document defines the security architecture that must exist before new
mini-app surfaces ship.

The target posture is:

```text
Core owns truth.
Adapters submit evidence.
Capabilities are explicit.
Links are scoped.
Payments are matched by intent.
Confirmation is role-bound.
Everything is event logged.
Public claims are bounded.
```

## Core Principle

The chain transaction, platform message, bot command, wallet signature, or
payment screenshot is not the product truth.

The product truth is the Chop record.

```text
Chop = shared commitment record
Obligation = who owes whom, how much, and under what policy
Payment intent = scoped request to satisfy one obligation
Evidence = platform-native proof or user-submitted support for payment
Confirmation = receiver-authorized acknowledgement
Closeout = readable final state with all open/delayed/waived/disputed items
```

Surfaces can request actions. Chop Core decides whether the state changes.

## Assets, Data, And Control

### Assets

- obligations between participants
- payment intents and references
- payment evidence
- receipts or supporting attachments
- closeout records
- organizer and participant permissions
- user trust in who paid, who received, and what can close

### Data

- names, aliases, emails, chat ids, wallet addresses, Farcaster ids, Telegram ids
- amounts, currencies, exchange assumptions, payment rails
- transaction hashes, event ids, webhook ids, message ids, screenshots, notes
- guest-link tokens and participant-scoped access tokens
- timestamps, expiry times, state transitions, audit events

### Control

- who can create a Chop
- who can invite or link an identity
- who can create, edit, waive, or dispute obligations
- who can create a payment intent
- who can submit payment evidence
- who can confirm receipt
- who can close a Chop
- which adapter can call which command

## Trust Boundaries

Each surface is outside the core trust boundary until its inputs are verified.

```text
Browser / mini-app UI -> attacker controlled input
Telegram init data -> verify before identity binding
Farcaster credential -> verify before identity binding
Wallet signature -> verify before identity binding
Circles/Gnosis event -> match against intent before state change
Solana/Base/Polkadot tx -> match against intent before state change
Webhook/event scanner -> idempotent evidence source only
Guest link token -> bearer capability with narrow scope
Admin/operator tool -> privileged surface with audit logging
```

No adapter can bypass Chop Core validation.

## Core Entities

### Chop

Required fields:

```text
id
type
title
organizer_participant_id
status
currency_policy
created_at
closed_at
closeout_record_id
```

Allowed statuses:

```text
draft
active
settling
ready_to_close
closed
cancelled
disputed
```

### Participant

Required fields:

```text
id
chop_id
display_name
role
created_at
```

Roles:

```text
organizer
payer
receiver
observer
adapter
```

One human can have many verified identities. A participant is not the same as a
wallet address, Telegram user, Farcaster fid, or email address.

### Identity Claim

Required fields:

```text
id
participant_id
identity_type
identity_value
verification_method
verified_at
expires_at
```

Examples:

```text
telegram_user_id
farcaster_fid
circles_avatar_address
evm_address
solana_pubkey
polkadot_address
email_guest
```

### Obligation

Required fields:

```text
id
chop_id
payer_participant_id
receiver_participant_id
amount
currency
status
created_at
settled_at
```

Allowed statuses:

```text
requested
payment_started
paid_unconfirmed
confirmed
delayed
waived
disputed
cancelled
```

### Payment Intent

Required fields:

```text
id
chop_id
obligation_id
payer_participant_id
receiver_participant_id
expected_amount
expected_currency
allowed_rail
recipient_reference
nonce
expires_at
status
```

Payment matching must use the whole intent. Amount alone is never enough.

### Payment Evidence

Required fields:

```text
id
payment_intent_id
source_surface
evidence_type
evidence_ref
amount
currency
payer_ref
receiver_ref
observed_at
status
```

Allowed statuses:

```text
submitted
matched
mismatched
stale
duplicate
rejected
consumed
```

### Audit Event

Required fields:

```text
id
chop_id
actor_type
actor_ref
event_type
target_type
target_id
payload_hash
created_at
request_id
```

Every state transition must emit an audit event.

## State Machine

Default obligation flow:

```text
requested
-> payment_started
-> paid_unconfirmed
-> confirmed
```

Alternate flows:

```text
requested -> waived
requested -> delayed
requested -> disputed
paid_unconfirmed -> disputed
paid_unconfirmed -> rejected
```

Chop close rule:

```text
A Chop can close only when every obligation is confirmed, waived, delayed, or
explicitly annotated as unresolved in the closeout.
```

External evidence can move an obligation to `paid_unconfirmed` only when it
matches a live payment intent. It cannot confirm receipt or close the Chop by
itself.

## Invariants

These invariants define the architecture. Tests and reviews should target them.

1. One Chop has one canonical state.
2. A surface never owns final truth.
3. An adapter can submit commands or evidence only through its capability set.
4. A guest token can act only on its scoped Chop, participant, and obligation.
5. A payer cannot confirm receipt for the receiver.
6. A receiver confirmation can apply only to an obligation where they are the receiver.
7. A payment intent can be consumed only once.
8. Evidence cannot match by amount alone.
9. Stale, duplicate, mismatched, or expired evidence cannot clear an obligation.
10. Wrong-currency evidence cannot clear a same-amount obligation.
11. A closeout cannot hide disputed, waived, delayed, or unconfirmed items.
12. Every state mutation is idempotent and audit logged.
13. Public/shared closeouts contain only bounded claims.
14. Private receipts, notes, and payment references are role-scoped by default.
15. Adapter outages degrade to visible pending/manual states, not silent success.

## Adapter Capability Model

Each adapter must declare capabilities before it can affect core state.

Example:

```ts
type SurfaceCapability = {
  surface: string;
  canVerifyIdentity: boolean;
  canCreateChop: boolean;
  canCreatePaymentIntent: boolean;
  canSubmitPaymentEvidence: boolean;
  canMoveNativeValue: boolean;
  canSendReminder: boolean;
  canUploadReceipt: boolean;
  canConfirmReceipt: boolean;
  canCloseChop: boolean;
};
```

Default rule:

```text
Adapters can submit evidence.
Humans with the right role confirm or close.
Core enforces all transitions.
```

Capability examples:

```text
Circles/Gnosis:
- verify wallet/Circles identity
- move CRC through host or transfer link
- submit CRC transfer evidence
- cannot close by adapter event alone

Telegram:
- verify Telegram init data / bot context
- submit chat-capture drafts
- send reminders
- cannot read private chats without explicit opt-in
- cannot mark paid or confirm without explicit user action

Guest link:
- view scoped obligation
- mark own payment started/paid
- attach evidence
- cannot edit amount, confirm receipt, view private group data, or close
```

## Payment Intent And Evidence Rules

Every native payment option must start from a payment intent.

Intent matching fields:

```text
payment_intent_id or nonce/reference
obligation_id
payer identity or address
receiver identity or address
amount
currency
rail
expiry
```

Evidence outcomes:

```text
matched -> obligation becomes paid_unconfirmed
mismatched -> obligation remains requested/payment_started
duplicate -> no state change
stale -> no state change
wrong_currency -> no state change
wrong_receiver -> no state change
wrong_payer -> no state change unless receiver manually accepts alternate payment
```

Manual override requires an authorized receiver or organizer role and must emit
an audit event.

## Guest-Link Permissions

Guest links are bearer capabilities. They must be scoped and revocable.

Required token scope:

```text
chop_id
participant_id
allowed_obligation_ids
allowed_actions
expires_at
revoked_at
```

Allowed guest actions:

```text
view own obligation
start payment
mark paid
attach evidence
add note to own payment
```

Disallowed guest actions:

```text
edit amount
view private group details
view other payment references unless policy allows
confirm receipt
waive another person's obligation
close Chop
change currency policy
invite new identities without organizer approval
```

## Privacy Boundaries

Default role visibility:

```text
Payer:
- own amount
- receiver
- own payment status
- own evidence

Receiver:
- incoming obligations
- payment evidence for incoming obligations
- confirmation state

Organizer:
- group state
- outstanding blockers
- closeout readiness

Observer:
- only explicitly shared summary
```

Closeout records should state the result without leaking unnecessary receipts,
references, private notes, identity claims, or platform-specific internals.

## Replay And Idempotency

All command and evidence ingestion must be idempotent.

Required fields:

```text
request_id
source_surface
source_event_id
payment_intent_id
nonce
observed_at
```

Rules:

```text
same request_id -> same result
same source_event_id -> no duplicate mutation
same payment evidence -> cannot satisfy multiple obligations
expired intent -> no automatic clearing
revoked guest token -> no mutation
```

## Deployment And Manifest Boundaries

For each mini-app surface, record:

```text
surface name
deployed URL
allowed origins
iframe/embed policy
manifest/catalog entry
API base URL
environment name
commit hash
adapter capability declaration
payment rails enabled
identity methods enabled
monitoring owner
rollback path
```

Deployment validation must confirm that the deployed surface and server
configuration match the reviewed commit and capability set.

## Public Claim Boundary

Allowed public language:

```text
ChopDot keeps one shared record of who owes, who marked paid, who confirmed,
and what remains open.
```

Disallowed public language unless separately proven:

```text
fully secure
audited and safe
cross-chain settlement guaranteed
payments final everywhere
legal settlement complete
custody handled by ChopDot
all currencies automatically equivalent
```

Better launch claim:

```text
This pilot verifies payment evidence and receiver confirmations for a bounded
Chop flow. It does not guarantee external rail availability, legal settlement,
or automatic exchange across payment methods.
```

## Mini-App Launch Gate

No new mini-app surface should ship until it has:

```text
1. capability declaration
2. identity verification rule
3. payment intent/evidence mapping
4. permission matrix
5. privacy matrix
6. replay/idempotency handling
7. failure-state UI
8. audit event coverage
9. deployment/manifest record
10. bounded public claim
```

The first proof should remain small:

```text
Mina creates a Chop.
Leo opens a scoped guest link.
Leo marks paid or submits evidence.
Mina confirms receipt.
The Chop closes with a readable record.
All actions are audit logged.
```

After this works, Circles/Gnosis can be the first native-money adapter. Telegram
can be the first social/reminder adapter. Other environments should wait until
they can implement the same contract without changing core truth.
