# No-KYC Abuse Model

<discovery_plan>
- Identify what can go wrong if ChopDot avoids mandatory KYC
- Define non-KYC mitigations before escalating to personhood, credentials, or KYC
- Preserve privacy without letting abuse hide behind it
</discovery_plan>

## FACTS

- No-KYC product design reduces identity-data risk, but it does not remove abuse risk.
- Strong KYC can reduce some fraud vectors, but it can also create breach, exclusion, surveillance, and false-confidence risk.
- ChopDot is currently non-custodial and coordination-first, which lowers but does not eliminate financial harm.

## INFERENCES

- The core question is not whether to use KYC.
- The core question is which abuse patterns require which minimum controls.

## ASSUMPTIONS

- Early ChopDot should avoid custody and regulated-money movement.
- Abuse controls should start with product mechanics, authority, visibility, and bounded groups before identity escalation.

## Abuse Classes

## 1. Fake Participant Abuse

Pattern:

- a user creates fake participants to manipulate perceived group readiness

Risk:

- organizer believes a commitment is stronger than it is
- participants trust false social proof

Non-KYC controls:

- invite limits
- visible invitation source
- joined vs committed distinction
- commitment confirmation
- rate limits
- organizer-visible suspicious duplication signals

Escalate if:

- incentives make fake participants profitable
- public campaigns or rewards are introduced

## 2. Fake Payment / Fake Confirmation Abuse

Pattern:

- a participant marks payment as made or confirmed without authority or proof

Risk:

- false closure
- wrong settlement state
- social conflict

Non-KYC controls:

- backend authority enforcement
- payer-only mark-paid
- recipient-only confirm
- typed history
- optional payment reference with careful privacy boundaries

Escalate if:

- external settlement rails are integrated
- payment verification becomes automated

## 3. Malicious Organizer Abuse

Pattern:

- organizer creates misleading commitments, changes expectations, or pressures participants

Risk:

- social coercion
- unfair loss
- scam group creation

Non-KYC controls:

- immutable or versioned commitment terms
- visible policy changes
- participant confirmation after material changes
- organizer reputation scoped to completed flows
- report/review path

Escalate if:

- organizer reaches high scale
- repeated reports appear
- money routing becomes integrated

## 4. Link And Invite Abuse

Pattern:

- invite links are shared, intercepted, or used outside intended context

Risk:

- wrong participant joins
- private group state leaks

Non-KYC controls:

- expiring invites
- participant binding
- organizer approval for unknown joins
- limited pre-join visibility

Escalate if:

- groups involve high-value commitments
- public discovery is introduced

## 5. Reputation Gaming

Pattern:

- users build artificial completion history or collude to inflate trust

Risk:

- false confidence
- future scams

Non-KYC controls:

- local scoped reputation
- weight reputation by real completed commitment context
- mark self-contained/collusive loops carefully
- do not overstate reputation

Escalate if:

- reputation becomes a primary gating or monetized surface

## 6. Privacy Shielding Fraud

Pattern:

- users exploit privacy language or private state to hide abuse

Risk:

- fraud becomes harder to challenge
- victims lack evidence

Non-KYC controls:

- role-scoped visibility
- minimum shared evidence for disputed state
- audit export for participants
- no irreversible hidden actions

Escalate if:

- privacy-preserving proofs hide too much for real dispute resolution

## 7. Agent Misuse

Pattern:

- an agent prepares, approves, or confirms unsafe actions

Risk:

- delegated authority abuse
- tricked confirmations
- automated social engineering

Non-KYC controls:

- explicit agent label
- no silent value-affecting action
- scoped approval
- human confirmation
- audit log

Escalate if:

- agents gain write authority or external rail access

## 8. Cultural Misfit Abuse

Pattern:

- a mechanism that feels fair in one setting is coercive or harmful in another

Risk:

- social harm
- exclusion
- loss of trust

Non-KYC controls:

- local policy presets
- pilot interviews
- explicit cultural assumptions
- avoid universal defaults for shame, penalty, or visibility

Escalate if:

- local partners identify high-risk mismatch

## No-KYC Control Ladder

Use controls in this order:

1. state clarity
2. role and authority enforcement
3. bounded invitations
4. rate limits and friction
5. scoped reputation/history
6. optional proof of personhood
7. optional verifiable credentials
8. regulated KYC only where required

## Must-Not Claims

No-KYC ChopDot must not imply:

- all participants are real humans
- all participants are trustworthy
- all commitments are safe
- all payments are verified
- all scams are prevented

It can claim only the controls actually implemented.

## Evidence To Collect

For each abuse class, track:

- observed attempt
- near miss
- blocked attempt
- user confusion
- manual rescue
- harm potential
- control that worked or failed

## Decision

No-KYC is viable only if ChopDot treats abuse modeling as a first-class product discipline.

## Why

Because privacy-preserving trust fails if privacy becomes a cover for fake participation, false confirmation, coercion, or scams.

## Next Move

Use this model to create:

1. misuse test cases for the kernel
2. interview questions about identity comfort and abuse fear
3. a future trusted-agent authority policy
