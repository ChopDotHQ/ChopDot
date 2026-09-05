# ChopDot Experience Workbench — Start Here

28 journeys; 10 Golden; 18 remaining.

Journey 12 V1.1 is Golden #10. The complete in-app money loop is design-approved.

## Current review

Journey 01 — Enter ChopDot v1.

Open `journeys/01-enter-chopdot/v1-candidate.html`. Read `journeys/01-enter-chopdot/spec.md`, then `journeys/01-enter-chopdot/VISUAL_QA.md`.

## Preserve

Approved HTML is checksum-locked in registry/golden-artifact-locks.json. Never edit approved screens as part of later journeys.

TYPO-01: Small progress-label readability is deferred to a shared typography pass. No font changes now.

## Gate

`npm run gate` replays historical bundles, restores explicit approvals/current candidate, regenerates maps, and validates the final state. A later candidate is declared in registry/active-candidate.json; old freeze tasks must not erase it.
