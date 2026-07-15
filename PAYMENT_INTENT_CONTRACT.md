# Payment Intent Contract

Status: contract foundation with a server-only reference kernel; no production backend
Change: `payment-intent-contract-v1`
Owner: Chop Core / product security
Conforms to: ChopDot `P-025`, `DC-025`, and `DEC-006`

## Purpose

The portable shell currently coordinates payment state locally. Before web,
Telegram, `.dot`, wallets, payment providers, or a backend can update shared
money records, they must all use one server-owned payment-intent contract.

The contract preserves this product truth:

```text
open -> request_sent -> marked_paid -> confirmed
```

- Sending a request does not reduce the receiver's net position.
- The payer saying they paid does not reduce the receiver's net position.
- Only the receiver confirming receipt reduces the receiver's net position.
- A host, URL packet, wallet event, or payment-provider event cannot confirm a
  payment by itself.

This document defines the boundary. `server/payment-intents/` now provides an
in-memory reference kernel for its invariants, but it does not add networking,
authentication, durable persistence, cross-device sync, or real payment
processing to the portable shell.

## Current Truth To Preserve

- `src/state/store.ts` remains the prototype's local product-state authority.
- `src/requestLinks.ts` carries untrusted display, local-routing, and scoped
  prototype return data only.
- A standalone payer link cannot directly mutate receiver state. It may produce
  an expiring return packet that the receiver shell applies only after exact
  local request matching and receiver-authority checks.
- Host adapters provide capabilities and evidence; they do not own money truth.
- Existing proof journeys must continue to pass without UI or reducer changes.

## Scope

### In

- the backend-owned `PaymentIntent` entity;
- command authority and allowed transitions;
- request-link and guest-link boundaries;
- payment evidence matching;
- idempotency and optimistic-concurrency rules;
- append-only audit events;
- API-ready command and read boundaries;
- the mapping from the local prototype to the future backend contract.

### Out

- production backend implementation or database schema;
- authentication and session implementation;
- Telegram `initData` validation;
- wallet signing or payment-provider integration;
- real payment execution;
- UI or reducer changes;
- claims of cross-device synchronization.

## Backend-Owned Entity

The backend SHALL own the canonical payment intent. The browser may cache a
projection but SHALL NOT be trusted to create a valid transition.

Required fields:

```text
id                        internal identifier
public_id                 opaque read-only lookup identifier
group_id                  group being settled
payer_user_id             person expected to pay
receiver_user_id          person expected to receive
covered_split_ids[]       exact split obligations covered by this intent
covered_split_versions{}  split versions captured when the intent was created
expected_amount_minor     integer amount in the currency's minor unit
expected_currency         ISO 4217 currency code
payment_rail              selected external payment method or rail
recipient_reference_id    server-side reference to receiver instructions
status                    current intent state
scope_digest              digest of covered split ids, values, and versions
server_nonce_hash         hash of a server-only nonce; never sent in links
version                   optimistic-concurrency version
created_by_actor_id       actor who created the intent
source_surface            web, Telegram, dot host, or another adapter
created_at
expires_at
sent_at
marked_paid_at
confirmed_at
cancelled_at
last_command_id
```

Money SHALL use integer minor units. The backend SHALL reject non-integer,
zero, negative, unsupported-currency, and out-of-policy amounts.

`covered_split_ids` SHALL be non-empty and SHALL belong to the same group,
payer, receiver, and currency. Their current sum SHALL equal
`expected_amount_minor`. Once an intent is sent, its amount and covered splits
are immutable. A changed split or settlement plan requires cancellation or
expiry and a new intent.

## Intent States

```text
created -> request_sent -> marked_paid -> confirmed
```

Additional terminal or exception states:

```text
created -> cancelled
created -> expired
request_sent -> cancelled
request_sent -> expired
marked_paid -> disputed
```

`confirmed`, `cancelled`, and `expired` are terminal for normal commands.
Resolving a dispute requires an explicit audited command and policy; it must not
silently reuse the old intent.

