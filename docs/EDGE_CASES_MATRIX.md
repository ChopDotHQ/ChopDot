# Edge Cases Matrix

## Purpose

Use this file to break the shared commitment loop deliberately.

The goal is not to prove the happy path.
The goal is to learn where state, trust, and clarity fail under real conditions.

## High-priority edge cases

| Edge case | Why it matters | Expected behavior |
| --- | --- | --- |
| Payer marks paid, receiver never confirms | tests whether `paid` and `confirmed` are meaningfully different | chapter remains open; UI shows what is waiting and on whom |
| Wrong amount is recorded | tests correction path and trust clarity | system should not silently close; mismatch should stay visible |
| Release requested too early | tests approval/release guardrails | release must stay blocked with visible reason |
| Target not reached | tests whether premature closure is prevented | release or closure should not happen unless the rule allows it |
| Participant invited but never joins | tests participant-state clarity | pending participation should be visible and not counted as joined approval |
| One participant drops out mid-flow | tests whether participation state changes break closure logic | participant status must remain legible; commitment should not become incoherent |
| Refresh during active closeout | tests persistence and state durability | state survives refresh without losing chapter progress |
| One leg confirmed, others still pending | tests partial completion clarity | chapter remains open until closure conditions are actually met |
| Existing old history meets new typed history | tests migration tolerance | app should stay understandable and not crash on mixed history states |
| Dead wallet/checkpoint surfaces remain visible | tests whether product still implies fake capabilities | misleading UI should be gone or clearly labeled |

## Test sheet

Use this template for each edge case:

| Edge case | Reproduced? | Result | Clear to user? | Correctly blocked/allowed? | Notes |
| --- | --- | --- | --- | --- | --- |
| Example: payer marks paid, receiver never confirms | yes/no | chapter stays open / closes incorrectly / unclear | yes/no | yes/no | freeform notes |

## Specific scenarios to run

## 1. Non-confirming counterparty

1. create closeout proposal
2. mark one leg as `paid`
3. do not confirm it
4. refresh
5. revisit from both sides

Questions:

- Is the chapter still open?
- Is the next action visible?
- Is the waiting party visible?

## 2. Premature release

1. create deposit/goal flow
2. request release before target or approval condition is met

Questions:

- Is release blocked?
- Is the reason obvious?
- Does the UI still feel trustworthy?

## 3. Partial confirmation

1. create multiple settlement legs
2. confirm only one of them

Questions:

- Does the app show partial completion cleanly?
- Does closure wait correctly?

## 4. Participant-state drift

1. invite participants
2. leave one unjoined
3. attempt actions that depend on joined participants

Questions:

- Is invited vs joined visible?
- Does approval logic count the right people?

## 5. Mixed old/new data

1. open data created before typed history restoration
2. progress it with the new loop

Questions:

- Is the migration path understandable?
- Does old data become misleading?

## Decision rule

The MVP is not ready for external builders if the edge cases make the system:

- lie
- close too early
- hide who is blocking progress
- lose state
- or imply trust that does not exist
