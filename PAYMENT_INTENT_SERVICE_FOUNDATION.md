# Payment Intent Service Foundation

Status: executable reference kernel; not a production backend
Change: `payment-intent-service-foundation-v1`
Owner: Chop Core / product security
Depends on: `PAYMENT_INTENT_CONTRACT.md`

## Purpose

This pass turns the payment-intent contract into an executable server-only
reference kernel. It proves authority, transition, scope, version, idempotency,
evidence, and audit rules before selecting a database, API framework, identity
provider, wallet, or payment provider.

It does not add a server process or network endpoint. The portable browser app
continues to use its local reducer and does not import this kernel.

## Product And Security Gate

```text
User journey:
I am Mina, I need payment status to change only when the right person performs
the right action, so the group can trust the same result across every host.

One next action:
Define and verify the server command boundary.

State change:
created -> request_sent -> marked_paid -> confirmed

Authority:
Receiver creates/sends/confirms. Payer marks paid. System expires. Declared
host adapters may submit matching evidence but cannot confirm.

Failure:
Reject with a typed authority, transition, scope, expiry, version, duplicate, or
not-found error and make no money-state mutation.
```

The approved product card is `P-025` at `10/10`. This pass adds no screen and no
normal-user language.

## Implemented Boundary

`server/payment-intents/paymentIntentKernel.ts` provides:

- exact covered-split validation;
- a scope digest bound to the original covered-split versions;
- integer minor-unit money validation;
- runtime command, actor, source, timestamp, and evidence validation;
- immutable payer, receiver, amount, currency, rail, and split scope;
- receiver/organizer create and send authority;
- payer-only `mark_paid` authority;
- receiver-only `confirm_received` authority;
- system-only expiry;
- optimistic version checks;
- global command-id idempotency with payload fingerprinting;
- append-only audit events with payload hashes;
- duplicate evidence rejection;
- host-evidence authorization and strict match hooks;
- evidence observation-time checks against the live request window with bounded
  clock skew;
- optional policy to move matched evidence to `marked_paid`, never `confirmed`;
- atomic in-memory updates to intent, covered split state, and audit history.

The in-memory implementation is deliberately synchronous so its reference
commits cannot interleave. A production repository must reproduce this atomic
boundary with a database transaction and a unique constraint on command ids,
source event ids, intent ids, and version checks.

## Explicitly Not Implemented

- HTTP routes or an Express server;
- database persistence or migrations;
- authentication, sessions, or server-side Telegram identity validation;
- organizer-role lookup;
- guest capabilities;
- real payment or wallet evidence verification;
- encryption/key management;
- rate limiting or abuse controls;
- cross-device client reconciliation;
- operational logging and alerting.

The default kernel denies organizer authority, host evidence authority, and
evidence-reference matching unless explicit server dependencies provide them.

## Test Scenarios

The deterministic test suite proves:

1. receiver creates and sends;
2. payer marks paid;
3. receiver confirms;
4. payer cannot confirm;
5. receiver cannot mark paid for the payer;
6. duplicate commands replay without a duplicate event;
7. idempotency-key reuse with a different payload fails;
8. stale versions fail;
9. split amount/scope mismatches fail;
10. expired intents cannot be sent;
11. only the system can expire;
12. mismatched host evidence changes no payment state;
13. matched evidence may mark paid by explicit policy but cannot confirm;
14. evidence without a live intent is rejected;
15. currency values are normalized once and remain canonical;
16. invalid timestamps and contradictory evidence sources are rejected;
17. future-dated evidence outside the request window cannot mark paid;
18. malformed split snapshots are rejected before command processing.

Run:

```bash
npm run test:payment-intents
```

## Production Migration Gate

Before exposing an API, the next implementation must provide:

1. an authenticated actor context created server-side;
2. a transactional repository with unique idempotency constraints;
3. server-side split-scope reads and writes;
4. secret storage and rotation for nonces/capabilities;
5. public request projections that contain no mutation authority;
6. role-scoped audit reads;
7. rate limiting, abuse handling, and privacy retention rules;
8. contract tests that run against the selected database implementation.

No route should be connected to the portable shell until those controls exist.
