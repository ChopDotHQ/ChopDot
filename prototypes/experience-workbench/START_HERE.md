# ChopDot Experience Workbench — Start Here

## Current state

- 28 registered journeys
- 7 Golden / Design Approved
- Journey 10 — Overall Position is current
- 21 journeys remain overall
- 3 journeys remain in the in-app money loop: 10, 11, 12

## Canonical control files

1. `registry/journeys.json`
2. `registry/features.json`
3. `registry/edge-cases.json`
4. `registry/progress.json`
5. generated `journey-map.html`

## Map rule

Never edit `journey-map.html`, `feature-coverage.html`, or `edge-case-ledger.html` directly.

Run:

```bash
npm run gate
```

before freezing any journey. The gate regenerates the control surfaces and rejects stale counts, missing paths, orphan features, broken references, dead ends, or a fingerprint mismatch.

## Current work

Journey 10 must answer:

- What do I owe?
- What am I owed?
- Who is involved?
- Across which groups?
- What needs action?

## Golden set

02 Home V1.4  
03 Create Group V2  
04 Invite / Join V1  
05 Add Expense V1  
06 Review / Correct V1.1  
07 Review / Agree V1.1  
08 Group Home V1

## Reading order

1. `docs/MAP_GOVERNANCE.md`
2. `journey-map.html`
3. `GOLDEN_SCREENS.md`
4. `WORKFLOW.md`
5. newest file in `registry/checkpoints/`
