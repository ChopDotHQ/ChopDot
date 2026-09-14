# ChopDot Experience Workbench — Start Here

Always read `registry/progress.json` first. It is the canonical current-journey/count authority; historical prose does not override it.

## Shared process

Read `DESIGN_CONTRACT.md`, `WORKFLOW.md`, `REVIEW_PROTOCOL.md`, `shared/improvements.md`, then the current journey definition bundle and only relevant adjacent Goldens.

## Current authority

28 registered journeys; 25 Goldens; 3 remaining.

Journey 25 — Storage / Backup / Recovery V1 is Golden #25. Exact approved artifact SHA-256: `785fd02267b1e47e1bde8513a6c91373ee1ce8dd85b35812201f0af92c77ca3f`. Human approval is issue #38 comment `5666505408`; HTML changes after approval are not authorized.

Journey 26 — Group Lifecycle V1 is **current at definition stage**. Canonical factory generation remains `v1.1`; caller-reachability coverage is required for every material state. No J26 candidate or human approval exists.

## Preserve

All 25 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated and must not become competing approval authority. TYPO-01 remains deferred.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

Each built journey's `spec.md#decision-history` records selected decisions, rationale, alternatives, tradeoffs, revisit triggers and source/approval references. Read it before changing a journey. Historical candidate labels do not override the current registry or approval records.

The 2026-09-06 backfill covers Journeys 01–14 from inspected records, not the complete conversation. Missing history is explicit. Author the section in the journey's `source/decision-history.md`; the gate preserves it through rebuilds. See `WORKFLOW.md#decision-history-and-future-revisits` and `registry/checkpoints/2026-09-06-decision-history.json`.
<!-- JOURNEY_DECISION_HISTORY:END -->
