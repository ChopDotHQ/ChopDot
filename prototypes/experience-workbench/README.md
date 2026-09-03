# ChopDot Experience Workbench

A risk-free UX/product workspace for rebuilding ChopDot journey-by-journey before changing production.

## Why this exists
The prototype must not become another monolith. Each journey is isolated, versioned, and connected through a registry. Shared product decisions and design patterns are recorded separately from production code.

## Two truths
- **Product truth:** Approved journey prototypes and decisions in this workbench.
- **Implementation truth:** What the current GitHub repository actually does.

Neither silently overwrites the other.

## Status flow
`Not started → Prototype → Review → Design Approved → Implemented → Production Verified`

## Controls
- `START_HERE.md` — entrypoint and resume instructions.
- `SESSION_HANDOFF_2026-09-03.md` — originating thread continuity.
- `journey-map.html` — command center.
- `registry/state-snapshot.json` — journey, feature, edge-case, decision, and icon checkpoint.
- `docs/implementation-map.md` — prototype-to-production targets.
- `docs/dead-ends-and-gaps.md` — orphan/staleness rules.

## Prototype rule
No single prototype file should become a mini-app. If a journey grows, split it into explicit states/screens.

## Current progress
- Journey 02 Home / Orientation — Golden Screen #1 / Design Approved.
- Journey 03 Create a Group — V1 built; rebuild/retest pending.
- Journey 04 Join / Invite — next after Journey 03 reaches Golden quality.
