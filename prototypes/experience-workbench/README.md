# ChopDot Experience Workbench

A risk-free UX/product workspace for rebuilding ChopDot journey-by-journey before changing production.

## Why this exists
The prototype must not become another monolith. Each journey is isolated, versioned, and connected through a registry. Shared product decisions and design patterns are recorded separately from production code.

## Two truths
- **Product truth:** Approved journey prototypes and decisions in this workbench.
- **Implementation truth:** What the current GitHub repository actually does.

Neither silently overwrites the other.

## Status flow
`Not started → Prototype → Review → GOLDEN-READY → Design Approved → Implemented → Production Verified`

`GOLDEN-READY` is an independent-review state only. It cannot become Design Approved without explicit human approval of the exact candidate.

## Controls
- `START_HERE.md` — entrypoint and resume instructions.
- `DESIGN_CONTRACT.md` — stable shared UX/product contract and active-context rule.
- `REVIEW_PROTOCOL.md` — independent critique and evidence gate.
- `shared/improvements.md` — cross-cutting issues that journey workers may record but may not silently fix locally.
- `WORKFLOW.md` — build/review/freeze sequence.
- `journey-map.html` — generated command center.
- `registry/progress.json` — canonical current journey/counts/next action.
- `registry/journeys.json` — canonical journey status and connections.
- `registry/approvals/` — explicit human design approvals.
- `registry/golden-artifact-locks.json` — checksum authority for approved artifacts.
- `registry/goldens.manifest.json` — generated machine-readable projection of approved Goldens; never hand-edit it.
- `registry/state-snapshot.json` — journey, feature, edge-case, decision, and icon checkpoint.
- `docs/implementation-map.md` — prototype-to-production targets.
- `docs/dead-ends-and-gaps.md` — orphan/staleness rules.

## Prototype rule
No single prototype file should become a mini-app. If a journey grows, split it into explicit states/screens.

## Current progress
Do not hard-code journey progress here. Read `registry/progress.json` first; generated status surfaces must agree with that authority before a freeze.