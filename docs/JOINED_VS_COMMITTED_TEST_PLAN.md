# Joined Vs Committed Test Plan

<discovery_plan>
- Turn the `joined` vs `committed` claim into a concrete first experiment
- Make the test small enough to run early and strict enough to generate useful evidence
- Tie the result back to the claims ledger and validation framework
</discovery_plan>

## FACTS

- The repo currently carries this major claim:
  - [CLAIMS_AND_EVIDENCE_LEDGER.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/CLAIMS_AND_EVIDENCE_LEDGER.md)
  - `CL-002`: `joined` is not the same as `committed`
- The behavioral research corpus strongly supports the idea that visible commitment should be separated from vague or soft participation.
- ChopDot has not yet proven this distinction improves behavior in its own contexts.

## INFERENCES

- This is the right first human-mechanisms test because:
  - it is central to product truth
  - it affects UI, policy, and metrics
  - it can be tested without introducing harsh financial mechanisms too early

## ASSUMPTIONS

- The earliest workable test may be a structured prototype/walkthrough plus a small live usage slice.
- A staged approach is acceptable:
  - first comprehension and expectation testing
  - then behavior testing in a live or quasi-live flow

## Claim Under Test

`CL-002`: `joined` is not the same as `committed`

## Hypothesis

Groups using an explicit `committed` state in addition to `joined` will produce:

- better participant understanding of obligation
- lower organizer confusion
- more accurate expectation-setting
- better follow-through signals

than groups using `joined` alone.

## What Counts As Support

Support means most or all of the following:

- participants can clearly explain the difference between `joined` and `committed`
- organizers report better clarity about who is actually in
- commitment conversion is visible and meaningful
- ambiguity and chasing burden decrease

## What Would Weaken It

- users do not understand the distinction
- users understand it but ignore it
- the extra state adds friction without improving clarity or follow-through

## What Would Falsify It

The claim should be considered falsified or heavily weakened if:

- `joined` alone performs equally well on understanding and organizer clarity
- or the `committed` layer reduces adoption with no meaningful behavior improvement

## Experiment Design

## Phase 1: Comprehension Test

Method:

- structured walkthrough or clickable prototype

Cohort:

- 5 to 10 organizer-like users
- 5 to 10 participant-like users

Conditions:

- Version A: `joined` only
- Version B: `joined` plus explicit `committed`

Primary questions:

- what do you think each state means?
- who do you think is actually expected to act?
- who would you trust to show up or pay?
- what would you, as organizer, do next?

Primary metric:

- comprehension accuracy

Secondary metrics:

- organizer confidence
- perceived clarity
- perceived friction

## Phase 2: Behavior Test

Method:

- small real or quasi-real coordination flow

Cohort:

- 3 to 5 groups if possible

Conditions:

- baseline group flow using `joined` semantics
- intervention group flow using `joined` and explicit `committed`

Primary metric:

- `PCR` for the required action tied to commitment

Secondary metrics:

- organizer confusion count
- organizer chase messages required
- dropout / no-show rate
- participant self-reported understanding

## Measurement Plan

Use:

- `PCR`
- organizer confusion count
- no-show / dropout count
- time-to-readiness
- participant understanding score

Qualitative capture:

- what participants thought they agreed to
- what organizers thought participants had agreed to
- whether the new state felt helpful or bureaucratic

## Sample Result Interpretation

### Strong support

- participants consistently distinguish the states
- organizers report materially less ambiguity
- `PCR` improves or clarity improves with no meaningful adoption penalty

### Mixed result

- comprehension improves, but behavior does not
- organizers like it, but participants find it noisy

### Failure

- users do not understand or use the distinction
- follow-through does not improve
- extra state adds confusion or drag

## Decision Threshold

Promote the claim if:

- comprehension improves clearly
- organizer ambiguity decreases
- and there is no significant participation penalty

Keep testing if:

- results improve clarity but not yet behavior

Downgrade the claim if:

- the distinction fails to improve understanding or behavior

## Dependencies

Before live behavior testing, ChopDot should have:

- a stable enough state model to present `joined` and `committed` clearly
- instrumentation or manual capture for `PCR` and organizer confusion
- an experiment log entry using:
  - [EXPERIMENT_LOG_TEMPLATE.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/EXPERIMENT_LOG_TEMPLATE.md)

## Output

This test should produce:

1. one completed experiment log per phase
2. one claims-ledger update for `CL-002`
3. one product decision:
   - adopt
   - refine
   - or reject the state distinction

## Decision

This should be ChopDot's first explicit human-mechanisms experiment.

## Why

Because it is central to the product thesis and easy to over-assume without direct evidence.
