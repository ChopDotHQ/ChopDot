# Rigor And Evidence Operating Model

<discovery_plan>
- Turn rigor into an explicit operating rule for ChopDot
- Define how claims, decisions, roadmap moves, and implementation changes get admitted
- Prevent important research, lessons, and open gaps from being forgotten
</discovery_plan>

## FACTS

- ChopDot now has a large body of doctrine across:
  - product direction
  - trust and failure research
  - frontier security and reliability
  - identity, privacy, and authority
  - open-system sustainability
  - group coordination behavior
- The repo is no longer short on ideas.
- The real risk is now:
  - forgetting what has already been learned
  - making new decisions without checking prior doctrine
  - collapsing research-backed judgment into convenience or momentum

## INFERENCES

- ChopDot needs a standing rigor model, not occasional deep research.
- Every major move should now pass through:
  - evidence
  - explicit assumptions
  - gap tracking
  - verification
  - decision logging

## ASSUMPTIONS

- ChopDot wants to operate like a serious trust system, not a fast-moving prototype that relearns old mistakes.
- Not every decision needs a research paper.
- Important decisions do need explicit grounding and a visible confidence level.

## Core Rule

No meaningful product, architecture, monetization, trust, or roadmap decision should be treated as true unless it is clearly marked as one of:

- proven by direct implementation and verification
- supported by strong external evidence
- inferred from evidence with stated assumptions
- still unknown and queued for proof

## Evidence Classes

### A. Proven In Product

Use this when ChopDot itself has validated something through:

- implemented behavior
- tests
- operational use
- pilot evidence
- user validation

This is the strongest class for ChopDot-specific truth.

### B. Backed By Strong External Evidence

Use this when the claim is supported by:

- primary-source technical docs
- serious research literature
- proven protocol or software patterns
- repeated empirical evidence across systems

This is strong enough for direction-setting, but not the same as ChopDot-specific proof.

### C. Inference

Use this when the conclusion is reasonable but still depends on:

- interpretation
- analogy
- extrapolation
- partial evidence

Inference is acceptable, but it must be labeled.

### D. Unknown

Use this when ChopDot does not yet know the answer.

Unknowns are not failures.
Unlabeled unknowns are failures.

## Required Structure For Important Docs And Decisions

For any major doc, review, or decision memo, keep the structure:

- `FACTS`
- `INFERENCES`
- `ASSUMPTIONS`

Then end with:

- decision or judgment
- why
- next move

This keeps the repo honest about what is known versus what is interpreted.

## Decision Gates

### Gate 1: Product Gate

Before adopting a feature, wedge, or GTM move, ask:

1. Does this strengthen the shared commitment kernel?
2. Does this improve trust, closure, repeat usage, or operator value?
3. Is this backed by real user behavior, strong external evidence, or only intuition?
4. What would falsify this idea?

### Gate 2: Engineering Gate

Before adopting an architectural or implementation move, ask:

1. Does this preserve explicit state and authority?
2. Does this reduce hidden coupling?
3. Does this move the system toward API-ready, replaceable edges?
4. Is this enforced in the system, or only implied in the UI?
5. What invariant does this protect?

### Gate 3: Trust Gate

Before adopting a trust/security/privacy claim, ask:

1. What trust boundary is involved?
2. What failure mode does this prevent?
3. How is it verified?
4. Is it true in backend/domain logic, or only in presentation?
5. What happens when it fails?

### Gate 4: Monetization Gate

Before adopting a business-model or pricing move, ask:

1. What scarce value is being sold?
2. Is it real operator value or just access pricing?
3. Is it compatible with neutral/open trust-layer ambitions?
4. What evidence suggests people will pay?
5. Is this bridge-model revenue or terminal-model revenue?

## Gap Tracking Rule

Every important area should maintain three visible buckets:

- `Known`
- `Unknown`
- `Needs Proof`

This should apply to:

- product
- engineering
- trust/security
- GTM
- monetization
- pilot readiness
- ecosystem value

If something important is debated repeatedly, it needs to become a tracked gap rather than living in chat memory.

## Memory Rule

If a lesson changes future judgment, it must be written into one of:

- current source-of-truth docs
- decision log
- priority map
- implementation brief
- research program

If it only exists in chat, it does not count as durable ChopDot knowledge.

## Verification Rule

Important claims require a matching verification mode:

- implementation claim -> code/test verification
- UX claim -> user/session validation
- monetization claim -> willingness-to-pay evidence
- trust claim -> invariant, authority, or incident review
- ecosystem-value claim -> attributable metrics

No category should be allowed to “borrow” verification from another.

Examples:

- green tests do not prove product-market fit
- good interviews do not prove backend safety
- strong theory does not prove willingness to pay
- a clean demo does not prove reliability

## Confidence Rule

For important claims, use one of:

- high confidence
- medium confidence
- low confidence

And say why.

Confidence should come from:

- proof quality
- source quality
- recency
- directness of evidence

not from how appealing the idea sounds.

## Roadmap Admission Rule

Nothing should enter the active roadmap unless it has:

1. a clear problem statement
2. an evidence class
3. an expected business or trust impact
4. a verification method
5. a reason it belongs now rather than later

This is how ChopDot avoids:

- feature drift
- platform drift
- speculative complexity
- ungrounded monetization moves

## Research Program Rule

Research should now split into two tracks:

### Track 1: Foundational Research

- historical trust systems
- group failure modes
- game theory
- institutional design
- open-system sustainability

### Track 2: Frontier Research

- security and reliability direction
- identity/privacy/authority direction
- ecosystem funding and impact measurement
- new coordination behavior findings

Both tracks matter.
Foundational research explains durable mechanisms.
Frontier research prevents building toward dead assumptions.

## Review Rule

Every significant code review or strategy review should ask:

1. What got cleaner?
2. What got truer?
3. What remains unproven?
4. What did we accidentally encode more deeply without enough evidence?

That fourth question is mandatory.

## ChopDot Standard

ChopDot should describe itself internally as:

- research-backed where possible
- implementation-verified where necessary
- assumption-labeled where uncertain
- gap-tracked where unresolved

## Decision

Rigor should be treated as part of the product and operating system, not as optional founder hygiene.

## Why

Because ChopDot is trying to become a trusted coordination layer.
That requires:

- durable memory
- explicit uncertainty
- verifiable claims
- disciplined admission of new work

## Next Move

Use this operating model to produce and maintain:

1. `TRUST_BOUNDARY_AND_SECURITY_POLICY.md`
2. `AUTHORITY_MODEL_AND_ROLE_POLICY.md`
3. `ECOSYSTEM_IMPACT_DASHBOARD_REQUIREMENTS.md`
4. a live `known / unknown / needs proof` dashboard across product, engineering, GTM, and trust
