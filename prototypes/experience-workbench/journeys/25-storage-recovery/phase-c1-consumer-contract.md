# Phase C1 consumer contract — J25 Storage / Recovery

This is a narrow successor contract; approved J25 Golden bytes remain unchanged.

- Recovery restores the same durable group-scoped `participant_id`; it must not mint a replacement participant for a known guest.
- Stored identity truth includes participant state, provenance, capabilities and link/recovery references required to resume safely.
- A failed/cancelled account link has no durable binding side effect: recovery after restart must reconstruct the exact pre-link Participant graph, not a half-migrated account identity.
- If account-link proof is absent, stale, colliding or mismatched, recovery preserves ledger participation and returns identity status `unresolved` rather than merging.
- Expense, split, history and historical-ownership references remain anchored to the recovered `participant_id` across device/session recovery.
- A stale pre-link backup restored after a successful account link must not fork one economic person into guest + account Participants; canonical binding/frontier truth wins while the Participant ID stays stable.
- Account-only capabilities are re-established only from valid account proof/policy; they are not inferred from display name, email or recovered ledger participation.
- Recovery/export surfaces preserve group-scoped unlinkability and must not expose a stable cross-group account identifier as group-visible identity.
