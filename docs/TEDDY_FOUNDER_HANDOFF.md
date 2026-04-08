# Teddy Founder Handoff

## Purpose

This file removes the last layer of guesswork.

Use it to answer:

- where to start from
- what first milestone to return
- what not to optimize for yet
- what to bring back for review

Read this after:

- [TEDDY_SHARED_COMMITMENT_IMPLEMENTATION_BRIEF.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/TEDDY_SHARED_COMMITMENT_IMPLEMENTATION_BRIEF.md)
- [TEDDY_IMPLEMENTATION_ORDER.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/TEDDY_IMPLEMENTATION_ORDER.md)
- [TEDDY_UX_MAPPING.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/TEDDY_UX_MAPPING.md)

## Base branch

Start from the current cleanup direction.

That means:

- use `mvp` as the simplification base
- do not reintroduce removed blockchain, wallet, CRDT, bridge, or backup systems
- do not restart from a broad product rewrite

If the current `mvp` shape blocks the commitment loop in a fundamental way, stop and raise that immediately before widening scope.

## What you are building now

You are not building:

- the hackathon package
- the full shared commitment platform
- generalized APIs
- new rails
- new protocol logic

You are building:

- the smallest ChopDot app that still proves the shared commitment loop

## First milestone to return

Return when this exact slice works:

1. open or create a pot / commitment
2. compute a settlement
3. create a chapter / closeout proposal
4. mark one leg as `paid`
5. confirm it from the counterparty side
6. close the chapter visibly
7. refresh and verify the state persists

This is the first proof.

Do not wait for every edge case or commitment type before returning with this.

## What to optimize for

Optimize for:

- correctness of the loop
- visible state transitions
- persistence
- clear next action
- honest UI

Do not optimize for:

- broad feature coverage
- future builder APIs
- chain readiness
- visual redesign
- abstraction purity

## What not to build yet

Do not spend time on:

- blockchain settlement restoration
- wallet reconnection flows
- payment rail expansion
- CRDT or sync upgrades
- IPFS / backup work
- booking engine depth
- token / yield / protocol ideas
- agent execution surfaces
- hackathon packaging

## What to hand back for review

When the first milestone works, bring back:

- the branch
- a short summary of what changed
- the exact demo path through the app
- what still feels awkward in the pot model
- what still feels unclear in the UI
- any known gaps or unhandled edge cases
- any security, privacy, or trust concern you noticed

## Questions that should come back immediately

Stop and ask if:

- the current pot model cannot support the chapter / closeout loop cleanly
- `expense`, `goal`, and `deposit` clearly need different lifecycle rules right now
- there is no clean place in the current UI to show state, next action, and closure
- the implementation forces a much larger refactor than expected
- a removed system seems necessary for the kernel to work at all

## Definition of "moving in the right direction"

The work is moving in the right direction if ChopDot starts feeling less like:

- expenses
- balances
- settle button

and more like:

- shared objective
- visible state
- contribution / closeout progress
- confirmation
- closure

If the branch is getting smaller but not getting clearer about commitment state, it is drifting.
