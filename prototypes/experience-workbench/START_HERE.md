# ChopDot Experience Workbench — Start Here

This folder is the durable product/UX continuity layer for the ChopDot redesign. It exists so work can continue across ChatGPT, Codex, teammates, and future threads without depending on chat history.

## Branch safety

This work belongs on `ux/experience-workbench`.

- `main` is production/implementation truth and must not be changed by prototype work.
- This folder is product/design truth in progress.
- Nothing here is production implementation until a journey is explicitly marked **Implemented** and later **Production Verified**.

## Read in this order

1. `SESSION_HANDOFF_2026-09-03.md` — originating design-thread history and decisions.
2. newest file in `registry/checkpoints/` — compact current checkpoint.
3. `journey-map.html` — all journeys and current status.
4. `WORKFLOW.md` — quality/consistency process every journey must follow.
5. `GOLDEN_SCREENS.md` — approved visual references and current candidates.
6. `patterns/DESIGN_INHERITANCE.md` — frame, tokens, components, copy, and icon inheritance contract.
7. `docs/dead-ends-and-gaps.md` — orphan, stale, duplicate, and dead-end controls.

## Current product state

- Journey 02 — Home / Orientation: **Golden Screen #1 / Design Approved / V1.4.**
- Journey 03 — Create a Group: **Golden Journey #2 / Design Approved / V2.**
- Journey 04 — Invite / Join: **currently being prototyped.**

## Current Golden references

### Journey 02 — Home
`journeys/02-home-orientation/v1.4-inherited-icons.html`

### Journey 03 — Create Group
`journeys/03-create-group/v2-golden-candidate.html`

Both were rendered and reviewed at:
- 393 × 852
- 430 × 890

## What Journey 04 must solve
Two connected sides of one experience:

**Invite side**
`Group created / Group Home → Invite people → Share/send → Pending/sent`

**Join side**
`Open invite → Understand group + inviter → Join → Land in group`

Keep it human:
- no wallet addresses
- no blockchain terminology
- no permissions/configuration unless truly necessary
- enough context to know what is being joined
- obvious success and decline/not-now exits

## Non-negotiable principle

Do not recreate ChopDot screen-by-screen from memory. **Inherit the system → build → render → inspect the rendered image → test states/exits → approve.**
