# Research And Proof Standards Audit

<discovery_plan>
- Audit whether ChopDot's current research corpus actually meets the repo's rigor standard
- Distinguish externally backed doctrine from ChopDot-specific proof
- Identify whether the repo can safely admit new claims without lowering rigor
</discovery_plan>

## FACTS

- ChopDot now has explicit rigor rules in:
  - [RIGOR_AND_EVIDENCE_OPERATING_MODEL.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/RIGOR_AND_EVIDENCE_OPERATING_MODEL.md)
- The current research and doctrine corpus includes:
  - historical trust/failure research
  - group commitment research
  - long-term trust-layer economics
  - protocol durability and organic growth research
  - frontier security and reliability research
  - frontier identity, privacy, and authority research
  - frontier open-system sustainability research
  - frontier group coordination behavior research
- ChopDot also has an implementation-validation document:
  - [FOUNDER_VALIDATION_PLAN.md](/Users/devinsonpena/ChopDot/.worktrees/docs-shared-commitment-kernel/docs/FOUNDER_VALIDATION_PLAN.md)
- Teddy's current `mvp` branch is not yet semantically clean enough to count as strong product proof because:
  - authority enforcement is still weak in the backend
  - chapter identity is still pot-wide rather than real chapter identity
  - offline replay/idempotency still has a duplication risk
  - currency truth is still not clean in one UI path

## INFERENCES

- The corpus is strong enough for doctrine and direction.
- It is not yet strong enough to claim that ChopDot has proven it meets the full standard.
- The repo can now describe the standard clearly, but it is only partially equipped to enforce it operationally.

## ASSUMPTIONS

- This audit is about whether the existing work meets the stated rigor bar, not about whether the ideas are promising.
- The relevant standard is:
  - evidence classes
  - explicit assumptions
  - gap tracking
  - matched verification
  - roadmap admission discipline

## Audit Result

## 1. Does The Research Meet The Standard?

### Short answer

Partially.

The research corpus is:

- **strong on external grounding**
- **medium on disciplined inference**
- **weak on ChopDot-specific proof**

### What is actually strong

The following are mostly in evidence class `B`:

- historical trust-system patterns
- social-enforcement and savings-group mechanisms
- protocol/open-system sustainability mechanisms
- frontier signals on security, identity, privacy, and open-system funding
- software/system-design patterns like:
  - explicit state machines
  - authority enforcement
  - idempotency
  - public-good security
  - neutral core plus competitive edge

These are directionally valid and well-backed enough to guide design.

### What is only inference

The following are still largely class `C`:

- that ChopDot's exact wedge will be group deposits plus closeout recovery
- that the long-term trust-layer model will be the right economic shape for ChopDot specifically
- that selective disclosure, wallet-centric authority, or ecosystem-value capture will arrive in the exact sequence currently implied
- that the current category framing will resonate in the market

These are plausible.
They are not yet proven.

### What is not yet proven in ChopDot

The following are still mostly class `D` or weak `A`:

- that users will repeatedly use the kernel
- that organizers will pay
- that the current state model is sufficient for real behavior
- that deposits or penalties improve outcomes in ChopDot specifically
- that ChopDot can actually operate with trust-layer-grade reliability
- that the product can safely carry the authority, replay, and closure guarantees it aspires to

## 2. Does ChopDot Itself Meet The Standard Yet?

### Short answer

No.

Not yet.

### Why not

Because the repo now defines the standard more clearly than the implementation and operating process currently satisfy it.

Specifically:

- product truth is stronger than product proof
- architecture doctrine is stronger than semantic enforcement
- research coverage is stronger than evidence classification at the claim level
- future direction is stronger than present verification

## 3. Can The Repo Safely Accept New Claims Yet?

### Short answer

Only partially.

### What is now in place

The repo can accept new claims better than before because it now has:

- a rigor model
- current source-of-truth classification
- research programs
- validation doctrine
- explicit known unknowns around several open areas

### What is still missing

