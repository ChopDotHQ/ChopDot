# Phase C1 consumer contract — J09 Manage People

This is a narrow successor contract; approved J09 Golden bytes remain unchanged.

- A person row represents a durable group-scoped `participant_id`, not a display-name/email identity key.
- Surface `guest`, `account_backed`, `linked`, or `unresolved` only when capability/status context is relevant; guest membership is not a degraded ledger record.
- Guest authority is an explicit group-scoped capability held by that guest. Management UI must not implement guest participation by deleting account-key/signature checks or by letting an organizer proxy-sign as the guest.
- Guest may consume member-visible ledger context and submit the bounded expense/split inputs allowed by policy. Funding/signing spend, membership/group administration, payment-destination control and settlement confirmation remain account-gated unless separately proven by a future reviewed contract.
- Account-only actions must be unavailable rather than silently proxied while guest expenses, splits and history remain valid.
- Link/claim actions target an explicit `participant_id`; name/email similarity may prompt review but may never merge records.
- Link/claim is staged and atomic: proof and account activation complete before binding commit. A failed or cancelled attempt leaves the exact pre-link Participant graph and every historical ownership reference unchanged.
- Collision or proof mismatch becomes `unresolved` and preserves both participant records until explicit resolution.
- Group surfaces use group-scoped unlinkability: they must not expose a stable account identifier that correlates the same account-backed person across ChopDot groups.
