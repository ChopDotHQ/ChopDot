# Phase C1 consumer contract — J25 Storage / Recovery

This is a narrow successor contract; approved J25 Golden bytes remain unchanged.

- Recovery restores the same durable group-scoped `participant_id`; it must not mint a replacement participant for a known guest.
- Stored identity truth includes participant state, provenance, capabilities and link/recovery references required to resume safely.
- If account-link proof is absent, stale, colliding or mismatched, recovery preserves ledger participation and returns identity status `unresolved` rather than merging.
- Expense, split and history references remain anchored to the recovered `participant_id` across device/session recovery.
- Account-only capabilities are re-established only from valid account proof/policy; they are not inferred from display name, email or recovered ledger participation.
