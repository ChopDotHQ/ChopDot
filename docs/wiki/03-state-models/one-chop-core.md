# One Chop Core

**Kind:** decision
**Status:** active
**Owner:** core authority
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Sources:** P-034, DEC-002, ADR 0001, exact-money/event tests

`MoneyV1` stores bounded integer minor units and an explicit currency.
`ChopEventV1` has canonical domain-separated signing bytes, actor, stream,
sequence, expected frontier, payload, and version. Replay validates identifiers,
actor authority, signatures, currency, version, frontier, and idempotency before
changing state. The same accepted event set yields the same state and frontier
hash regardless of delivery order.

`ModePolicyV1` configures normal pot, trip, couple, Spend Card, savings circle,
emergency pot, and community fund over that core. A mode never creates a second
money, membership, confirmation, or recovery authority.

`CanonicalModeStateV1` is not another store or reducer. Namespaced Spend Card,
circle, emergency, and community events are validated inside the
`ChopEventV1` reducer, advance the same group version/current-event frontier,
use the same participant signature and compare-and-swap journal, and travel in
the same encrypted event envelope. `ProductionAuthority.appendMode` is the
typed production command boundary; `readCanonicalGroup` returns only a replayed
and hash-checked projection.

Mode policy never follows removed membership automatically. Savings
replacement and emergency/community role reconciliation are explicit signed
successor events on the same frontier. Spend Card corrections also stay on
that frontier: open obligations use a recoverable adjustment-plus-expense-
correction sequence, while a post-settlement adjustment preserves the old
share evidence and records separately confirmed exact successor allocations.
Outstanding correction or successor confirmation state blocks close rather
than allowing history to claim completion early.

Normal-pot share adjustments use the same production authority boundary as
every other shared-money transition. Refund, fee, partial-payment, waiver,
dispute, and exact reversal commands become signed `SHARE_ADJUSTED` events,
are replayed on the current frontier, and are compare-and-swap persisted before
the UI projection changes. An exact reversal identifies one prior adjustment,
negates it exactly, and cannot reverse it twice.

For each expense, replay enforces this equation after every accepted event:

```text
reviewed receipt total + signed share adjustments = current share total
```

The close record deliberately names reviewed receipt totals. Refund, fee,
partial, waiver, dispute, and reversal facts remain separately attributable in
the immutable share history; they are not silently folded into the receipt.
Settled or waived shares cannot gain a new unresolved amount while retaining a
resolved status. Historical V1 `correction` adjustment facts remain replayable,
but the production command boundary requires the explicit reviewed expense-
correction path for new corrections.
