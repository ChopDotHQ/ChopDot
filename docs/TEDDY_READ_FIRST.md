# Teddy Read First

## Purpose

This is the entrypoint for Teddy or any agent working on the shared commitment MVP.

Do not start implementation from old `mvp` assumptions alone.
Do not start from scattered docs.

Start here.

## Branch

Use these docs from:

- `docs/shared-commitment-kernel-roadmap`

Treat the docs in this branch as the current source of truth for the next ChopDot implementation pass.

For code work:

- use `mvp` as the implementation base
- use this docs branch as the instruction layer

In other words:

- docs branch = what to do
- `mvp` = where to do it

## Read these first, in this order

1. [TEDDY_SHARED_COMMITMENT_IMPLEMENTATION_BRIEF.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/TEDDY_SHARED_COMMITMENT_IMPLEMENTATION_BRIEF.md)
2. [TEDDY_IMPLEMENTATION_ORDER.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/TEDDY_IMPLEMENTATION_ORDER.md)
3. [TEDDY_UX_MAPPING.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/TEDDY_UX_MAPPING.md)
4. [TEDDY_FOUNDER_HANDOFF.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/TEDDY_FOUNDER_HANDOFF.md)

## Then use these as reference

- [SHARED_COMMITMENT_KERNEL_ROADMAP.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/SHARED_COMMITMENT_KERNEL_ROADMAP.md)
- [SHARED_COMMITMENT_KERNEL_SPEC.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/SHARED_COMMITMENT_KERNEL_SPEC.md)
- [REFERENCE_FLOWS.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/REFERENCE_FLOWS.md)
- [KERNEL_VERIFICATION.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/KERNEL_VERIFICATION.md)

## What this means

The direction is:

- keep the cleanup wins
- do not bring back blockchain, wallet, CRDT, bridge, or backup complexity
- restore the shared commitment loop in a fiat/manual form
- keep the current app shell where possible
- make ChopDot feel like a shared commitment system, not just a balance calculator

## First proof to return

The first proof is:

1. open or create a pot / commitment
2. compute a settlement
3. create a chapter / closeout proposal
4. mark one leg as `paid`
5. confirm it from the counterparty side
6. close the chapter visibly
7. refresh and verify it persists

This first proof is intentionally:

- chapter / closeout loop first

It is not yet:

- the full multi-flow commitment platform
- the full builder package
- the full long-horizon lifecycle surface

The broader shared commitment lifecycle remains the design target.
The chapter / closeout loop is the first implementation proof.

## Do not optimize for yet

Do not spend time on:

- hackathon packaging
- builder APIs
- rail expansion
- chain readiness
- big refactors
- broad redesign

## If in doubt

If the code or old assumptions conflict with these docs, pause and come back to the founder rather than widening scope.
