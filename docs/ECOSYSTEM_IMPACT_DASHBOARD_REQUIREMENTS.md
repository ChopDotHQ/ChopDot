# Ecosystem Impact Dashboard Requirements

<discovery_plan>
- Define the minimum dashboard ChopDot needs to justify continuity, ecosystem value, and future trust-layer economics
- Separate product-proof metrics from ecosystem-impact metrics
- Prevent impact claims from drifting into dashboard theater
</discovery_plan>

## FACTS

- Current doctrine says ChopDot will only deserve ecosystem continuity value if it can prove attributable impact.
- Existing metric doctrine already defines core internal metrics such as:
  - `R`
  - `FR`
  - `PCR`
  - `ORE`
  - `RB`
  - see: [SYSTEM_METRICS_AND_FORMULAS.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/SYSTEM_METRICS_AND_FORMULAS.md)
- Current GTM doctrine also established public-facing category metrics:
  - `TVC`
  - `CCR`
  - `ORE`

## INFERENCES

- ChopDot needs one dashboard surface that can support:
  - founder/operator judgment
  - future ecosystem funding conversations
  - product-proof evaluation
- The dashboard must be attributable and action-linked.

## ASSUMPTIONS

- Ecosystem-value capture is a later-stage path, not current primary revenue.
- The dashboard should be designed now so instrumentation can be added early.

## Core Rule

No ecosystem-impact claim should be made unless the dashboard can answer:

1. what happened
2. which users or operators did it involve
3. which commitment flow produced it
4. which ecosystem, rail, or protocol it touched
5. whether it repeated

## Dashboard Layers

## Layer 1: Product Proof

Purpose:

- prove the kernel is producing real coordination value

Minimum metrics:

- commitments created
- chapters requested
- chapters closed
- `PCR`
- `ORE`
- `RB`
- repeat organizer usage

## Layer 2: Operator Value

Purpose:

- prove ChopDot reduces organizer/operator burden

Minimum metrics:

- organizer fronted amount
- organizer secured amount
- organizer-risk reduction over time
- manual rescue count
- time-to-close
- dropout-to-reassignment recovery where relevant

## Layer 3: Ecosystem Attribution

Purpose:

- prove ChopDot caused measurable activity in a specific ecosystem or rail

Minimum fields:

- ecosystem / chain / protocol touched
- number of users activated into that ecosystem
- commitments involving that ecosystem
- value coordinated into that ecosystem
- repeat activity by those users
- actions completed rather than only initiated

## Required Public-Facing Metrics

## 1. TVC: Total Value Coordinated

Definition:

- total value that moved through successfully completed commitment flows

Rule:

- should prefer completed or confirmed value
- should not count vague intent or incomplete flows as real value

## 2. CCR: Commitment Completion Rate

Definition:

- share of commitments or chapters that reach legitimate closure

Rule:

- must use actual closure conditions, not UI-only completion

## 3. ORE: Organizer Risk Exposure

Definition:

- amount of organizer-side unsecured exposure

Rule:

- should show both raw exposure and exposure reduction over time

## Attribution Requirements

For any external ecosystem/protocol attribution, the dashboard must support:

- source commitment id
- relevant chapter or action id
- timestamp
- actor count
- value amount
- ecosystem label
- action outcome

Without those fields, attribution is too weak for serious funding or partner claims.

## Data Integrity Rules

- pending value must not be reported as completed value
- initiated actions must not be reported as confirmed outcomes
- duplicated or replayed actions must be excluded or explicitly marked
- ecosystem routing claims must be auditable back to source flows

## Views Required

## Founder / operator view

Shows:

- proof of product value
- operator pain
- repeat usage
- open blockers

## Ecosystem / partner view

Shows:

- attributable usage caused
- user activation
- value coordinated
- repeat activity
- reliability caveats

## Internal rigor view

Shows:

- metric definitions
- excluded values
- confidence level by metric
- data-quality warnings

## Confidence And Claim Rules

Every major dashboard metric should carry:

- metric definition
- source logic
- confidence level
- known data limitations

This prevents metrics from becoming persuasive but untrustworthy.

## Current Gap

ChopDot does not yet have the instrumentation or completed proof flows to populate this dashboard honestly.

That is acceptable.
What matters now is defining it before ecosystem-value claims are made.

## Decision

ChopDot should design the impact dashboard now, but only make strong ecosystem-value claims once attribution and repeatability are real.

## Why

Because future continuity funding and trust-layer economics depend on measurable contribution, not narrative alone.

## Next Move

Use this doc to:

1. define instrumentation requirements for the first proof slice
2. seed a founder/operator dashboard
3. constrain future ecosystem-value claims
