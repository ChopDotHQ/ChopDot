# Journey 18 — Activity & Notifications V1.1 continuity correction

Status: local review candidate; not published; not Golden.

## Source truth

The starting correction file is the retained actual `j18-v1.1-continuity-candidate.html` from the 2026-09-08 continuity workspace, SHA-256 `e5d1dd9aa0b5beee5428967a0d8698d880f8c1dfc49ce5f96d2c7c35e11b1256`. It is not reconstructed from conversation summaries. The published V1 base is preserved separately at SHA-256 `fafb9cc74680b59f6589979115060895b6469e9ae760c59e35971be3e31f4a3a`.

## Narrow finalization

The V1.1 correction already fixed: one default Activity entry, invalid-fragment normalization, attention-card overflow, separate Waiting/Complete payment events, latest-state notification resolution, and a mutable read-state model.

This closeout fixes one remaining continuity mismatch without changing CSS or visual direction:

- Replace temporary notification row ids (`n:auto-*`) with the stable event-derived ids used by the model.
- Retain the earlier Waiting payment notification in Notifications → Earlier and route it to the existing stale/current-state explanation.
- Add the existing savings-confirmed event to the local notification fixture so every rendered notification row has a corresponding model record.

All five CSS blocks are byte-identical to the pre-final V1.1 correction. TYPO-01 remains deferred.

## Required behavior

- Waiting and Complete remain separate historical events for payment `p1`.
- Only the current Complete event controls current payment state; old Waiting is historical and not attention.
- Opening the older Waiting notification resolves to Complete and routes to Journey 15.
- Duplicate/out-of-order delivery cannot restore Waiting as current.
- Mark all read does not resolve the two open attention items.
- Activity → Notifications preserves zero unread until a new notification arrives.
- All attention rows remain reachable through normal scrolling.
