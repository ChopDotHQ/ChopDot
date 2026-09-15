# Phase C1 consumer contract — J27 Account / Preferences

This is a narrow successor contract; approved J27 Golden bytes remain unchanged.

- Account settings govern the authenticated account and account-backed capabilities; they do not define whether a guest is a valid group ledger participant.
- Upgrading/linking a guest account targets an explicit existing `participant_id` and preserves that ID plus all ledger/history/historical-ownership references.
- Link/claim is staged and atomic: account proof and activation must succeed before binding commit. Failed or cancelled linking leaves the exact pre-link Participant graph unchanged and grants no account capability.
- Display name or email matches may assist the user but may never silently claim or merge a participant.
- Proof mismatch/collision becomes `unresolved`; existing guest participation remains valid and recoverable.
- Signing/payment/admin capability availability may change only after successful verified binding, but prior expenses/splits/history do not migrate to a new participant record.
- Group-visible identity remains group-scoped: account settings must not cause a stable cross-group account identifier to appear on group surfaces.
- Account deletion/sign-out must not falsify or erase historical participant references in group ledgers.
