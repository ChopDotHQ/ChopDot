# Phase C1 consumer contract — J24 Export / Portability

This is a narrow successor contract; approved J24 Golden bytes remain unchanged.

- Export durable `group_id` + `participant_id` for every participant, including guests.
- Preserve participant state/provenance and stable expense/split/history/historical-ownership references needed to reconstruct ledger meaning.
- An account link/upgrade must not rewrite historical participant IDs in exports. Pending/unknown link operations preserve the guest Participant; a verified durable binding enriches the same Participant.
- Display names and contact hints are metadata only; they are never sufficient to collapse two exported participants.
- `unresolved` identities remain distinct in export with enough non-sensitive linkage/recovery metadata to continue resolution safely.
- Capability labels/version metadata in export are descriptive only and cannot self-grant executable guest/account authority after import. Broad export must not carry active guest authenticator material.
- A restored/imported guest must re-establish current authority from explicit proof/current policy before guest-authored writes resume; credential rotation may preserve the same `participant_id`.
- Group-scoped unlinkability is preserved: broad/group exports must not expose a stable cross-group account identifier merely because a Participant is account-backed or linked.
- Export does not grant account-only payment/signing/admin capabilities and does not turn private account-binding metadata into group authority.
