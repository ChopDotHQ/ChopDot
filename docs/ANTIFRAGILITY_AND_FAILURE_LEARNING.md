# Antifragility And Failure Learning

<discovery_plan>
- Convert the extracted “Phoenix Effect” conversation into doctrine
- Define the failure classes ChopDot should learn from
- Keep the framing product-specific instead of theatrical
</discovery_plan>

## FACTS

- ChopDot is exposed to recurring coordination failures, not just software failures.
- These failures include:
  - fronting
  - ghosting
  - dropout
  - release ambiguity
  - local norm mismatch
  - hidden ops rescue

## INFERENCES

- ChopDot should not describe resilience as “we survive a catastrophic hack.”
- ChopDot should describe antifragility as:
  - every real coordination failure makes the system sharper and harder to break next time

## ASSUMPTIONS

- This doctrine is for product design and founder narrative, not just marketing copy.

## Core Sentence

ChopDot should become stronger through repeated exposure to messy shared-commitment failures.

## Failure Classes

### 1. Fronting Failure

Pattern:
- the group says yes
- one organizer fronts the money
- others delay or drop

What ChopDot should learn:
- soft commitment is not commitment
- organizer exposure must be visible
- commitments should be secured before fronting when possible

Doctrine objects:
- Organizer Risk Exposure
- commit-before-fronting defaults

### 2. Ghosting Failure

Pattern:
- users join
- users do not act
- the group assumes readiness that does not exist

What ChopDot should learn:
- joined is not committed
- reminder timing matters
- status language must not create false confidence

Doctrine objects:
- Participation Commitment Ratio
- explicit participation states

### 3. Reassignment Failure

Pattern:
- someone cannot participate
- the group cannot cleanly transfer a spot, recover funds, or replace them

What ChopDot should learn:
- sometimes the scarce thing is a right, not money
- transferability needs policy
- reassignment and waitlists must be designed, not improvised

Doctrine objects:
- CommitmentUnit / TransferableRight
- reassignment workflows

### 4. Release Failure

Pattern:
- something looks ready to move
- approvals are incomplete or rules are unclear
- execution fails halfway

What ChopDot should learn:
- ready must be formal, not vibes
- release needs explicit state transitions
- failed execution needs recovery states

Doctrine objects:
- readiness logic
- execution attempt tracking

### 5. Local Norm Failure

Pattern:
- a flow that feels fair in one market feels wrong or humiliating in another

What ChopDot should learn:
- trust grammar can be universal
- trust UX cannot be culturally flat
- visibility / privacy is policy, not decoration

Doctrine objects:
- local-fit visibility rules
- localized onboarding assumptions

### 6. Ops Failure

Pattern:
- the product only works because a human fixes edge cases behind the curtain

What ChopDot should learn:
- recovery must be formalized
- manual intervention must be measured
- replayable history matters

Doctrine objects:
- Recovery Burden
- failure and recovery doctrine

## Practical rule

After each meaningful pilot failure, ask:

1. Which failure class was this?
2. Was the failure social, policy, execution, or visibility?
3. Which metric should have exposed it earlier?
4. Which state / role / policy rule was missing?

## Why this matters

This helps ChopDot become:
- less naive
- more honest
- more measurable
- more fundable

## Next move

- Use this as a founder and product review lens during pilots.
- Do not add new complexity unless it clearly reduces one of these failure classes.
