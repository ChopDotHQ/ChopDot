# Reference Flows

This file defines the canonical flows builders should preserve.

## Flow 1: Group deposit

Use case:

- a group needs to fund a deposit before one person fronts the full amount

Example:

- villa deposit
- retreat reservation
- workshop booking deposit

Flow:

1. organizer creates commitment
2. participants are invited
3. participants join
4. participants contribute
5. target amount is reached
6. release is requested
7. required parties approve
8. release happens
9. chapter closes visibly

What matters:

- target amount
- contribution progress
- release gate
- visible completion

## Flow 2: Shared goal funding

Use case:

- a group wants to build toward a target over time

Example:

- trip fund
- event accommodation fund
- shared group budget target

Flow:

1. organizer creates goal commitment
2. participants join
3. contributions accumulate over time
4. target is reached
5. organizer requests release
6. rule-defined approval happens if required
7. release completes
8. chapter closes

What matters:

- cumulative progress
- current amount vs target
- who has contributed
- what must happen before release

## Flow 3: Expense closeout chapter

Use case:

- a group already spent together and now needs a reliable closeout

Flow:

1. expenses define balances
2. settlement proposal is created
3. each leg starts as `pending`
4. payer marks a leg as `paid`
5. receiver confirms the leg as `confirmed`
6. when all required legs are confirmed, the chapter closes

What matters:

- proposal exists
- paid is distinct from confirmed
- closure is explicit

## Common rules across all flows

Every reference flow should preserve:

- one canonical commitment state
- one visible next action
- explicit release or close conditions
- durable event history
- visible closure
