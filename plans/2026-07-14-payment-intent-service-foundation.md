# Self Prompt: Payment Intent Service Foundation

Change: `payment-intent-service-foundation-v1`

Programme: Chop Core security architecture

Approved product contract: `P-025 Universal Chop Core security architecture`

## Current Truth To Preserve

- The browser prototype currently owns only local demonstration state.
- Payment state remains `open -> request_sent -> marked_paid -> confirmed`.
- Sending or marking paid does not settle the receiver's balance.
- Only the bound receiver can confirm receipt.
- Hosts, URLs, local storage, wallets, and provider events are inputs, not truth.

## User Journey

> I am Mina, I need payment status to change only when the right person performs
> the right action, so the group can trust the same result across every host.

One next action: define and verify the server command boundary.

Product gate: friction 3/3, trust 3/3, clarity 3/3, language 1/1. Total 10/10.

## Scope In

- A server-only in-memory reference kernel.
- Exact split scope and integer minor-unit amount validation.
- Actor authorization, state transitions, optimistic versions, and expiry.
- Command idempotency and append-only audit events.
- Strict payment-evidence matching hooks that can never confirm receipt.
- Runtime validation at the TypeScript/network boundary.
- Deterministic negative and lifecycle tests.

## Scope Out

- No API server, database, authentication, wallet, or payment provider.
- No browser reducer or user-interface changes.
- No claim of cross-device synchronization or production security.
- No deployment or main ChopDot merge.

## Requirements

1. The kernel SHALL enforce receiver, payer, organizer, host, and system roles.
2. A payer SHALL NOT confirm receipt.
3. A receiver SHALL NOT mark paid for a payer.
4. Evidence SHALL match one live request's amount, currency, rail, scope, and
   declared references and observation window before policy may mark it paid.
5. Evidence SHALL NEVER confirm receipt.
6. Commands SHALL require a valid expected version and idempotency key.
7. Duplicate commands SHALL replay without another transition or audit event.
8. Split and intent mutations SHALL commit with one audit event in the
   synchronous reference boundary.
9. Malformed runtime envelopes SHALL fail with typed errors and no mutation.
10. The browser journey and payment reducer SHALL remain unchanged.

## Scenarios

GIVEN Leo has an open obligation to Mina
WHEN Mina creates and sends a valid intent
THEN the obligation becomes request sent and Mina's balance remains open.

GIVEN Leo's request is live
WHEN Leo marks it paid or matched host evidence is accepted
THEN it becomes marked paid and not confirmed.

GIVEN Leo is marked paid
WHEN Mina confirms receipt
THEN only the covered obligation becomes confirmed.

GIVEN a stale version, wrong actor, duplicate evidence, expired intent, changed
split, or malformed command
WHEN the kernel evaluates it
THEN it rejects the command without a money-state mutation.

## Proof

- `npm run lint`
- `npm run test:payment-intents`
- `npm run security:baseline`
- `npm audit --omit=dev`
- `npm run build`
- `npm run proof:web`
- `npm run proof:telegram`
- live `.dot` proof only against a wrapped deployment URL

## Stop Conditions

- Stop if browser code imports the server kernel.
- Stop if a host or evidence path can confirm payment.
- Stop if actor identity is described as production-secure without authentication.
- Stop if a failed host proof is reported as passing.
