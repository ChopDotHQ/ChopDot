# ChopDot Experience Workbench — Start Here

Always read `registry/progress.json` first. It is the canonical current/count authority; historical prose does not override it.

## Shared process

Read `DESIGN_CONTRACT.md`, `WORKFLOW.md`, `REVIEW_PROTOCOL.md`, `shared/improvements.md`, then relevant Golden contracts.

## Current authority

28 registered journeys; 28 standing-approved/frozen Goldens; 0 remaining registered UX journeys.

Journey 28 — Things Go Wrong / Recovery V1 is Golden #28 at exact approved artifact SHA-256 `7ef254016da0755860fd0ede62840e7668d40406fdac850aad8c5e0ac4d12dfc`. Approval derives from the active standing human approval policy after independent GOLDEN-READY review; HTML changes after review are not authorized.

The final 28-Golden state is **exact-head validated** against canonical verification source `ec67add06888ab99212f3a4a533951195259030b` with Prototype workbench, CI, Coverage, Smoke and E2E all green. The registered UX journey-production phase is complete. Production implementation is still not authorized; the post-journey strategy gate owns the next phase.

## Preserve

All 28 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated and must not become competing approval authority. TYPO-01 remains deferred.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

Each built journey's `spec.md#decision-history` records selected decisions, rationale, alternatives, tradeoffs, revisit triggers and source/approval references. Read it before changing a journey. Historical candidate labels do not override the current registry or approval records.

The 2026-09-06 backfill covers Journeys 01–14 from inspected records, not the complete conversation. Missing history is explicit. Author the section in the journey's `source/decision-history.md`; the gate preserves it through rebuilds. See `WORKFLOW.md#decision-history-and-future-revisits` and `registry/checkpoints/2026-09-06-decision-history.json`.
<!-- JOURNEY_DECISION_HISTORY:END -->
