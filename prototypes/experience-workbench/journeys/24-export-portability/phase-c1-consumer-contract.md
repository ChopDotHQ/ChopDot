# Phase C1 consumer contract — J24 Export / Portability

This is a narrow successor contract; approved J24 Golden bytes remain unchanged.

- Export durable `group_id` + `participant_id` for every participant, including guests.
- Preserve participant state/provenance and stable expense/split/history references needed to reconstruct ledger meaning.
- An account link/upgrade must not rewrite historical participant IDs in exports.
- Display names and contact hints are metadata only; they are never sufficient to collapse two exported participants.
- `unresolved` identities remain distinct in export with enough linkage/recovery metadata to continue resolution safely.
- Export does not grant account-only payment/signing/admin capabilities.
