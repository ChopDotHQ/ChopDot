# Phase C1 consumer contract — J25 Storage / Recovery

This is a narrow successor contract; approved J25 Golden bytes remain unchanged.

- Recovery restores the same durable group-scoped `participant_id`; it must not mint a replacement participant for a known guest.
- Stored identity truth may include participant state, provenance, descriptive capability/version metadata and link/recovery references, but serialized capability labels are non-authoritative.
- Guest-authored writes remain blocked after recovery until current participant-controlled proof and policy revalidate the group/participant/capability version, or a permitted recovery flow rotates the guest credential while preserving `participant_id`.
- Recovery must respect revocation/superseded capability versions; stale or forged backup capability arrays cannot recreate current authority.
- Pending/unknown account-link recovery preserves the guest Participant and exact `link_operation_id`; account-only capabilities remain unavailable until durable binding commit/readback is proven.
- A proven pre-effect/no-effect link failure may clear the operation for a fresh link. A possible-effect failure remains `unknown` and reconciles the exact prior link operation before retry.
- If account-link proof is absent, stale, colliding or mismatched, recovery preserves ledger participation and returns identity status `unresolved` rather than merging.
- Expense, split, history and historical-ownership references remain anchored to the recovered `participant_id` across device/session recovery.
- A stale pre-link backup restored after a successful account link must not fork one economic person into guest + account Participants; canonical binding/frontier truth wins while the Participant ID stays stable.
- Account-only capabilities are re-established only from valid current account proof/policy; they are not inferred from display name, email, recovered ledger participation or stored capability labels.
- Recovery/export surfaces preserve group-scoped unlinkability and must not expose a stable cross-group account identifier as group-visible identity.
