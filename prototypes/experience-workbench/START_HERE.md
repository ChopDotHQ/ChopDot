# ChopDot Experience Workbench — Start Here

Always read `registry/progress.json` first. It is the canonical current-journey/count authority; historical prose does not override it.

## Shared process

Read `DESIGN_CONTRACT.md`, `WORKFLOW.md`, `REVIEW_PROTOCOL.md`, `shared/improvements.md`, then the current journey definition bundle and only relevant adjacent Goldens.

## Current authority

28 registered journeys; 24 Goldens; 4 remaining.

Journey 24 — Export / Portability V1 is Golden #24. Exact approved artifact SHA-256: `03d1c2094251dc3ec683108c484bdc84e6f7db08b1c40ce042535a2d186a9b82`. Human approval is issue #38 comment `5663800809`; HTML changes after approval are not authorized.

Journey 25 — Storage / Backup / Recovery V1 is **current at definition stage**. Factory v1.1 requires a compressed current-work packet and truthful caller-reachability coverage for every material state. No J25 candidate or human approval exists.

## Preserve

All 24 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated and must not become competing approval authority. TYPO-01 remains deferred.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

Each built journey's `spec.md#decision-history` records selected decisions, rationale, alternatives, tradeoffs, revisit triggers and source/approval references. Read it before changing a journey. Historical candidate labels do not override the current registry or approval records.

The 2026-09-06 backfill covers Journeys 01–14 from inspected records, not the complete conversation. Missing history is explicit. Author the section in the journey's `source/decision-history.md`; the gate preserves it through rebuilds. See `WORKFLOW.md#decision-history-and-future-revisits` and `registry/checkpoints/2026-09-06-decision-history.json`.
<!-- JOURNEY_DECISION_HISTORY:END -->
