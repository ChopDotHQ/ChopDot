# Assurance Level Policy

<discovery_plan>
- Define how much identity or verification ChopDot needs by risk level
- Avoid mandatory KYC as the default
- Preserve optional higher assurance for contexts that require it
</discovery_plan>

## FACTS

- NIST SP 800-63-4 separates identity proofing, authentication, and federation assurance instead of treating identity as one binary property.
- W3C verifiable credentials support issuer-holder-verifier patterns and can support selective disclosure depending on credential format and cryptographic method.
- FATF digital identity guidance treats digital ID as a risk-based tool for regulated financial contexts, not as a universal requirement for every coordination interaction.
- ChopDot's current product is coordination-first and non-custodial.

## INFERENCES

- ChopDot should not require KYC for all use.
- ChopDot should classify assurance by commitment risk.
- The system should be able to support higher-assurance proofs later without making them the default product truth.

## ASSUMPTIONS

- This is product policy, not legal advice.
- Regulated financial services or partner integrations may impose stronger requirements later.
- The early product should minimize identity data collection.

## Core Rule

Use the lowest assurance level that safely supports the commitment context.

## Assurance Levels

## `A0`: Local / Unverified

Use when:

- participants already know each other
- money movement is manual/off-platform
- risk is low

Controls:

- explicit state
- roles
- history
- confirmation
- no custody claim

Do not claim:

- verified identity
- verified personhood
- payment finality

## `A1`: Bounded Invitation

Use when:

- an organizer invites known participants
- group membership itself creates basic accountability

Controls:

- invite binding
- role binding
- action authority
- rate limits
- visible obligations

Risk:

- invite links can be shared
- social familiarity can be faked

## `A2`: Local Reputation / Completion History

Use when:

- repeat organizers or participants need credibility signals

Controls:

- completion history
- failed-action history
- organizer reliability signals
- local reputation scoped to ChopDot context

Risk:

- reputation can be gamed
- reputation can create exclusion or false confidence

## `A3`: Optional Personhood / Anti-Sybil

Use when:

- bot resistance matters
- incentives are present
- group scale increases
- uniqueness matters more than legal identity

Controls:

- proof of uniqueness or personhood
- minimal disclosure
- clear caveats

Risk:

- exclusion
- coercion
- biometric or social-graph abuse
- false permanence

## `A4`: Optional Verifiable Credential

Use when:

- a specific attribute matters
- a partner or community needs an eligibility proof

Examples:

- membership
- age
- location
- role
- organization affiliation

Controls:

- selective disclosure where possible
- issuer trust model
- revocation handling
- no unnecessary raw document storage

Risk:

- issuer quality
- revocation gaps
- correlation across contexts

## `A5`: Regulated KYC

Use only when:

- legally required
- required by regulated partner flow
- risk level clearly justifies it

Controls:

- external specialist provider
- data minimization
- clear consent
- separation from core commitment state
- jurisdiction-specific review

Risk:

- breach exposure
- exclusion
- surveillance
- operational liability

## Assurance Selection Questions

Before choosing a level, ask:

1. Is ChopDot moving money or only coordinating?
2. Are participants known to one another?
3. Is there a financial incentive to create fake participants?
4. Is there a legal/regulatory trigger?
5. Would stronger identity reduce abuse, or only create false comfort?
6. What data would be exposed if this assurance path fails?
7. Can a lower-assurance control solve the problem?

## Upgrade Rule

Move to a higher assurance level only when:

- a specific abuse or risk requires it
- the higher level reduces that risk
- the privacy and exclusion cost is acceptable
- the claim is recorded in the evidence ledger

## Downgrade Rule

Move to a lower assurance level when:

- the risk can be handled by bounded groups, roles, history, and state truth
- higher identity creates more harm than protection
- users reject or distrust the verification method

## Agent Rule

Agents do not fit normal personhood levels.

Agents should be classified by:

- explicit agent identity
- scope of authority
- human approval requirement
- action log

Do not let an agent appear as a normal participant unless it is explicitly acting for a human with visible delegation.

## Product Copy Rule

Never say:

- verified
- safe
- trusted
- protected
- personhood
- KYC-free

unless the actual assurance level supports the claim and the limitations are clear.

## Decision

ChopDot should use assurance levels instead of a universal identity policy.

## Why

Because different commitment contexts need different proof, and excessive identity can be as harmful as weak identity.

## Next Move

Use this policy with:

- [NO_KYC_ABUSE_MODEL.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/NO_KYC_ABUSE_MODEL.md)
- [AUTHORITY_MODEL_AND_ROLE_POLICY.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/AUTHORITY_MODEL_AND_ROLE_POLICY.md)
