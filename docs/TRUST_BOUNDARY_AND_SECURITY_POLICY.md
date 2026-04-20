# Trust Boundary And Security Policy

<discovery_plan>
- Define ChopDot's actual trust boundaries
- Turn security doctrine into explicit product and engineering policy
- Prevent trust claims from outrunning system reality
</discovery_plan>

## FACTS

- ChopDot is building a shared commitment system, not a custodial bank, wallet, or settlement network.
- Current doctrine already says the product must be:
  - honest about state
  - explicit about authority
  - careful about replay, closure, and history
- Current implementation review on `mvp` still shows active trust-boundary risks:
  - backend authority enforcement is incomplete
  - chapter identity is still not fully modeled
  - offline replay can still duplicate a write

## INFERENCES

- ChopDot needs a trust policy that says what the product is responsible for, what it is not responsible for, and what must be true before stronger claims are allowed.
- Without this, security review stays generic and UI language can drift into overclaiming.

## ASSUMPTIONS

- Current product scope remains coordination-first and non-custodial.
- Future proof, rail, and wallet integrations may enrich trust, but they do not redefine the kernel.

## Core Trust Boundary

ChopDot's current trust boundary is:

- commitment state
- participant and role state
- chapter / closeout state
- typed event history
- action authority
- visibility of blockers, next actions, and closure

ChopDot is currently **not** the trust boundary for:

- underlying bank or wallet settlement finality
- external processor uptime
- chain consensus
- off-platform identity truth

## Product Security Claims Policy

ChopDot may currently claim:

- clear commitment state
- clear role and action responsibilities
- visible distinction between `pending`, `paid`, `confirmed`, and `closed`
- durable history where implemented
- coordination and operator-risk reduction where proven

ChopDot may **not** currently claim:

- custody
- guaranteed payment execution
- cryptographic proof where none exists
- independent verification of off-platform payment truth unless explicitly integrated
- perfect uptime
- hackproof behavior

## Trust Boundary Layers

## 1. Presentation Layer

Risk:

- misleading state
- misleading proof language
- unclear next actions
- false closure cues

Policy:

- UI must never imply a stronger guarantee than the backend/domain actually enforces
- state labels must map directly to persisted semantics
- any uncertain or self-reported state must be visibly marked as such

## 2. Domain And Action Layer

Risk:

- hidden authority rules
- invalid state transitions
- conflating `paid`, `confirmed`, and `closed`
- pot-wide shortcuts that erase chapter semantics

Policy:

- all trust-critical actions must be explicit domain actions
- action preconditions must be enforced in backend/domain logic
- chapter identity must be distinct from pot identity where closure depends on it
- idempotency and replay safety are required for trust-critical writes

## 3. Persistence Layer

Risk:

- duplicate writes
- split sources of truth
- stale recovery
- history corruption

Policy:

- one authoritative path per trust-critical write
- event/history writes must be append-safe and explainable
- replay behavior must be deterministic and auditable
- migrations must preserve trust semantics, not only data shape

## 4. Operator Layer

Risk:

- hidden manual rescue
- ad hoc overrides
- unclear incident handling
- private knowledge required to keep the system safe

Policy:

- operator rescue must be classified, visible, and minimized
- manual intervention is a risk signal, not an invisible normal mode
- incident handling should preserve history and explainability

## 5. External Dependency Layer

Risk:

- DNS compromise
- frontend compromise
- RPC/API dependency failure
- payment-provider misreporting
- third-party auth/session drift

Policy:

- external dependencies must be treated as part of the trust surface
- ChopDot should prefer replaceable edges and explicit failure handling
- third-party truth must not silently override kernel truth

## Immediate Security Invariants

The current system should not be considered trustworthy enough until these are true:

1. only the correct actor can mark a leg paid
2. only the correct counterparty can confirm receipt
3. chapter closure is chapter-scoped, not pot-scoped
4. replay cannot silently duplicate chapter creation
5. UI state cannot imply closure before backend truth permits it
6. `paid`, `confirmed`, and `closed` remain distinct in storage and UI

## Visibility And Disclosure Rule

Only reveal what each role needs to:

- understand current state
- understand next action
- understand closure status

Do not normalize broader visibility of:

- sensitive references
- payment identifiers
- bank or wallet details
- future proof artifacts

unless explicitly required and justified.

## Incident Classification

Every meaningful failure should eventually classify as one of:

- authority failure
- state-transition failure
- replay/idempotency failure
- visibility/disclosure failure
- misleading UI failure
- operator rescue failure
- external dependency failure

## Security Evidence Rule

A security claim is only acceptable when it has one of:

- backend/domain enforcement
- invariant tests
- operational evidence
- explicit dependency limitation language

Good intentions and UI hints do not count.

## Decision

ChopDot should treat security as protection of the full trust boundary, not only bug prevention.

## Why

Because the product fails when state, authority, replay, or closure semantics fail, even if no chain or contract exploit exists.

## Next Move

Use this policy to:

1. tighten Teddy branch review criteria
2. produce an incident model and reliability targets
3. review UI copy for overclaiming
