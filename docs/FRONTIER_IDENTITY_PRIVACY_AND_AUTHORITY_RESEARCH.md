# Frontier Identity, Privacy, And Authority Research

<discovery_plan>
- Capture where identity, privacy, and execution authority are heading
- Focus on current primary-source signals from Ethereum and Polkadot
- Translate those directions into ChopDot's future architecture and product posture
</discovery_plan>

## FACTS

- Ethereum's current UX and protocol priorities focus heavily on:
  - native account abstraction
  - interoperability
  - source: [Protocol priorities 2026](https://blog.ethereum.org/2026/02/18/protocol-priorities-update-2026)
- Ethereum's end-state direction is described as:
  - smart contract wallets as the default
  - less dependence on bundlers, relayers, and extra gas overhead
  - account abstraction intersecting with post-quantum readiness
  - source: [Protocol priorities 2026](https://blog.ethereum.org/2026/02/18/protocol-priorities-update-2026)
- Ethereum Interoperability Layer (EIL) frames the future UX as:
  - wallet-centric multichain UX
  - trust-minimized execution
  - privacy from relayers/solvers
  - logic moved onchain and into the wallet
  - sources:
    - [EIL](https://blog.ethereum.org/en/2025/11/18/eil)
    - [Protocol Update 003](https://blog.ethereum.org/2025/08/29/protocol-update-003)
- Ethereum Foundation public direction also states that privacy cannot remain abstract research if Ethereum is to support civilizational infrastructure:
  - source: [Privacy cluster announcement](https://blog.ethereum.org/2025/10/01/privacy-cluster-leads)
- Polkadot's People Chain provides:
  - verifiable on-chain identity
  - controlled disclosure
  - registrars and judgments
  - linked accounts under a unified identity
  - source: [People Chain docs](https://docs.polkadot.com/reference/polkadot-hub/people-and-identity/)
- Polkadot's Collectives Chain provides:
  - a dedicated governance/body coordination surface
  - source: [Collectives Chain docs](https://docs.polkadot.com/reference/polkadot-hub/collectives-and-daos/)

## INFERENCES

- The future trust boundary is increasingly wallet- and account-centric, not app-login-centric.
- Identity is moving toward:
  - selective disclosure
  - bounded verification
  - portable authority
- Privacy is moving toward:
  - a real execution-layer requirement
  - not only transport or message secrecy
- Authority is moving toward:
  - explicit programmable accounts
  - more legible role and permission surfaces

## ASSUMPTIONS

- ChopDot does not need to become a wallet product.
- ChopDot does need to become compatible with wallet-centric trust boundaries and stronger identity/authority models over time.
- The immediate implementation slice remains off-chain coordination first.

## Latest Direction Of Travel

## 1. Wallets Are Becoming The Trust Boundary

The frontier is moving toward:

- wallet-native execution
- wallet-native abstraction
- fewer external intermediaries

### ChopDot implication

ChopDot should think of wallets less as:

- auth plugins

and more as:

- future execution and authority surfaces

That means future ChopDot architecture should remain compatible with:

- user-controlled execution
- portable account logic
- cross-surface identity and permission mapping

## 2. Identity Is Moving Toward Selective Disclosure

People Chain explicitly supports user-controlled disclosure and multiple confidence levels of verification.

### ChopDot implication

ChopDot should not think about identity as a binary:

- anonymous
- fully verified

Instead it should eventually support:

- low-friction social identity
- bounded verified roles
- optional higher-confidence attestations
- portable group/organizer identity

This is especially important for:

- organizers
- registrars
- treasurers
- provider-side workflows

## 3. Authority Needs To Be Explicit And Portable

Both Ethereum AA direction and Polkadot identity/governance rails imply a future where authority is:

- more programmable
- more inspectable
- less tied to naive session state

### ChopDot implication

ChopDot should keep pushing toward:

- role-explicit actions
- policy-explicit release rules
- authority enforced in domain logic, not just UI
- future compatibility with account or group-level delegated authority

## 4. Privacy Is Becoming Product-Critical

The frontier trend is not “everything private by default.”
It is:

- reduce unnecessary revelation
- keep trust assumptions minimal
- preserve user control over disclosure

### ChopDot implication

ChopDot should design for:

- visibility as policy
- local norms around public/private obligation
- selective disclosure of sensitive fields later
- keeping public proof optional and secondary to kernel truth

## 5. Interoperability Is Becoming A UX Problem, Not Just A Bridge Problem

EIL and adjacent work show a shift from chain-fragmentation handling toward coherent wallet-native execution across systems.

### ChopDot implication

ChopDot's future should not be:

- one chain integration at a time with chain-first product logic

It should be:

- one commitment kernel
- multiple possible execution or proof surfaces
- minimal trust assumptions across those surfaces

## What This Means For ChopDot

## Now

ChopDot should:

- keep identity lightweight
- keep authority explicit in backend/domain actions
- avoid baking vendor/session assumptions into product truth
- treat privacy and visibility as future policy surfaces, not afterthoughts

## Soon

ChopDot should prepare for:

- role attestations
- selective disclosure policies
- group authority models
- wallet-aware execution boundaries

## Later

ChopDot may benefit from:

- People Chain-style role/identity adapters
- group and committee authority integrations
- privacy-preserving proofs or attestations
- wallet-driven trusted execution patterns

## Design Rules From This Frontier

1. never let auth/session become product truth
2. keep role and authority explicit
3. design visibility as a policy choice
4. keep kernel logic execution-surface agnostic
5. plan for portable trust signals, not one-off logins

## Decision

ChopDot should design toward wallet-centric trust, selective disclosure, and explicit authority without forcing those abstractions into the product too early.

## Why

That is where identity, privacy, and execution authority are clearly heading.

## Next Move

Turn this memo into:

1. `AUTHORITY_MODEL_AND_ROLE_POLICY.md`
2. `VISIBILITY_AND_DISCLOSURE_POLICY.md`
3. `IDENTITY_AND_ATTESTATION_ADAPTER_MAP.md`
