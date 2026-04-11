# CROPS Phased Roadmap Review

<discovery_plan>
- Extract the useful strategic and engineering value from the CROPS-style phased roadmap report
- Call out where it aligns with current direction and where it drifts
- Reclassify the report into active, supporting, deferred, and not-now
</discovery_plan>

## FACTS

- The pasted report proposes a broad phased roadmap emphasizing:
  - censorship-resistance
  - resilience
  - open-source
  - permissionlessness
  - security
  - privacy / ZK
  - agent-readiness
  - transferable rights
  - smart-contract enforcement
  - composable rails
- It also proposes a phased implementation:
  - coordination MVP
  - settlement
  - transferable rights
  - multi-rail / privacy / agents / compliance
- The report recommends a default stack broadly consistent with prior doctrine:
  - Node / TypeScript
  - Postgres event store
  - Redis / queues
  - Base / EVM + USDC first
- The current active ChopDot direction is still narrower:
  - shared commitment kernel
  - chapter / closeout recovery first
  - coordination first
  - no premature custody or chain complexity

## INFERENCES

- This report is useful, but it is less directly mergeable than the Brazil/Kenya report.
- It contains both:
  - good architecture and sequencing signal
  - future-phase expansion pressure that could easily derail current work

## ASSUMPTIONS

- The report was intended as a future-state roadmap rather than a demand to build all phases now.
- CROPS is being used as a values frame, not as a justification for immediate scope explosion.

## What Aligns Strongly

### 1. Phased delivery

The report reinforces a staged path:
- coordination core first
- stronger execution later
- rights / transfers later
- privacy / agents / compliance later

This aligns with current doctrine.

### 2. Event-sourced / append-only truth

The report strongly validates:
- Postgres event ledger
- replayability
- exportability
- auditability

This aligns with the current kernel and survivability direction.

### 3. Rail adapters as replaceable edges

The report reinforces:
- Base / EVM first if and when selective enforcement is earned
- Polkadot and Hedera as later optional rails
- rails as modules, not product identity

This is directionally consistent with the layered trust stack doctrine.

### 4. Exportability and self-hostability matter

The report strengthens:
- walkaway test thinking
- portability
- no single-provider captivity

This aligns with the survivability posture.

## Where It Drifts Or Needs Filtering

### 1. Too much future-phase material can sound current

The report includes:
- ZK privacy
- multi-rail expansion
- onchain enforcement
- transferable-right tokenization
- agent identity standards
- compliance adapters

These are useful future layers, but they are not current implementation scope.

### 2. CROPS values can accidentally create architecture inflation

If interpreted badly, “censorship-resistant / permissionless / privacy-preserving / agent-ready / multi-rail” can push the team to overbuild before proving the kernel.

### 3. Settlement phase language is more execution-heavy than current proof slice

The current proof slice is still:
- chapter lifecycle
- paid vs confirmed vs closed
- persistence
- typed history

Not:
- live USDC + Base settlement
- Safe / escrow rollout now

## Recommended Classification

### Active now

- event ledger and replayability
- exportability
- replaceable rails as an architectural rule
- phased thinking
- no premature custody

### Supporting current work

- commitment unit / transferable rights as a later domain concept
- compliance as adapter, not product center
- portability / self-hostability discipline

### Deferred

- live Base / USDC settlement
- Polkadot Hub rail
- Hedera scheduled execution
- ZK modules
- ERC-based agent identity
- onchain tokenized rights

### Not now

- full multi-rail implementation
- deep privacy stack
- advanced agent execution
- heavy compliance productization

## Decision

Use this report as a future-state architecture and values filter, not as a current build brief.

## Why

It helps ChopDot stay:
- principled
- modular
- exportable
- future-compatible

But if treated as current scope, it would almost certainly slow down kernel proof.

## Next move

- Treat this as a supporting future-state document.
- Keep the first live implementation target unchanged:
  - restore the shared commitment kernel first.
