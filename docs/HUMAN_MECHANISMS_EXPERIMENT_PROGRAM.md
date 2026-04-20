# Human Mechanisms Experiment Program

<discovery_plan>
- Turn ChopDot's behavioral doctrine into testable human-mechanism experiments
- Focus on commitment, ambiguity, trust, dropout, and organizer burden
- Make the output useful for pilots and product decisions rather than academic observation alone
</discovery_plan>

## FACTS

- ChopDot's strongest research foundation is on human coordination mechanisms.
- The current repo already claims several behavior-related truths, including:
  - `joined` is not the same as `committed`
  - penalties do not automatically create trust
  - visible norms and explicit expectations matter
  - organizer burden is a core failure surface
- Those claims are externally backed, but not yet well proven inside ChopDot itself.

## INFERENCES

- ChopDot now needs deliberate behavioral experiments, not just interviews and intuition.
- The goal is to learn which mechanisms actually improve behavior in ChopDot's contexts.

## ASSUMPTIONS

- Early experiments will be small and messy.
- Sequential testing and structured observation are acceptable if the method is explicit.
- The purpose is product truth, not publishable social science.

## Core Rule

Every human-mechanism feature should be treated as a hypothesis about behavior, not as an automatic solution.

## Priority Mechanisms To Test

## 1. Joined vs Committed

Claim:

- explicit commitment state is behaviorally more truthful than simple membership/join state

Hypothesis:

- groups with explicit `committed` confirmation will show better follow-through and lower organizer confusion than groups using `joined` alone

Signals:

- commitment conversion rate
- organizer confusion rate
- no-show / dropout rate
- participant understanding of obligation

Failure condition:

- users do not understand or value the distinction
- added friction lowers useful participation without improving follow-through

## 2. Explicit Expectations Before Execution

Claim:

- ex-ante clarity improves cooperation

Hypothesis:

- groups shown explicit thresholds, fallback rules, and what-happens-if-you-fail language will have fewer disputes and cleaner closeout than groups with vaguer setup language

Signals:

- misunderstanding rate
- dispute rate
- reminder burden
- time-to-close

Failure condition:

- users ignore the rules
- clarity does not change behavior or reduces adoption without improving outcomes

## 3. Deposits Or Penalties As Credibility Tools

Claim:

- deposits or penalties may help only when they are seen as credible and fair

Hypothesis:

- small, clearly framed commitment stakes may improve follow-through in some cohorts, but only when users perceive them as legitimate and understandable

Signals:

- commitment completion rate
- perceived fairness
- dropout rate
- willingness to join

Failure condition:

- participants resent the mechanism
- conversion drops without completion improvement
- trust declines rather than increases

## 4. Reconfirmation / Renewal

Claim:

- some longer-running commitments need reaffirmation rather than one-time consent

Hypothesis:

- for commitments with long gaps or recurring coordination, periodic reconfirmation will improve readiness truth and reduce silent drift

Signals:

- stale commitment rate
- last-minute failure rate
- organizer chasing burden
- reconfirmation completion rate

Failure condition:

- reconfirmation is mostly noise
- it adds friction without improving actual follow-through

## 5. Visible Norms And Thresholds

Claim:

- visible shared norms improve conditional cooperation

Hypothesis:

- participants shown clear group thresholds and shared progress cues will coordinate more reliably than participants left to infer group readiness

Signals:

- contribution pacing
- readiness accuracy
- confidence calibration
- organizer burden

Failure condition:

- norms are ignored
- visibility increases pressure without improving action

## 6. Reassignment And Recovery Rules

Claim:

- fair replacement/reassignment logic can preserve trust better than harsher punishment

Hypothesis:

- groups with visible fallback and reassignment policies will recover better from dropout than groups relying only on penalties or organizer improvisation

Signals:

- recovery rate
- time-to-recovery
- perceived fairness
- organizer rescue burden

Failure condition:

- policies are too complex
- recovery does not materially improve

## Experiment Design Standards

Each experiment should specify:

- target cohort
- commitment type
- mechanism under test
- baseline condition
- intervention condition
- duration
- sample size target
- primary metric
- secondary metrics
- stopping condition

## Minimum Metrics

Use these where relevant:

- `PCR`
- `ORE`
- `RB`
- time-to-close
- organizer confusion count
- dispute count
- dropout rate
- reassignment success rate
- perceived fairness

## Qualitative Capture

For each experiment, collect:

- what participants thought they had agreed to
- what organizers thought participants had agreed to
- where those diverged
- what felt fair
- what felt coercive
- what felt credible

## Bad Experiment Patterns

Avoid:

- changing multiple trust mechanisms at once
- only measuring clicks instead of outcomes
- calling user preference “success” if follow-through worsens
- keeping null results out of the record

## First Experiment Sequence

Run in this order:

1. joined vs committed clarity
2. explicit expectations and fallback language
3. reconfirmation for longer-gap commitments
4. deposits/penalties only after the first three are understood
5. reassignment and recovery policy testing

## Decision

ChopDot should test human mechanisms as falsifiable product interventions, not as assumed wisdom imported from research.

## Why

Because the real question is not whether these mechanisms exist in theory, but whether they improve follow-through and trust in ChopDot's actual settings.

## Next Move

Create:

1. an experiment log template
2. a first test plan for `joined vs committed`
3. a field interview addendum tied to these mechanisms
