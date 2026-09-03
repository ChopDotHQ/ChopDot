# ChopDot Experience Workbench — Start Here

This folder is the durable product/UX continuity layer for the ChopDot redesign. It exists so work can continue across ChatGPT, Codex, teammates, and future threads without depending on chat history.

## Branch safety

This work belongs on `ux/experience-workbench`.

- `main` is production/implementation truth and must not be changed by prototype work.
- This folder is product/design truth in progress.
- Nothing here is production implementation until a journey is explicitly marked **Implemented** and later **Production Verified**.

## Read in this order

1. `SESSION_HANDOFF_2026-09-03.md` — originating design-thread history and decisions.
2. `registry/checkpoints/2026-09-03-j03-v2.json` — newest compact checkpoint.
3. `journey-map.html` — all 28 journeys and current status.
4. `WORKFLOW.md` — quality/consistency process every journey must follow.
5. `GOLDEN_SCREENS.md` — approved visual references and Golden candidates.
6. `registry/state-snapshot.json` — full earlier journey/feature/edge/decision/icon snapshot.
7. `patterns/DESIGN_INHERITANCE.md` — frame, tokens, components, copy, and icon inheritance contract.
8. `docs/implementation-map.md` — prototype → production mapping.
9. `docs/dead-ends-and-gaps.md` — orphan, stale, duplicate, and dead-end controls.

## Current product state

- Journey 02 — Home / Orientation: **Golden Screen #1 / Design Approved. V1.4 is the visual reference.**
- Journey 03 — Create a Group: **V2 Golden Candidate built, rendered, QA-tested, and awaiting user approval.**
- Journey 04 — Invite / Join: **next only after Journey 03 is approved/frozen.**

## Current references

### Journey 02 — Home
`journeys/02-home-orientation/v1.4-inherited-icons.html`

### Journey 03 — Create Group
`journeys/03-create-group/v2-golden-candidate.html`

Create Group visual QA:
`journeys/03-create-group/visual-qa/README.md`

Both Home and Create Group were reviewed at:
- 393 × 852
- 430 × 890

## Important open questions before implementation

- **CHF:** Create Group V2 uses CHF as product truth, while the current production CreatePot screen does not visibly offer CHF. Reconcile deliberately.
- **Offline creation:** V2 proposes `Offline. Save now. Sync later.` Validate against the actual data/service layer before implementation.
- **Savings:** keep separate from core shared-expense creation.

## Non-negotiable principle

Do not recreate ChopDot screen-by-screen from memory. **Inherit the system → build → render → inspect the rendered image → test states/exits → approve.**