The repo still lacks the enforcement surfaces that would make new-claim admission genuinely rigorous.

Missing or incomplete:

1. a claim registry or evidence ledger
2. a live `known / unknown / needs proof` dashboard
3. trust-boundary policy
4. authority-model policy
5. impact-dashboard requirements
6. proof-to-claim mapping between docs and implementation/tests
7. a habit of tagging major claims by evidence class and confidence

Without those, new claims can still drift in informally through:

- chat synthesis
- roadmap enthusiasm
- architectural taste
- plausible analogies that are not yet validated

## 4. Claim-Class Audit

## A. Strongly Backed By External Evidence

These are safe to use as design doctrine:

- small-group coordination needs explicit rules and visible norms
- repeated interaction and bounded membership matter
- organizer burden and social ambiguity are major failure sources
- authority must be explicit in trust-critical systems
- replay safety and typed lifecycle state matter
- open systems survive through measurable contribution, contributor renewal, and continuity logic
- public-good security and incident learning are structural advantages

## B. Reasonable But Still Inferential For ChopDot

These should be carried as informed bets, not truths:

- subscription should only be a bridge model
- ChopDot should evolve into a trust-layer business
- ecosystem-value capture will become material later
- wallet-centric authority will matter enough to justify later adapters
- joined vs committed vs reconfirmed will become necessary product state

## C. Unproven And Requires ChopDot-Specific Evidence

These need direct validation:

- which ICP bites first
- whether deposits improve completion rates
- whether closeout is the first wedge that users most clearly feel
- willingness to pay for trust/reliability/policy surfaces
- whether organizer/operator pain is intense enough to create repeat paid usage
- whether the current UI and state model make users behave more reliably

## 5. Proof Audit

### Product proof

Current status: weak to partial

Reason:

- validation plan exists
- semantic implementation is still incomplete
- no completed validation log is present

### Engineering proof

Current status: partial

Reason:

- strong doctrine exists
- there is some test coverage on Teddy's branch
- the tests currently still encode at least one wrong semantic shape
- critical trust claims are not yet fully enforced in backend logic

### Market proof

Current status: weak

Reason:

- strong narrative and pricing thinking exists
- not enough real interviews, retention evidence, or payment evidence exists yet

### Trust/security proof

Current status: weak to partial

Reason:

- security/privacy review doctrine exists
- frontier security research exists
- no trust-boundary policy, incident model, or verification bar is in place yet

## 6. Standard-Compliance Verdict

If the question is:

**"Is ChopDot already proven to meet the standard it now claims to use?"**

the answer is:

**No.**

If the question is:

**"Is the current corpus strong enough to define a serious standard and move toward it?"**

the answer is:

**Yes.**

## 7. What Must Exist Before The Answer Becomes "Yes"

The minimum set is:

1. `TRUST_BOUNDARY_AND_SECURITY_POLICY.md`
2. `AUTHORITY_MODEL_AND_ROLE_POLICY.md`
3. `ECOSYSTEM_IMPACT_DASHBOARD_REQUIREMENTS.md`
4. a claim/evidence ledger for major current doctrine
5. completed founder validation artifacts against the real kernel
6. proof logs for:
   - user validation
   - pricing validation
   - implementation validation
7. code and test alignment with kernel semantics

## 8. Practical Standard From Here

From this point forward, the correct operating sentence is:

**research-backed doctrine, partially verified implementation, unproven market and trust-layer end-state**

That is the honest status.

## Decision

The repo is not yet entitled to say it has fully proven its own standard.

## Why

Because the strongest work so far is:

- doctrine
- synthesis
- evidence-backed direction

while the weakest work is still:

- ChopDot-specific verification
- claim-by-claim evidence labeling
- completed proof artifacts

## Next Move

Do these in order:

1. create the three missing policy/control docs
2. create a `CLAIMS_AND_EVIDENCE_LEDGER.md`
3. run the founder validation plan against the next semantically-correct kernel branch
4. log product, pricing, and operator proof in a visible `known / unknown / needs proof` surface
