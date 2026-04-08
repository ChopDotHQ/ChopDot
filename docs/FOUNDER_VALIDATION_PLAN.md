# Founder Validation Plan

## Purpose

This file defines how the founder and Teddy should validate the shared commitment MVP before any builder or hackathon motion.

## Validation goal

Prove that ChopDot behaves like a dependable shared commitment system under both normal and messy conditions.

## Validation sequence

## Phase 1: Kernel proof

Run the first proof slice:

1. open or create a pot / commitment
2. compute a settlement
3. create a chapter / closeout proposal
4. mark one leg as `paid`
5. confirm it from the counterparty side
6. close the chapter visibly
7. refresh and verify it persists

If this fails, stop and fix the loop before expanding.

## Phase 2: Use-case walkthroughs

Run:

- group deposit
- trip funding goal
- expense closeout chapter

Use:

- [USE_CASES_MATRIX.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/USE_CASES_MATRIX.md)

## Phase 3: Edge-case pressure

Run:

- non-confirming counterparty
- premature release request
- partial confirmation
- invited but not joined participants
- refresh mid-flow
- mixed old/new data

Use:

- [EDGE_CASES_MATRIX.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/EDGE_CASES_MATRIX.md)

## Phase 4: Security and privacy pass

Use:

- [SECURITY_PRIVACY_REVIEW.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/SECURITY_PRIVACY_REVIEW.md)

Ask:

- does the product lie
- does the product overclaim trust
- can the wrong person do the wrong thing
- is closure visible and honest
- is participant data exposed carefully enough

## Phase 5: Founder signoff

Only after phases 1-4 pass well enough should you consider:

- private builder pilot
- hackathon planning
- builder API or packaging work

## What to capture after each session

Record:

- what flow was tested
- what failed
- what felt confusing
- what felt strong
- what must be fixed before the next phase

## Signoff questions

Do not move forward until both founder and Teddy can answer yes to these:

- Does the app now feel like a shared commitment system?
- Is the loop durable across refresh?
- Are `paid` and `confirmed` clearly different?
- Is closure explicit?
- Can users tell what happens next?
- Are the trust boundaries honest?

## Output

The output of this validation phase should be:

- completed use-case matrix
- completed edge-case matrix
- completed security/privacy review
- a short founder decision note:
  - proceed to private builders
  - or fix specific gaps first
