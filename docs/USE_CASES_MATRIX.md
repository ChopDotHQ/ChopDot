# Use Cases Matrix

## Purpose

Use this file to test whether the shared commitment kernel works for the actual ChopDot use cases that matter now.

This is not a brainstorming list.
It is a founder/operator validation matrix.

## In scope now

These are the core use cases the current MVP should be evaluated against.

| Use case | Why it matters | Current priority | What must be true to count as working |
| --- | --- | --- | --- |
| Group deposit | Strongest wedge; no one wants to front the whole amount | Active now | target is visible, contributions are visible, release gate is explicit, closure is visible |
| Trip funding goal | Strong shared objective with multiple contributors over time | Active now | progress is legible, target is clear, contributors are visible, release remains explicit |
| Expense closeout chapter | Simplest current technical recovery path for the kernel loop | Active now | proposal exists, paid is distinct from confirmed, chapter closes only when confirmation is complete |
| Event funding | Same shape as deposit with clear deadline pressure | Supporting current work | can be expressed without new primitives |
| Service-linked shared funding | Tests whether the model can support provider-adjacent payments later | Supporting current work | linked objective still behaves like a commitment, not a booking engine |

## Out of scope now

Do not treat these as MVP success criteria yet.

| Use case | Why it is out of scope now |
| --- | --- |
| Full booking workflow | category expansion before commitment loop proof |
| Custodial pooled money | legal and trust burden too high for current stage |
| Yield-bearing shared funds | adds regulatory and product risk before core trust loop is proven |
| Deep wallet-driven multi-rail execution | rail complexity, not current product proof |
| Autonomous agent execution | agents should not own money movement in the current stage |

## Use-case walkthroughs

## 1. Group deposit

### Example

- villa reservation deposit
- workshop booking deposit
- retreat deposit

### Walkthrough

1. organizer creates a deposit-style commitment
2. participants are invited
3. participants join
4. contributions are recorded
5. target amount is reached
6. release is requested
7. approval rule is satisfied
8. release happens
9. closure is visible

### Questions

- Is the objective obvious?
- Is target progress obvious?
- Is it clear who still needs to act?
- Is release gated clearly enough that nobody thinks money is already gone when it is not?
- Is closure visible enough that the group can stop coordinating elsewhere?

## 2. Trip funding goal

### Example

- group trip fund
- accommodation fund
- transport budget fund

### Walkthrough

1. organizer creates a goal-style commitment
2. participants join
3. contributions accumulate over time
4. current amount and target remain visible
5. target is reached
6. release is requested
7. approval and closure rules are applied
8. closure is visible

### Questions

- Does the app still feel coherent when funding is gradual rather than immediate?
- Does it still feel like a commitment instead of just a savings tracker?
- Is the release step still understandable?

## 3. Expense closeout chapter

### Example

- shared dinner
- weekend trip expenses
- group event spend reconciliation

### Walkthrough

1. expenses create balances
2. a closeout proposal is created
3. each leg starts as `pending`
4. payer marks a leg as `paid`
5. receiver confirms the leg as `confirmed`
6. all required legs confirm
7. chapter closes visibly

### Questions

- Can users tell the difference between proposal, claimed payment, and acknowledged payment?
- Is closure explicit enough that the group knows the chapter is done?
- Does it still feel small and understandable?

## Decision rule

The MVP is moving in the right direction if all three in-scope use cases can be explained by the same underlying primitive without confusing the users.

If one use case requires inventing a different mental model, the kernel is not stable enough yet.
