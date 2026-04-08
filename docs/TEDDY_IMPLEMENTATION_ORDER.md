# Teddy Implementation Order

## Purpose

This file removes ambiguity about what to build first.

Read this after:

- [TEDDY_SHARED_COMMITMENT_IMPLEMENTATION_BRIEF.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/TEDDY_SHARED_COMMITMENT_IMPLEMENTATION_BRIEF.md)

Use this file to sequence the work.

## First principle

Do not optimize for smallest codebase alone.

Optimize for:

- smallest implementation that still proves the shared commitment loop

## Base assumption

For now:

- keep `Pot` as the implementation base
- restore commitment semantics on top of it
- do **not** attempt a large rename/refactor to `SharedCommitment` first

That abstraction can become cleaner later.
Right now the goal is to restore the kernel with the smallest viable code change.

## Branch assumption

Continue from the cleanup direction.

Do not spend time rebuilding removed blockchain / wallet / CRDT / bridge systems unless explicitly asked.

## Implementation order

### Step 1: Restore typed lifecycle state

Start here.

Add or restore the minimum typed state needed for a chapter / closeout lifecycle:

- `draft`
- `active`
- `partially_settled`
- `completed`
- `cancelled`

Likely areas:

- `src/types/app.ts`
- `src/schema/pot.ts`

Done means:

- the lifecycle exists in code as a typed concept
- it is not represented as `unknown`
- UI and services can reference it without ad hoc string guessing

Do not do yet:

- major UI redesign
- chain integrations

### Step 2: Restore typed settlement legs

Each leg should minimally include:

- `from`
- `to`
- `amount`
- `status`

Statuses:

- `pending`
- `paid`
- `confirmed`

Likely areas:

- `src/types/app.ts`
- `src/schema/pot.ts`

Done means:

- a chapter can contain typed legs
- the system can distinguish proposed / paid / confirmed

Do not do yet:

- advanced proof metadata
- wallet-coupled settlement assumptions

### Step 3: Make settlement actions persist

Fix the current toast-only behavior.

Likely areas:

- `src/hooks/useSettlementActions.ts`
- `src/hooks/useSettleConfirm.ts`
- `src/services/data/services/SettlementService.ts`
- `src/services/data/repositories/SettlementRepository.ts`
- any current pot persistence path needed for the smallest viable state write

Done means:

- creating or progressing a settlement writes durable state
- refresh does not erase the chapter/leg state

Do not do yet:

- add new infrastructure layers
- rewrite persistence architecture

### Step 4: Add counterparty confirmation

Once persistence exists, add the second side of the loop.

Likely areas:

- `src/hooks/useSettleConfirm.ts`
- `src/components/screens/SettlementHistory.tsx`
- `src/routing/screen-props/settle-screens.tsx`
- `src/components/screens/SettleHome.tsx`

Done means:

- payer can mark a leg paid
- receiver can confirm it
- leg status changes from `paid` to `confirmed`

Do not do yet:

- broader workflow expansion
- external rails

### Step 5: Restore typed event history

Minimum events:

- `settlement_proposed`
- `settlement_confirmed`
- `chapter_closed`

Likely areas:

- `src/schema/pot.ts`
- `src/types/app.ts`
- persistence mapping files

Done means:

- history is typed
- history reflects the lifecycle transitions
- history can explain what happened

Do not do yet:

- analytics layers
- builder APIs

### Step 6: Expose the loop clearly in UI

Only after the state and persistence are real.

The UI must clearly show:

- current state
- next action
- waiting on who
- chapter closed

Likely areas:

- `src/components/screens/SettleHome.tsx`
- `src/components/screens/SettlementHistory.tsx`
- `src/components/screens/PotHome.tsx`

Done means:

- the user can tell where the commitment is in the loop
- the user can tell what action is still needed
- the user can tell when the loop is closed

Do not do yet:

- broad visual redesign
- feature expansion outside the loop

### Step 7: Remove or neutralize misleading stubs

Only after the commitment loop works.

Likely areas:

- `src/contexts/AccountContext.tsx`
- `src/hooks/useCheckpointState.ts`
- any “auditable” or wallet-specific UI still exposed without real meaning

Done means:

- the product no longer implies capability it does not have
- remaining surfaces are honest

## First proof slice

The first slice is done when this works:

1. create or open a pot / commitment
2. compute a settlement
3. create a proposal / chapter
4. mark one leg paid
5. confirm it from the counterparty side
6. close the chapter visibly
7. refresh and verify it persists

If this works, the branch is proving the right thing.

## What not to work on yet

Do not spend time on:

- blockchain settlement restoration
- wallet reinstatement
- CRDT / sync upgrades
- IPFS / backup
- booking engine expansion
- token / yield / protocol ideas
- agent execution
- generalized platform/API design

## When to come back to the founder

Stop and ask if:

- the `Pot` model cannot support the restored kernel cleanly
- the chapter model feels fundamentally wrong
- `expense`, `goal`, and `deposit` clearly need diverging lifecycle rules now
- the UI becomes confusing under organizer-only or unanimity assumptions
- preserving closure requires a larger object-model rethink

## Final test

Before calling the slice done, run the checks in:

- [KERNEL_VERIFICATION.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/KERNEL_VERIFICATION.md)
