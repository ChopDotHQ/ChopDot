# Phase C1 consumer contract — J09 Manage People

This is a narrow successor contract; approved J09 Golden bytes remain unchanged.

- A person row represents a durable group-scoped `participant_id`, not a display-name/email identity key.
- Surface `guest`, `account_backed`, `linked`, or `unresolved` only when capability/status context is relevant; guest membership is not a degraded ledger record.
- Guest authority is participant-controlled and group/participant/version scoped. Knowing a `participant_id` or holding organizer membership authority is insufficient to authenticate a guest-authored mutation.
- Guest may consume member-visible ledger context and submit the bounded expense/split inputs allowed by current policy only after current capability proof is revalidated at effect time. Funding/signing spend, membership/group administration, payment-destination control and settlement confirmation remain account-gated unless separately proven by a later reviewed contract.
- Serialized/imported/restored `capabilities` labels are descriptive cache only and never self-grant executable authority.
- Link/claim actions target an explicit `participant_id` and exact `link_operation_id`; name/email similarity may prompt review but may never merge records.
- Matching account proof alone does not change the Participant to `linked`. Guest participation remains valid while activation/binding is pending or unknown, and account-only capabilities stay unavailable until durable binding commit plus authoritative readback succeeds.
- A proven pre-effect/no-effect failure may permit a fresh link operation. Any possible-effect failure is `unknown` and must reconcile the same operation before new authority.
- Collision or proof mismatch becomes `unresolved` and preserves participant/history truth until explicit resolution.
- Group surfaces use group-scoped unlinkability: they must not expose a stable account identifier that correlates the same account-backed person across ChopDot groups.
