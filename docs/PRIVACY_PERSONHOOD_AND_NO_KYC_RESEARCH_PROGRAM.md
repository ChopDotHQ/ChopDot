# Privacy, Personhood, And No-KYC Research Program

<discovery_plan>
- Define how ChopDot should study privacy-preserving trust without defaulting to KYC
- Separate no-KYC, optional KYC, proof of personhood, and verifiable credentials
- Preserve anti-abuse and agent-readiness without invasive identity defaults
</discovery_plan>

## FACTS

- ChopDot's current posture is coordination-first and non-custodial.
- The user goal is to reduce fear of being burned, robbed, hacked, swindled, tricked, or drained in shared financial commitments.
- Stronger identity can reduce some abuse, but it can also create:
  - surveillance risk
  - exclusion risk
  - breach risk
  - false confidence
  - cultural mismatch
- Current identity standards and research point toward:
  - assurance levels
  - user-controlled wallets
  - selective disclosure
  - verifiable credentials
  - proof of personhood
  - privacy-preserving anti-Sybil mechanisms

## INFERENCES

- ChopDot should not frame the choice as:
  - no identity
  - or full KYC
- The right frame is:
  - minimum sufficient assurance for the commitment risk
- Most early ChopDot flows should rely on:
  - bounded groups
  - invitation
  - explicit roles
  - visible state
  - optional higher assurance

## ASSUMPTIONS

- This is strategic and product research, not legal advice.
- Some jurisdictions and use cases may require regulated KYC if ChopDot or partners cross certain financial-service boundaries.
- The product should avoid claiming compliance or identity assurance beyond what is actually implemented and reviewed.

## Source Ledger

Initial source set:

- [NIST SP 800-63-4 Digital Identity Guidelines](https://pages.nist.gov/800-63-4/sp800-63.html)
- [NIST SP 800-63A Identity Proofing And Enrollment](https://pages.nist.gov/800-63-4/sp800-63a.html)
- [NIST SP 800-63C Federation And Assertions](https://pages.nist.gov/800-63-4/sp800-63c.html)
- [W3C Verifiable Credentials Data Model 2.0](https://www.w3.org/TR/vc-data-model/)
- [FATF Guidance On Digital Identity](https://www.fatf-gafi.org/content/dam/fatf/documents/recommendations/Guidance-on-Digital-Identity.pdf)
- [Who Watches The Watchmen? Proof Of Personhood Review](https://www.frontiersin.org/articles/10.3389/fbloc.2020.590171/full)
- [LinkDID: Privacy-Preserving Sybil-Resistant Decentralized Identity](https://arxiv.org/abs/2307.14679)
- [Zero-Knowledge Proof-of-Identity](https://eprint.iacr.org/2019/546)
- [On Cryptographic Mechanisms For Selective Disclosure Of Verifiable Credentials](https://arxiv.org/abs/2401.08196)
- [Human Challenge Oracle](https://arxiv.org/abs/2601.03923)

## Working Definitions

## No-KYC

For ChopDot, no-KYC means:

- the product does not require government identity proofing by default
- users can coordinate through bounded group trust, invitation, role clarity, and state transparency

No-KYC does **not** mean:

- no anti-abuse
- no trust boundary
- no accountability
- no optional verification

## Optional KYC

Optional KYC means:

- some higher-risk contexts may allow or require regulated identity verification through a separate provider
- raw identity data should not become ChopDot's default data asset
- KYC should not be marketed as a universal trust solution

## Proof Of Personhood

Proof of personhood means:

- proving uniqueness or humanness in a way that reduces Sybil abuse
- ideally without revealing unnecessary personal information

Risks:

- exclusion
- coercion
- biometric misuse
- social-graph capture
- false permanence
- bot/AI adaptation

## Verifiable Credentials

Verifiable credentials mean:

- an issuer attests a claim
- a holder presents it
- a verifier checks it

Useful for:

- age
- residency
- membership
- role
- eligibility
- prior verification

Risk:

- issuer trust
- revocation
- correlation
- over-disclosure
- weak acceptance by counterparties

## Assurance Ladder

## Level 0: Local Trust / No Identity

Use for:

- low-risk informal coordination
- friend groups
- early comprehension tests

Controls:

- roles
- state truth
- history
- explicit expectations

## Level 1: Bounded Group / Invitation

Use for:

- small groups where a known organizer invites participants

Controls:

- invite links
- participant role binding
- action authority
- rate limits

## Level 2: Pseudonymous Reputation / History

Use for:

- repeat users or recurring organizers

Controls:

- local history
- completion record
- non-transferable reputation signals where appropriate

Risk:

- reputation can become exclusionary or gameable

## Level 3: Proof Of Personhood / Uniqueness

Use for:

- anti-bot or anti-Sybil-sensitive contexts

Controls:

- uniqueness proof
- minimal disclosure
- optional participation

Risk:

- false inclusion/exclusion
- coercion
- privacy leakage

## Level 4: Verifiable Credential

Use for:

- role, age, membership, residency, or eligibility proofs

Controls:

- selective disclosure
- issuer trust model
- revocation handling

## Level 5: Regulated KYC

Use only when:

- required by law
- required by a regulated partner
- required by a high-risk use case

Controls:

- external provider
- data minimization
- clear consent
- strict separation from core commitment state

## Core Product Rule

ChopDot should choose the lowest assurance level that can safely support the commitment context.

## Hard Questions For This Program

1. Which commitment types can stay Level 0 or Level 1?
2. Which abuse patterns force Level 2 or Level 3?
3. Which future partner or jurisdiction contexts force Level 4 or Level 5?
4. Can proof of personhood reduce bots without excluding legitimate users?
5. Can agents participate as agents without pretending to be humans?
6. What identity facts should ChopDot never store directly?
7. What proof language would mislead users?
8. How does cultural setting change acceptable verification?

## Anti-Abuse Without KYC

Early controls to study before stronger identity:

- bounded group creation
- organizer rate limits
- invitation accountability
- explicit roles
- action history
- friction on repeated failures
- manual review for suspicious high-risk patterns
- no custody or silent fund movement

## Trusted Agents

Agents should be treated as a separate actor class, not fake humans.

Agent participation should require:

- explicit label
- scoped authority
- human approval for value-affecting action
- logged action preparation
- no silent confirmation or release

## Research Outputs Required

This program should produce:

1. `ASSURANCE_LEVEL_POLICY.md`
2. `NO_KYC_ABUSE_MODEL.md`
3. `OPTIONAL_PERSONHOOD_AND_CREDENTIALS_MAP.md`
4. `TRUSTED_AGENT_AUTHORITY_POLICY.md`
5. pilot interview questions about identity comfort, privacy, and abuse fear

## Decision

ChopDot should not default to KYC.
It should default to minimum sufficient assurance, with optional higher-assurance paths where risk, law, or partner requirements justify them.

## Why

Because a trust product that solves financial fear by creating a larger identity, surveillance, or exclusion problem is not actually solving trust.

## Next Move

Start with:

1. `ASSURANCE_LEVEL_POLICY.md`
2. `NO_KYC_ABUSE_MODEL.md`

Then test the assumptions through user interviews and adversarial misuse review.
