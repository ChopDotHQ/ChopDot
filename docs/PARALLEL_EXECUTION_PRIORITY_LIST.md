# Parallel Execution Priority List

<discovery_plan>
- Convert the full strategy and research package into one execution order
- Separate Teddy-owned critical-path work from founder-owned parallel work
- Make it clear what is active now, what supports current work, and what is deferred
</discovery_plan>

## FACTS

- Teddy is currently working from the shared commitment handoff package.
- The current critical path is still:
  - restore the shared commitment kernel
  - validate the first proof slice
- The strongest wedge remains:
  - group deposits before execution
- The simplest technical recovery path remains:
  - chapter / closeout loop first
- The business is strategically much clearer than it is operationally proven.

## INFERENCES

- The highest-value parallel work is not random feature work.
- The highest-value parallel work is founder-owned preparation that increases:
  - proof quality
  - user learning
  - pricing learning
  - legal / trust clarity
  - future pilot readiness
- Teddy should stay on the kernel.
- You should stay on everything that makes the kernel testable, measurable, and monetizable.

## ASSUMPTIONS

- Teddy is still the owner of the current implementation branch.
- You want to avoid stepping into his code lane while still moving the company forward.

## Priority Order

## P0: Teddy Critical Path

### Owner

- Teddy

### Status

- active now

### Goal

Restore the first proof slice:

1. create / open commitment
2. compute settlement
3. create chapter / closeout proposal
4. move one leg from `pending` -> `paid`
5. counterparty confirms
6. chapter closes visibly
7. state survives refresh

### Why this is first

Without this, everything else becomes planning without a product center.

### Success condition

- the product behaves like a shared commitment loop, not a nicer balance calculator

## P1: Founder Parallel Track A — Validation And Proof

### Owner

- founder

### Status

- active now

### Goal

Prepare the exact validation surface Teddy’s branch will be judged against.

### Concrete work

- tighten the founder validation workflow in:
  - `docs/FOUNDER_VALIDATION_PLAN.md`
- prepare a simple test log template for:
  - what was tested
  - what failed
  - what confused users
  - what felt strong
- define the first 3 live demo scenarios:
  - expense closeout chapter
  - group deposit
  - shared funding goal

### Why

When Teddy comes back with a branch, you do not want to improvise what “good enough” means.

### Deliverable

- one founder test script
- one validation capture sheet
- one decision rubric: `proceed`, `fix`, or `stop`

## P2: Founder Parallel Track B — User And ICP Discovery

### Owner

- founder

### Status

- active now

### Goal

Turn the wedge into real market learning before overbuilding.

### Concrete work

- identify the first 10 high-signal conversations across:
  - retreat organizers
  - trip leads
  - popup community operators
  - workshop / event organizers
  - community treasurers
- run interviews around:
  - fronting pain
  - ghosting pain
  - dropouts
  - what “committed” means in practice
  - what they currently do with WhatsApp / spreadsheets / deposits
- collect exact language users use to describe:
  - being in
  - paying
  - confirming
  - replacing someone
  - closing out

### Why

This is what improves:
- wedge clarity
- status language
- willingness-to-pay framing
- GTM

### Deliverable

- one interview list
- one notes repository
- one language / pain-pattern memo

## P3: Founder Parallel Track C — Pricing And Monetization Proof

### Owner

- founder

### Status

- active now

### Goal

Move monetization from coherent theory toward first proof.

### Concrete work

- pressure-test current pricing with real prospects:
  - organizer
  - community
  - provider / SMB
- ask what they would pay for:
  - clear commitment state
  - no chasing
  - proof of paid vs confirmed
  - admin / organizer controls
  - closeout visibility
- refine the current pricing ladder only after hearing repeated patterns

### Why

Pricing proof is one of the biggest remaining business gaps.

### Deliverable

- first pricing interview notes
- first willingness-to-pay signal memo
- adjustments to the financial model only if real evidence supports them

## P4: Founder Parallel Track D — Metrics And Instrumentation Plan

### Owner

- founder, with engineering input later

### Status

- active now

### Goal

Decide what proof the product must emit once the kernel works.

### Concrete work

Start with:
- `R` readiness
- `FR` funding ratio
- `PCR` participation commitment ratio
- `ORE` organizer risk exposure
- `RB` recovery burden

Use:
- `docs/SYSTEM_METRICS_AND_FORMULAS.md`

### Why

This is needed for:
- founder judgment
- investor proof
- ecosystem attribution later

### Deliverable

- one minimal metrics spec
- one dashboard requirements note
- one “must track before pilots” checklist

## P5: Founder Parallel Track E — Research Operationalization

### Owner

- founder

### Status

- active now

### Goal

Turn the research package into something reusable instead of leaving it as static docs.

### Concrete work

Create the tracked `research/trust_systems/` surface later proposed in:
- `docs/RESEARCH_AGENDA_TRUST_AND_FAILURE.md`

Minimum useful files:
- `01_roscas.md`
- `02_savings_groups.md`
- `03_mutual_aid.md`
- `04_cooperatives.md`
- `05_community_currencies.md`
- `06_daos.md`
- `07_insights.md`
- `10_sources.md`

### Why

This turns research into a living asset instead of chat residue.

### Deliverable

- repo research folder scaffold
- annotated source table
- first `adopt / adapt / avoid / watch` synthesis

## P6: Founder Parallel Track F — Legal / Trust Boundary Prep

### Owner

- founder

### Status

- active now

### Goal

Clarify launch posture enough that product and GTM do not accidentally cross the line.

### Concrete work

- define the launch perimeter in plain language:
  - coordination only
  - coordination + proof
  - what is out
- define what ChopDot must never imply in UI copy:
  - custody if no custody exists
  - confirmation if only a claim exists
  - finality if closure has not happened

### Why

This reduces product, legal, and trust risk at the same time.

### Deliverable

- one launch-boundary language memo
- one forbidden-claims / risky-copy checklist

## P7: Founder Parallel Track G — Pilot Readiness

### Owner

- founder

### Status

- supporting current work

### Goal

Be ready to move quickly once the kernel is validated.

### Concrete work

- prepare first pilot candidate lists
- prioritize likely first environments:
  - organizer-led deposit groups
  - retreat / trip contexts
  - popup communities
- keep Brazil / Kenya localization and local rails as planning inputs, not immediate scope

Use:
- `docs/LOCALIZATION_BRAZIL_KENYA_EXECUTION_PLAN.md`

### Why

This shortens the delay between product proof and market proof.

### Deliverable

- first pilot shortlist
- first target use-case shortlist

## Deferred

These are important, but not the current frontier:

- full Pix adapter
- full M-PESA adapter
- USDC / Base settlement rollout
- Polkadot / Hedera rail implementation
- ZK modules
- agent execution
- tokenized transferable rights
- builder/API productization
- hackathon packaging

## Not Now

- yield
- custody spread
- token-first monetization
- full booking-engine scope
- generalized platform abstraction before kernel proof

## Recommended Founder Sequence This Week

1. finalize validation script and test rubric
2. line up first 10 user / operator interviews
3. run first pricing conversations
4. draft minimal metrics / dashboard spec
5. scaffold the research repo surface
6. prepare first pilot shortlist

## One-Line Rule

While Teddy restores the kernel, your job is to make sure the moment it works, ChopDot can be tested, judged, priced, explained, and piloted without another month of abstract planning.
