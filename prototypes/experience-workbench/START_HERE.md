# ChopDot Experience Workbench — Start Here

Always read `registry/progress.json` first. It is the canonical current-journey/count authority; historical prose does not override it.

## Shared process

Read `DESIGN_CONTRACT.md`, `WORKFLOW.md`, `REVIEW_PROTOCOL.md`, `shared/improvements.md`, then the current journey definition bundle and only relevant adjacent Goldens.

## Current authority

28 registered journeys; 27 Goldens; 1 remaining.

Journey 27 — Account & Preferences V1 is Golden #27. Exact approved artifact SHA-256: `64b730ee19a8713826868af6ca4b39b33d0c48c128b2fce2e90c7beec1dfa560`. Approval derives from the active standing human approval policy after independent GOLDEN-READY review; HTML changes after review are not authorized.

Journey 28 — Things Go Wrong / Recovery V1 is **staged at definition pending exact-head verification**. Canonical factory generation remains `v1.1`; caller-reachability coverage is required for every material state. Standing approval may apply only after an exact unchanged J28 candidate later reaches independent GOLDEN-READY.

## Preserve

All 27 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated and must not become competing approval authority. TYPO-01 remains deferred.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

Each built journey's `spec.md#decision-history` records selected decisions, rationale, alternatives, tradeoffs, revisit triggers and source/approval references. Read it before changing a journey. Historical candidate labels do not override the current registry or approval records.

The 2026-09-06 backfill covers Journeys 01–14 from inspected records, not the complete conversation. Missing history is explicit. Author the section in the journey's `source/decision-history.md`; the gate preserves it through rebuilds. See `WORKFLOW.md#decision-history-and-future-revisits` and `registry/checkpoints/2026-09-06-decision-history.json`.
<!-- JOURNEY_DECISION_HISTORY:END -->
