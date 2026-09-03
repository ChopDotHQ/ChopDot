# ChopDot Experience Workbench — Start Here

This folder is the durable prototype and UX continuity layer for ChopDot.

## Branch safety

All work here belongs on `ux/experience-workbench`.
`main` remains untouched by prototype work.

## Read in this order

1. newest file in `registry/checkpoints/`
2. `journey-map.html`
3. `GOLDEN_SCREENS.md`
4. `WORKFLOW.md`
5. current journey spec and visual QA
6. `patterns/DESIGN_INHERITANCE.md`

## Current Golden set

- Journey 02 — Home / Orientation: **Golden #1 / V1.4**
- Journey 03 — Create a Group: **Golden #2 / V2**
- Journey 04 — Invite / Join: **Golden #3 / V1**
- Journey 08 — Group Home: **Golden #4 / V1**
- Journey 05 — Add an Expense: **Golden #5 / V1**

## Current review

Journey 06 — Review / Correct an Expense: **V1 Golden Candidate**

Read:
- `journeys/06-review-correct-expense/spec.md`
- `journeys/06-review-correct-expense/STATE_INVENTORY.md`
- `journeys/06-review-correct-expense/visual-qa/README.md`
- `registry/checkpoints/2026-09-03-j06-v1.json`

## Journey boundary

Journey 06 owns:
- understanding an expense
- editing
- split/receipt/history detail
- deleting
- edit permissions and recovery

Journey 07 owns:
- confirm
- question
- dispute

## Latest quality gate

Journey 06:
- 31 explicit states
- 128/128 internal links
- 44 representative renders
- 393 × 852 and 430 × 890
- no horizontal overflow
- no header/footer overlap
- no placeholder icons
- compared against the Golden screens

## Next

Review Journey 06. If approved, freeze it as Golden #6 and begin Journey 07 — Confirm / Agree / Dispute.

## Non-negotiable workflow

**Inherit → Build → Render → Inspect → State QA → Journey QA → Approve → Freeze**

Do not recreate ChopDot from memory.