The intent state maps to the portable shell as follows:

| Portable split state | Payment-intent meaning |
| --- | --- |
| `open` | No sent intent currently governs the split |
| `request_sent` | A live intent was sent to the payer |
| `marked_paid` | The payer acted, or matched evidence supports payment; receiver confirmation is still required |
| `confirmed` | The receiver confirmed receipt for the exact covered splits |

## Authority Matrix

| Command | Allowed actor | Required checks | Result |
| --- | --- | --- | --- |
| Create intent | Receiver or authorized organizer | Actor can collect the covered splits; snapshot still current | `created` |
| Send request | Receiver or authorized organizer | Intent unexpired and scope digest current | `request_sent` |
| Mark paid | Bound payer | Intent is `request_sent`; payer identity matches | `marked_paid` |
| Submit evidence | Payer or declared host adapter | Evidence matches a live scoped intent | Evidence recorded; may support `marked_paid`, never `confirmed` |
| Confirm received | Bound receiver | Intent is `marked_paid`; receiver identity matches | `confirmed` and exact splits settle |
| Cancel | Receiver or authorized organizer | Intent is not confirmed | `cancelled` |
| Expire | System | `expires_at` has passed | `expired` |
| Dispute | Payer or receiver | Intent is `marked_paid` | `disputed` |

A host adapter has no independent human authority. It may submit verified
identity claims or payment evidence within its declared capability set. It may
execute a human command only when the backend has verified that person's
identity, intent, and authorization for that exact command.

## Command Contract

Every state-changing command SHALL include:

```text
command_id / idempotency_key
intent_id
actor_id
actor_role
source_surface
expected_version
submitted_at
command payload
```

The backend SHALL:

1. authenticate or securely bind the actor;
2. authorize the actor for the command and intent;
3. validate the current state and transition;
4. validate `expected_version` or return a conflict;
5. apply the state mutation and audit event atomically;
6. return the canonical intent projection;
7. return the original result for a duplicate `command_id` without producing a
   second state transition.

Client timestamps, actor labels, status values, amounts, and host claims are
untrusted input. The backend determines the accepted timestamp, actor binding,
and resulting state.

## Payment Evidence Contract

Evidence SHALL be stored separately from the intent. A match requires all
applicable fields, not amount alone:

```text
payment_intent_id
covered split scope
payer identity or address
receiver identity or address
amount
currency
payment rail
nonce or payment reference
intent expiry
source event id
```

Evidence outcomes are `submitted`, `matched`, `mismatched`, `stale`,
`duplicate`, `rejected`, or `consumed`.

- Matched evidence may move a request to `marked_paid` according to policy.
- Evidence never moves an intent to `confirmed`.
- Evidence without a live scoped intent is recorded or rejected and causes no
  split mutation.
- One evidence record cannot satisfy multiple intents.
- Wrong payer, receiver, amount, currency, rail, or expired scope causes no
  money-state mutation.

## Request-Link Boundary

The current `payGroupId`, `payMemberId`, and `payRequest` values are untrusted
display/local-routing data. They are not a backend payment intent, signature,
receipt, or proof of payment.

The prototype also supports a `payUpdate` return packet so a fresh-device payer
can explicitly send `marked_paid` back to the receiver. This packet is not
production authority. The receiver shell accepts it only when all of these
match current local state:

```text
group id
payer id
request id
expected amount
currency
expiry
current receiver authority
current request_sent state
```

The packet can move only the matching item to `marked_paid`. It cannot confirm
receipt, close a group, create missing group state, or bypass the backend-owned
contract planned below. It is a bounded host proof of the user journey, not
automatic cross-device synchronization or a reviewed guest capability.

A production request URL MAY include only:

```text
public intent lookup id
optional display version
optional host launch hint
```

It SHALL NOT contain:

```text
server nonce
nonce hash
signing secret
session token
raw identity claim
private receipt or payment reference
authoritative amount or status
```

