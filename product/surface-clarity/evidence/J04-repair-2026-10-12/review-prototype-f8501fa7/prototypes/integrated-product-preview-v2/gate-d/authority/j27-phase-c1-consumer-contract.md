# Phase C1 consumer contract — J27 Account / Preferences

This is a narrow successor contract; approved J27 Golden bytes remain unchanged.

- Account settings govern the authenticated account and account-backed capabilities; they do not define whether a guest is a valid group ledger participant.
- Upgrading/linking a guest account targets an explicit existing `participant_id` and exact `link_operation_id`, preserving that ID plus all ledger/history/historical-ownership references.
- Matching account proof is nonterminal. The Participant remains a valid guest while account activation/binding is pending or unknown, and no account-only capability appears until durable binding commit plus authoritative readback succeeds.
- A known pre-effect/no-effect failure may allow a new link operation only after no-effect truth is proven. Any failure after possible external effect is `unknown` and must reconcile the same link operation before fresh authority.
- Display name or email matches may assist the user but may never silently claim or merge a participant.
- Proof mismatch/collision becomes `unresolved`; existing guest participation remains valid and recoverable.
- Signing/payment/admin capability availability may change only after successful verified binding/readback, but prior expenses/splits/history do not migrate to a new participant record.
- Guest capability labels shown or restored in settings are descriptive; current executable guest authority must be derived from current proof/policy/version and cannot be reconstructed from labels alone.
- Group-visible identity remains group-scoped: account settings must not cause a stable cross-group account identifier to appear on group surfaces.
- Account deletion/sign-out must not falsify or erase historical participant references in group ledgers.
