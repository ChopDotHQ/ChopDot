# Phase C1 consumer contract — J09 Manage People

This is a narrow successor contract; approved J09 Golden bytes remain unchanged.

- A person row represents a durable group-scoped `participant_id`, not a display-name/email identity key.
- Surface `guest`, `account_backed`, `linked`, or `unresolved` only when capability/status context is relevant; guest membership is not a degraded ledger record.
- Account-only actions such as payment signing or group admin may be unavailable for `guest` while expenses, splits and history remain valid.
- Link/claim actions must target an explicit `participant_id`; name/email similarity may prompt review but may never merge records.
- Collision or proof mismatch becomes `unresolved` and preserves both participant records until explicit resolution.
