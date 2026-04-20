# Scientific Validation Framework

<discovery_plan>
- Test whether ChopDot can operate under a scientific, falsifiable validation standard
- Define how claims become hypotheses, experiments, results, and decisions
- Prevent product and research doctrine from drifting into non-falsifiable belief
</discovery_plan>

## FACTS

- ChopDot now has:
  - a rigor model
  - a proof standards audit
  - a claims and evidence ledger
  - validation doctrine
- ChopDot does not yet have a full scientific-validation workflow that turns product and strategy claims into falsifiable experiments.
- The biggest current risk is not lack of ideas.
- It is keeping too many important claims at the level of plausible doctrine instead of testable hypotheses.

## INFERENCES

- If ChopDot wants to withstand scientific rigor, it needs:
  - explicit hypotheses
  - measurable outcomes
  - disconfirming conditions
  - logged results
  - claim updates after evidence arrives

## ASSUMPTIONS

- Not every ChopDot question is best answered by a randomized controlled trial.
- Some questions are engineering invariant questions.
- Some are behavioral questions.
- Some are market questions.
- All of them still need falsifiable structure.

## Core Rule

No major ChopDot claim should remain in active roadmap use unless it can be expressed as one of:

- a falsifiable implementation hypothesis
- a falsifiable behavioral hypothesis
- a falsifiable market hypothesis
- a clearly bounded future-watch assumption

## Four Validation Classes

## 1. Implementation Validation

Use when the claim is about:

- correctness
- reliability
- authority
- replay safety
- state truth

Evidence modes:

- invariant tests
- integration tests
- failure injection
- persistence/recovery testing
- manual operator walkthroughs

Example:

- hypothesis: chapter closure will never occur before all chapter legs are confirmed

## 2. Behavioral Validation

Use when the claim is about:

- participant behavior
- organizer behavior
- commitment conversion
- dropout
- fairness perception
- reminder effects

Evidence modes:

- structured interviews
- prototype walkthroughs
- pilot observation
- policy A/B or sequential tests
- behavior logs

Example:

- hypothesis: explicit `committed` state reduces organizer ambiguity versus `joined` alone

## 3. Market Validation

Use when the claim is about:

- willingness to pay
- ICP selection
- wedge clarity
- repeat usage
- partner interest

Evidence modes:

- pricing interviews
- pilot conversion
- repeat-use observation
- design-partner commitments

Example:

- hypothesis: organizers will pay for lower organizer-risk exposure and cleaner closeout

## 4. Future-Watch Validation

Use when the claim is about:

- likely technology direction
- likely ecosystem direction
- identity/privacy trends
- open-system sustainability trends

Evidence modes:

- primary-source tracking
- architecture scenario review
- deferred-adapter planning

Example:

- hypothesis: explicit role/authority modeling now will reduce future wallet-centric migration cost

This class does not prove the future.
It only prevents blind architectural drift.

## Hypothesis Template

Every important hypothesis should be written as:

1. `Claim`
2. `Why we believe it`
3. `Evidence class today`
4. `What would support it`
5. `What would weaken or falsify it`
6. `How we will test it`
7. `Decision threshold`
8. `What changes if it fails`

## Disconfirmation Rule

ChopDot must log not only supporting evidence, but also:

- weak signals
- contradictions
- null results
- failures
- cases where a hypothesis looked elegant but did not improve behavior

If negative evidence is not logged, ChopDot is not actually operating scientifically.

## Claim Promotion Rule

A claim can only be promoted upward when:

- the experiment or validation method is complete
- results are recorded
- confidence is updated
- the claims ledger is updated
- the roadmap or doctrine is revised if needed

No claim should graduate based on enthusiasm alone.

## Claim Demotion Rule

A claim must be downgraded when:

- results are mixed
- the evidence is weak or indirect
- implementation contradicts the theory
- users do not behave as expected
- market evidence is weaker than the narrative

## Decision Thresholds

## Strong enough for implementation

Requires one of:

- strong external evidence plus low implementation cost
- or a high-value hypothesis with clear rollback cost and measurable test conditions

## Strong enough for roadmap priority

Requires:

- evidence class `A`, or
- strong `B` plus a concrete near-term proof plan

## Strong enough for external claim

Requires:

- direct ChopDot evidence
- confidence level
- caveats if the evidence is still early

## Scientific Questions ChopDot Must Answer

## Product

- does explicit commitment state improve follow-through?
- does chapter/closeout structure reduce ambiguity?
- do deposits or penalties help, hurt, or do nothing in ChopDot's contexts?
- do visible norms and thresholds improve cooperation?

## Engineering

- does the kernel preserve state truth under refresh, replay, and failure?
- do authority rules hold under adversarial or messy flows?
- does instrumentation measure the real state rather than UI theater?

## Market

- who feels the pain sharply enough to adopt?
- who will pay?
- what does repeat usage actually come from?

## Future

- which frontier developments are relevant enough to prepare for now?
- which ones should remain deferred without architectural debt?

## Evidence Logging Rule

Every completed experiment or validation activity should log:

- date
- claim id
- method
- sample/context
- result
- interpretation
- confidence update
- follow-up action

If this is not logged, the evidence is too easy to misremember.

## What “Withstand Scientific Process” Means For ChopDot

It does **not** mean:

- every decision becomes academic
- every question needs a paper
- every product choice needs RCT-level proof

It **does** mean:

- important claims are falsifiable
- evidence is typed and logged
- negative results are retained
- claims change when evidence changes
- product, engineering, and market questions are not blurred together

## Decision

ChopDot can withstand a scientific process only if it adopts falsifiability, evidence logging, and claim revision as normal operating behavior.

## Why

Because otherwise the repo will still accumulate elegant doctrine without enough disconfirming pressure.

## Next Move

Use this framework to produce:

1. `HUMAN_MECHANISMS_EXPERIMENT_PROGRAM.md`
2. `FUTURE_DEVELOPMENT_STRESS_TEST_MATRIX.md`
3. a reusable experiment log template tied to the claims ledger
