# ChopDot Experience Workbench — Start Here

Always read `registry/progress.json` first. It is the canonical current-journey/count authority; historical prose does not override it.

## Shared process

Before doing journey work, read:

1. `DESIGN_CONTRACT.md` — stable shared product/UX rules and context-bundle rule.
2. `WORKFLOW.md` — Candidate → mechanical QA → independent review → human approval → Golden freeze.
3. `REVIEW_PROTOCOL.md` — five independent review lenses and evidence requirements.
4. `shared/improvements.md` — cross-journey issues that must not be silently fixed inside a journey.
5. The current journey's spec, state inventory, edge cases, decision history, and only the relevant adjacent Goldens.

## Current authority

28 registered journeys; 20 Goldens; 8 remaining.

Journey 20 — Payment Methods V1 is Golden #20. Exact approved artifact SHA-256: `02620eb85888d2e7abac3fbd06e82b7e03e42caff2064cc259f59421864406ab`. Direct visual review and explicit Devinson approval were recorded before freeze; HTML changes after approval are not authorized.

Journey 21 — Wallet & Crypto V1 is **current at definition stage**. Read `journeys/21-wallet-crypto/spec.md`, `source/decision-history.md`, `STATE_INVENTORY.md`, `EDGE_CASES.md`, and relevant adjacent Goldens before building. No J21 review candidate exists yet.

## Preserve

All 20 Golden artifact checksums must pass. `registry/goldens.manifest.json` is generated from the journey and lock registries and must not become a competing approval authority. TYPO-01 remains deferred.

<!-- JOURNEY_DECISION_HISTORY:START -->
## Decision history

Each built journey's `spec.md#decision-history` records selected decisions, rationale, alternatives, tradeoffs, revisit triggers and source/approval references. Read it before changing a journey. Historical candidate labels do not override the current registry or approval records.

The 2026-09-06 backfill covers Journeys 01–14 from inspected records, not the complete conversation. Missing history is explicit. Author the section in the journey's `source/decision-history.md`; the gate preserves it through rebuilds. See `WORKFLOW.md#decision-history-and-future-revisits` and `registry/checkpoints/2026-09-06-decision-history.json`.
<!-- JOURNEY_DECISION_HISTORY:END -->
