# ChopDot Experience Workbench — Start Here

Always read `registry/progress.json` first. It is the canonical current-journey/count authority; historical prose does not override it.

## Shared process

Read `DESIGN_CONTRACT.md`, `WORKFLOW.md`, `REVIEW_PROTOCOL.md`, `shared/improvements.md`, then the current journey definition bundle and only relevant adjacent Goldens.

## Current authority

28 registered journeys; 26 Goldens; 2 remaining.

Journey 26 — Group Lifecycle V1 is Golden #26. Exact approved artifact SHA-256: `4d93b1b3458aead8d412256f65d0e4c2c2de1b273abc0af58bd89cb56783da28`. Approval derives from the active standing human approval policy after independent GOLDEN-READY review; HTML changes after review are not authorized.

Journey 27 — Account & Preferences V1 is **staged at definition pending exact-head verification**. Canonical factory generation remains `v1.1`; caller-reachability coverage is required for every material state. Standing approval may apply only after an exact unchanged J27 candidate later reaches independent GOLDEN-READY.

## Preserve

All 26 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated and must not become competing approval authority. TYPO-01 remains deferred.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

Each built journey's `spec.md#decision-history` records selected decisions, rationale, alternatives, tradeoffs, revisit triggers and source/approval references. Read it before changing a journey. Historical candidate labels do not override the current registry or approval records.

The 2026-09-06 backfill covers Journeys 01–14 from inspected records, not the complete conversation. Missing history is explicit. Author the section in the journey's `source/decision-history.md`; the gate preserves it through rebuilds. See `WORKFLOW.md#decision-history-and-future-revisits` and `registry/checkpoints/2026-09-06-decision-history.json`.
<!-- JOURNEY_DECISION_HISTORY:END -->