The backend response is authoritative. Any duplicated display summary in the
URL is a loading hint and SHALL be labeled internally as untrusted.

The safe first backend version is read-only for an unauthenticated link. A
future no-account payer mutation requires a separate, reviewed guest-capability
design: high-entropy, narrowly scoped, expiring, revocable, single-purpose,
server-hashed, and protected from referrer/log leakage. The current standalone
packet does not provide that authority.

## API-Ready Boundary

These are conceptual boundaries, not implemented routes:

```text
POST /payment-intents
POST /payment-intents/{id}/send
POST /payment-intents/{id}/mark-paid
POST /payment-intents/{id}/confirm-received
POST /payment-intents/{id}/evidence
POST /payment-intents/{id}/cancel
GET  /payment-requests/{public_id}
GET  /payment-intents/{id}/events
```

State-changing requests SHALL require actor authentication, an idempotency key,
and expected version. The public request read SHALL expose only the minimum
fields needed by the payer. Private evidence and audit details require
role-scoped authorization.

## Audit Events

Every accepted state mutation SHALL atomically append one immutable audit
event containing:

```text
event_id
command_id
intent_id
group_id
actor_id
actor_role
source_surface
event_type
previous_status
next_status
payload_hash
occurred_at
intent_version
```

Rejected commands SHOULD produce security/operational logs without pretending
a product-state transition occurred. Logs SHALL redact raw guest capabilities,
session tokens, payment references, receipts, and unnecessary personal data.

## Required Scenarios

### Create And Send

GIVEN Mina is the receiver for Leo's open `$40` splits
WHEN Mina creates and sends a payment request
THEN the backend creates one intent scoped to Mina, Leo, the group, and the
exact covered split ids
AND the request URL contains no server secret
AND Mina's net position remains unchanged.

### Fresh-Device Link

GIVEN Leo opens the request URL on a fresh device
WHEN the app has no matching local state
THEN it shows the scoped request summary
AND no local or backend split becomes confirmed merely because the link opened.

### Payer Marks Paid

GIVEN Leo is bound to a live `request_sent` intent
WHEN Leo taps `I paid Mina`
THEN the intent becomes `marked_paid`
AND Mina's net position remains unchanged
AND Mina must still confirm receipt.

### Receiver Confirms

GIVEN the intent is `marked_paid`
WHEN Mina confirms received
THEN the backend confirms only the intent's covered splits
AND Mina's net position decreases by the confirmed amount
AND unrelated open splits remain unchanged.

### Duplicate Command

GIVEN Leo's `mark paid` command already succeeded
WHEN the same command id is retried
THEN the backend returns the original result
AND creates no duplicate transition or audit event.

### Unscoped Host Evidence

GIVEN a host adapter submits payment evidence
WHEN no live intent matches the payer, receiver, amount, currency, rail,
reference, and expiry
THEN the evidence is rejected or recorded as unmatched
AND no split becomes marked paid or confirmed.

## Prototype Mapping And Migration

The portable shell remains local-only. The future migration order is:

1. keep the current reducer as executable product-semantics proof;
2. implement server identity/session authority;
3. implement payment-intent commands and atomic audit events;
4. replace local request mutations with server commands;
5. reconcile server projections into local UI state;
6. add scoped guest capabilities only after abuse, privacy, expiry, and recovery
   behavior are reviewed;
7. add host/payment evidence adapters last.

No migration step may make a host adapter or browser cache the canonical source
of payment truth.

## Acceptance Gate

This contract passes when:

- the entity, transitions, authority, link boundary, evidence matching,
  idempotency, audit events, and API seams are explicit;
- `src/contracts/paymentIntent.ts` agrees with this document;
- the reference command kernel in `server/payment-intents/` passes its invariant
  tests without being imported into the browser app;
- no normal screen or reducer behavior changes;
- lint, security baseline, build, web proof, Telegram proof, and host matrix all
  pass.
