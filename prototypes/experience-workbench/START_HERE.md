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
- Journey 04 — Invite / Join: **V1 Golden Candidate built, rendered, QA-tested, awaiting user approval.**
- Journey 08 — Group Home: **next only after Journey 04 approval.**

## Current references

### Journey 02 — Home
`journeys/02-home-orientation/v1.4-inherited-icons.html`

### Journey 03 — Create Group
`journeys/03-create-group/v2-golden-candidate.html`

### Journey 04 — Invite / Join
`journeys/04-invite-join/v1-golden-candidate.html`

Journey 04 QA:
`journeys/04-invite-join/visual-qa/README.md`

## Journey 04 prototype truth

Inviter:
`Invite people → Share link / Add someone → Pending/sent → Open group`

Joiner:
`Open invite → Understand group + inviter → Join / Not now → Joined → Open group`

Prototype rules:
- no wallet addresses
- no blockchain terminology
- invitee sees group-level context only before joining
- expenses/balances stay private until join
- expired / already joined / offline states are explicit

## Non-negotiable principle

Do not recreate ChopDot screen-by-screen from memory. **Inherit the system → build → render → inspect the rendered image → test states/exits → approve.**
