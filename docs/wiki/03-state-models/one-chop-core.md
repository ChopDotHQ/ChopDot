# One Chop Core

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
