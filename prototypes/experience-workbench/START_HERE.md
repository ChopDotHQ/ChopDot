# ChopDot Experience Workbench — Start Here

This folder is the durable product/UX continuity layer for the ChopDot redesign. It exists so work can continue across ChatGPT, Codex, teammates, and future threads without depending on chat history.

## Branch safety

This work belongs on `ux/experience-workbench`.

- `main` is production/implementation truth and must not be changed by prototype work.
- This folder is product/design truth in progress.
- Nothing here is production implementation until a journey is explicitly marked **Implemented** and later **Production Verified**.

## Read in this order

1. `SESSION_HANDOFF_2026-09-03.md` — what happened in the originating design thread and where to resume.
2. `journey-map.html` — all 28 journeys and current status.
3. `WORKFLOW.md` — the quality/consistency process every journey must follow.
4. `GOLDEN_SCREENS.md` — approved visual references and inheritance rules.
5. `registry/state-snapshot.json` — journey, feature, edge-case, decision, and icon state at this checkpoint.
6. `patterns/DESIGN_INHERITANCE.md` — frame, tokens, components, copy, and icon inheritance contract.
7. `docs/implementation-map.md` — prototype → production mapping.
8. `docs/dead-ends-and-gaps.md` — orphan, stale, duplicate, and dead-end controls.

## Current product state

- Journey 02 — Home / Orientation: **Golden Screen #1 / Design Approved. V1.4 is the current reference.**
- Journey 03 — Create a Group: **V1 prototype exists; rebuild/retest through the inherited system before approval.**
- Journey 04 — Invite / Join: **next after Journey 03 reaches Golden quality.**

## Current Home reference

`journeys/02-home-orientation/v1.4-inherited-icons.html`

Visual QA was performed at:
- 393 × 852
- 430 × 890

The QA findings and regeneration rules are in `journeys/02-home-orientation/visual-qa/README.md`.

## Non-negotiable principle

Do not recreate ChopDot screen-by-screen from memory. **Inherit the system → build → render → inspect the rendered image → test states/exits → approve.**
