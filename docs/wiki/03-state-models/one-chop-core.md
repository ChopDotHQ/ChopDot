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
