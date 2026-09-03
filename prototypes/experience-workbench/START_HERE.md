# ChopDot Experience Workbench — Start Here

This folder is the durable product/UX continuity layer for the ChopDot redesign. It exists so work can continue across ChatGPT, Codex, teammates, and future threads without depending on chat history.

## Branch safety

This work belongs on `ux/experience-workbench`.

- `main` is production/implementation truth and must not be changed by prototype work.
- This folder is product/design truth in progress.
- Nothing here is production implementation until a journey is explicitly marked **Implemented** and later **Production Verified**.

## Read in this order

1. `SESSION_HANDOFF_2026-09-03.md`
2. newest file in `registry/checkpoints/`
3. `journey-map.html`
4. `WORKFLOW.md`
5. `GOLDEN_SCREENS.md`
6. `patterns/DESIGN_INHERITANCE.md`
7. `docs/dead-ends-and-gaps.md`

## Current product state

- Journey 02 — Home / Orientation: **Golden Screen #1 / Design Approved / V1.4.**
- Journey 03 — Create a Group: **Golden Journey #2 / Design Approved / V2.**
- Journey 04 — Invite / Join: **Golden Journey #3 / Design Approved / V1.**
- Journey 08 — Group Home: **V1 Golden Candidate built, rendered, QA-tested, awaiting user approval.**
- Journey 05 — Add Expense: **next only after Journey 08 approval.**

## Current references

### Journey 02 — Home
`journeys/02-home-orientation/v1.4-inherited-icons.html`

### Journey 03 — Create Group
`journeys/03-create-group/v2-golden-candidate.html`

### Journey 04 — Invite / Join
`journeys/04-invite-join/v1-golden-candidate.html`

### Journey 08 — Group Home
`journeys/08-group-home/v1-golden-candidate.html`

Journey 08 QA:
`journeys/08-group-home/visual-qa/README.md`

## Journey 08 candidate truth

Group Home answers four questions first:
1. What happened?
2. What needs me?
3. Where do I stand?
4. What can I do next?

Hierarchy:
`Group identity → Attention → Your position → Recent activity → People / Settle`

Designed states:
- active / needs review
- nothing needs you
- new / empty group
- settlement in progress
- everyone square
- offline / saved data

Core product direction:
- overview-first, not tab-first
- user position outranks dense accounting metrics
- recent activity is contextual, not the full ledger
- detailed Expenses / People / Settings remain downstream handoffs
- global ChopDot bottom navigation remains inherited

## Non-negotiable principle

Do not recreate ChopDot screen-by-screen from memory. **Inherit the system → build → render → inspect the rendered image → test states/exits → approve.**
