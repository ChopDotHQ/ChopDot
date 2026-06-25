# ChopDot.dot Safety Boundaries

## Hard Boundary

ChopDot.dot is a coordination and closeout product.

It does not hold funds, release funds, issue cards, provide stored balances, manage wallets, or decide legal settlement.

## State Rules

These must always hold:

```text
payment claimed != received / cleared
weak rail evidence != received / cleared
verified recipient+amount receipt evidence can clear the payment leg
approval != release
release claimed != released / received
proof anchored != legal settlement
storage uploaded != product truth
closed != all money legally final
```

## Blocked In V1

- escrow
- custody
- stored value
- automatic payouts
- managed wallets
- smart-contract release control
- public default reputation
- public donor walls by default
- public payment/dispute/member lists
- yield or investment language
- card issuing
- closed-loop cashless balances

## Privacy Defaults

Default visibility:

- private actor
- direct counterparty
- organizer/treasurer operational view
- scoped group summary

Never default to:

- public proof
- public payment lists
- public dispute lists
- public emergency details
- global reliability scores

## Proof Boundary

Proof anchors may prove that a redacted receipt or hash existed at a time.

They do not prove:

- a payment legally settled
- a receiver accepted funds
- a user identity is real
- a group policy is fair
- a dispute is resolved
- ChopDot is custody-ready

## Adapter Rule

Adapters can:

- observe
- sign
- settle through external/non-custodial rails
- store
- prove
- transport
- execute scoped technical actions

Adapters cannot:

- directly close a chapter
- clear a payment from weak or unmatched evidence
- force extra ceremony after strong received evidence has cleared the leg
- overwrite policy
- hide unresolved disputes
- write sensitive PII/payment references to public proof
