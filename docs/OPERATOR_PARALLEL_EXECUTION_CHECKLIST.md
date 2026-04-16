# Operator Parallel Execution Checklist

<discovery_plan>
- Convert the current parallel work into one executable checklist
- Keep this non-overlapping with Teddy's kernel branch
- Make each item produce a concrete artifact or decision
</discovery_plan>

## FACTS

- Teddy currently owns the active kernel implementation lane on `mvp`.
- The current product critical path is still:
  - restore the shared commitment kernel
  - make the first proof slice stable
  - resolve the current failing test and docs follow-up
- The highest-value parallel work is everything that makes Teddy's next push:
  - testable
  - measurable
  - priceable
  - explainable
  - pilotable

## INFERENCES

- The right parallel lane is not more feature ideation.
- The right parallel lane is operator-owned proof infrastructure around the kernel.
- Every task in this checklist should either:
  - sharpen judgment
  - collect market signal
  - reduce launch ambiguity
  - or prepare the first pilots

## ASSUMPTIONS

- You are not taking over Teddy's code lane until his branch is handoff-ready.
- You want one practical checklist, not another strategy memo.

## Working Rule

Do not touch Teddy's implementation branch while he is still debugging and documenting it.

Use this checklist to prepare everything needed the moment his branch is reviewable.

## P0: Branch Readiness Gate

### Goal

Define exactly what must be true before you review or take over Teddy's branch.

### Checklist

- [ ] Write the branch review gate in one note:
  - what failed
  - root cause
  - what is now working
  - what is still broken
  - whether the failure is test-only or semantic
- [ ] Define the three possible review outcomes:
  - `accept and continue`
  - `accept with fix list`
  - `stop and reset shape`
- [ ] Confirm the minimum kernel proof slice you expect to see:
  - chapter created
  - settlement legs typed
  - `pending -> paid -> confirmed`
  - visible closure
  - state survives refresh
  - typed history stays legible

### Deliverable

- one branch handoff gate note

## P1: Validation Kit

### Goal

Make the restored kernel immediately testable without improvising.

### Checklist

- [ ] Tighten [FOUNDER_VALIDATION_PLAN.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/FOUNDER_VALIDATION_PLAN.md) into a practical test script
- [ ] Create a validation log template with:
  - scenario
  - expected behavior
  - observed behavior
  - user confusion
  - trust break
  - severity
- [ ] Define a pass / fail / fix rubric
- [ ] Lock the first three live scenarios:
  - expense closeout chapter
  - group deposit
  - shared funding goal

### Deliverable

- one validation script
- one test log template
- one pass / fail / fix rubric

## P2: User Discovery

### Goal

Collect real language and recurring pain before more product shape hardens.

### Checklist

- [ ] Build a target list of 10 high-signal conversations:
  - trip organizers
  - retreat leads
  - popup community operators
  - workshop hosts
  - community treasurers
- [ ] Create a short interview script around:
  - fronting money
  - ghosting
  - dropouts
  - replacements
  - proof of paid vs confirmed
  - closeout pain
- [ ] Capture exact words people use for:
  - committed
  - paid
  - confirmed
  - replaced
  - closed
- [ ] Write one memo with repeated pain and repeated language patterns

### Deliverable

- one interview target list
- one interview script
- one pain-language memo

## P3: Pricing Proof

### Goal

Pressure-test willingness-to-pay instead of assuming the current pricing ladder is right.

### Checklist

- [ ] Create a pricing interview sheet for:
  - organizer
  - community
  - provider / SMB
- [ ] Test what people actually value paying for:
  - clear commitment state
  - fewer reminders and less chasing
  - visible paid vs confirmed truth
  - organizer controls
  - closeout visibility
- [ ] Record objections in categories:
  - not painful enough
  - would use but not pay
  - would pay if recurring
  - would pay if operator features exist
- [ ] Update pricing assumptions only if repeated evidence supports it

### Deliverable

- one pricing interview sheet
- one willingness-to-pay notes set
- one pricing signal summary

## P4: Metrics And Dashboard Spec

### Goal

Decide what ChopDot must measure as soon as the kernel works.

### Checklist

- [ ] Define the minimum operator dashboard metrics:
  - `R` readiness
  - `FR` funding ratio
  - `PCR` participation commitment ratio
  - `ORE` organizer risk exposure
  - `RB` recovery burden
- [ ] Add event requirements for each metric:
  - what action creates the metric input
  - where it should be stored
  - what must be visible in the UI
- [ ] Separate:
  - product-health metrics
  - monetization metrics
  - future ecosystem-attribution metrics
- [ ] Write the minimum dashboard requirements note

### Deliverable

- one metrics spec
- one dashboard requirements note

## P5: Private Ops Surface

### Goal

Separate open product materials from private company-operational materials.

### Checklist

- [ ] Create the top-level private structure you want:
  - finance
  - pricing
  - pilots
  - partners
  - legal
  - security
  - investor
  - dashboards
- [ ] Mark what should move first out of the shared repo using [PUBLIC_PRIVATE_MATERIALS_INVENTORY.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/PUBLIC_PRIVATE_MATERIALS_INVENTORY.md)
- [ ] Decide what Teddy still needs access to versus what is operator-only
- [ ] Prepare a move list, not ad hoc file drift

### Deliverable

- one private-ops folder plan
- one move-first inventory

## P6: Pilot Shortlist

### Goal

Reduce the gap between product proof and pilotable usage.

### Checklist

- [ ] List the first pilot candidate types:
  - retreats
  - trips
  - workshops
  - small communities
  - treasury-like group operators
- [ ] Rank them by:
  - repeated coordination pain
  - low sales friction
  - fast learning value
  - low legal complexity
- [ ] Identify which pilots are best for:
  - deposit wedge proof
  - closeout proof
  - recurring operator proof
- [ ] Write one shortlist note with the first three best pilot paths

### Deliverable

- one pilot shortlist
- one ranking rationale

## Daily Operating Order

If Teddy has not handed over the branch yet:

1. move P1 to completion
2. start P2 outreach
3. run P3 pricing interviews
4. draft P4 metrics spec
5. outline P5 private ops surface
6. rank P6 pilots

If Teddy hands over the branch:

1. run the branch readiness gate
2. test the proof slice with the validation kit
3. log failures and trust breaks
4. decide `accept`, `fix`, or `stop`
5. only then decide whether to take over implementation

## Decision

- stay out of Teddy's code lane for now
- use this checklist to make the next push immediately useful

## Why

This is the shortest path to turning Teddy's next branch into:
- product proof
- market learning
- pricing learning
- pilot readiness

## Next move

Start with:
- branch handoff gate
- validation script
- interview target list

Then do not open a new planning document until those three exist.
