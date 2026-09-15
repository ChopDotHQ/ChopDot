# Phase C1 consumer contract — J27 Account / Preferences

This is a narrow successor contract; approved J27 Golden bytes remain unchanged.

- Account settings govern the authenticated account and account-backed capabilities; they do not define whether a guest is a valid group ledger participant.
- Upgrading/linking a guest account targets an explicit existing `participant_id` and preserves that ID plus all ledger/history references.
- Display name or email matches may assist the user but may never silently claim or merge a participant.
- Proof mismatch/collision becomes `unresolved`; existing guest participation remains valid and recoverable.
- Signing/payment/admin capability availability may change after a successful link, but prior expenses/splits/history do not migrate to a new participant record.
- Account deletion/sign-out must not falsify or erase historical participant references in group ledgers.
