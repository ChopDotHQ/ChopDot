# ADR 0005 — Portable agent outcome system

**Kind:** decision
**Status:** accepted
**Owner:** agent-systems integrator
**Last reviewed:** 2026-08-31
**Applies to:** `chopdot-v1-launch`
**Authority:** process architecture only; never product law, participant authority, product priority, or release proof

**Implementation status:** tracked separately in accepted outcome packets, CI,
knowledge receipts, and the adoption report; this ADR alone proves none of it.
**Independent assurance owner:** product assurance
**Decision date:** 2026-08-26
**Starting branch:** `codex/chopdot-v1-launch`
**Starting HEAD:** `74d81cba8edd7200246b837c5a31ec4f00456409`
**Plan:** `docs/superpowers/plans/2026-08-26-portable-agent-outcome-system.md`
(`sha256:ed057ac526bfef7baef716ec00b8178640862e761bc0b9c1a427ee3ec77c9791`)
**Supersedes:** the classification of context, release, knowledge recall, and
review as equivalent "loops"; the backend-specific KGv2/Repo Graph wording in
ADR 0004 while retaining ADR 0004's authority order
**Does not supersede:** `PRODUCT_TRUTH.md`, Product Cockpit priority, participant
authority, ADRs 0001–0003, or the context hierarchy established by ADR 0004

## Context

ChopDot has useful operating-loop documentation, a Product Cockpit, context
authority checks, AgentOps bridges, agent skills, release checks, and an open
supervision proposal in PR #14. They do not yet form one executable agent
system. Some documents call gates, pipelines, adapters, evaluators, and
artifact-producing agent work by the same name, "loop." That makes expected
outcomes and stop conditions subjective and allows a backend implementation
name such as KGv2 to become accidental architecture.

PR #14 adds concrete invariant, evidence, exact-head, negative-test, and
provider-scan controls. It also introduces a second operating authority, a
second packet family, a shorter competing `AGENTS.md`, a standalone workflow,
and `docs/adr/0004-current-pr-head-token.md`, which collides with the accepted
ADR 0004 already present in this worktree. PR #14 is open, draft, conflicting,
and based on an older release-tree commit. It therefore cannot be merged or
copied wholesale.

The governing implementation plan requires a provider-neutral system that can
create bounded artifacts, observe their real environment, evaluate objective
assertions, repair within a declared budget, and terminate with explicit proof.

## Decision

### 1. Establish one machine-readable taxonomy

`governance/agent-system/taxonomy.json` is the classification manifest for
process architecture. It defines five distinct system types:

1. **Agent Loop** — creates and repairs a bounded artifact;
2. **Gate** — allows or blocks entry to later work;
3. **Pipeline** — advances immutable identity through ordered stages;
4. **Adapter** — implements a stable port without changing core semantics;
5. **Evaluation Flywheel** — turns accepted failures and successes into
   versioned regression cases.

Only an Agent Loop is a create-observe-evaluate-repair cycle. A gate, pipeline,
adapter, or flywheel may contain repetition internally, but it does not become
an Agent Loop unless it owns a declared artifact and the Agent Loop Contract.

### 2. Route into one contract and one packet family

`TaskRouteV1` is the fail-closed admission receipt in front of the existing
contract. It classifies task domain, run type, execution mode, risk, selected
profile and provider-neutral agent roles, repository-approved skill IDs,
exact repository-relative task input/exclusion paths, expected outcome,
evidence, finite budget, stop condition, approval boundary, and routing
rationale. Its verdict is exactly one of `routed`, `unverified`, `blocked`, or
`approval_required`.

The receipt may choose process and evidence. It may not choose product
priority, design direction, participant authority, membership, money, or
release truth. Platform-injected or repository-disabled skills may be observed
but cannot establish governed acceptance. Time-based and proactive routes are
read-only; any mutation requires a new approved effect route. A critical route
requires exact-candidate evidence, an evaluator role separate from the task
owner, approval for the mutation, and environmental readback.

Routing policies, retry budgets, profiles, and example contracts are loaded
from the receipt's exact repository root. A clean committed tree is mandatory
for critical routing because a dirty path list does not bind uncommitted bytes.
Repository, external, and critical-external routes also bind an explicit list
of allowed effect types; the runtime rejects effects outside that list. The
route's path lists are fixed before contract creation. A mutating contract's
allowed-write set must equal its routed `in_paths`, and neither contract
arguments nor an example contract may replace that scope.

The receipt also binds the governing source, requirement IDs, and final
deterministic command set. Contract creation cannot override these acceptance
inputs, and omission of custom commands retains the selected profile's default
checks.

`approval_ref` is a digest-bound structured operator attestation recording a
human actor, exact root, candidate HEAD/tree, task path scope, purpose, allowed
effect set, source message/envelope, and expiry. It is not a cryptographic identity proof:
the evidence reference and claimed human identity are not authenticated by
TaskRouteV1 and must not be reported as independently verified human approval.
Every external effect still needs its own run-ledger approval identity and
readback before dispatch.

Canonical packet persistence may reorder JSON object keys. Route and contract
readback therefore compares canonical values, not insertion order. Semantic
changes remain protected by packet digests and exact binding checks.

Every non-trivial agent run uses `AgentLoopContractV1` and terminates as exactly
one of:

- `succeeded`;
- `failed_verification`;
- `blocked`;
- `approval_required`;
- `budget_exhausted`;
- `cancelled`.

Accepted results use `OutcomePacketV1`. Incomplete or interrupted results use
`ContinuationPacketV1`. PR #14's evidence packet fields become assertion-level
entries inside `OutcomePacketV1.evidence_index`; they do not remain a second
top-level packet family.

The canonical evidence vocabulary is:

`source-only`, `unit`, `simulated-integration`, `simulated-host`,
`exact-candidate`, `real-host-chain`, `live-user`, `release`, and
`local-blocked`.

`local-blocked` records useful blocker evidence but cannot promote an outcome.
Evidence never inherits to a newer source identity merely because a test was
green on an ancestor commit.

### 3. Keep product and operational authority separate

- `PRODUCT_TRUTH.md` remains the sole product-law source.
- Product Cockpit source `product/cards.md` remains the current product-priority
  source; P-035 remains the active next product gate.
- Participant-held signatures and Chop events remain product authority.
- Agent ledgers, evaluation packets, CI, KGs, Repo Graph, and evidence indexes
  are operational provenance only.
- An accepted ADR or successful agent run cannot claim implementation,
  deployment, reachability, ownership, or real-user proof without the matching
  evidence level.

### 4. Make knowledge replaceable

Core code will depend on a provider-neutral Knowledge Context Port. KGv2,
future KG versions, Repo Graph, and exact-source retrieval are adapters. Backend
name, runtime, version, fallback, freshness, and citations remain visible in
evidence metadata, but backend identity may not branch core loop semantics.

The permanent operations are:

```text
read_context(scope, question)
record_outcome(outcome_packet)
verify_recall(expected_scope)
```

Adapter conformance and exact-root citation checks, not the label "KGv2," decide
whether recalled context is usable.

### 5. Adopt durable, bounded execution without a new backend

The first runner uses the repository's existing Node ESM and JSON facilities.
Authoritative run events are append-only JSONL under ignored
`output/agent-runs/<run-id>/`; snapshots are derived. External effects require
an idempotency key, authority and approval records when applicable, dispatch
state, environmental readback, and reconciliation. An unknown effect blocks
redispatch. No operated database, model provider, orchestration framework, or
knowledge backend becomes mandatory.

### 6. Reconcile PR #14 before overlapping implementation

The file-by-file decision is recorded in
`docs/investigations/2026-08-26-pr-14-agent-supervision-reconciliation.md`.
Its useful invariant catalog, evidence ladder, negative tests, exact-head
assertion, PR traceability, and provider scan will be adapted behind this ADR's
contracts. Its competing authority documents and packet family will not be
activated. The exact-head decision is adopted here, so no second ADR 0004 is
created.

### 7. Preserve instruction and document routing during migration

The exact worktree's `AGENTS.md` and read order remain active until the
instruction-surface integration wave updates them. Existing operating-loop
documents remain historical inputs, but their labels are interpreted through
the taxonomy manifest. They may not redefine terminal states, evidence levels,
packet families, product law, or current product priority.

## Required outcomes

The architecture is implemented only when all of the following are true:

- schemas and loop profiles fail closed on subjective or incomplete contracts;
- task routes fail closed on disabled skills, authority conflicts, wrong-root
  receipts, widened budgets, missing approval attestation, unapproved effect
  types, post-start contract tampering, and route/contract mismatch;
- interruption and resume preserve the digest chain and do not duplicate an
  unresolved external effect;
- every supported agent loop produces its declared artifact and accepted
  evidence in three fresh pilot runs;
- deterministic, trajectory, authority, and independent evaluators pass their
  positive and adversarial suites;
- the core swaps KGv2 for mock-KGv3 without semantic changes;
- Cockpit, context, instructions, `.knowns`, CI, and release tooling consume the
  same contract and packet family;
- required checks are enforced and independently read back from repository
  settings;
- documentation and generated context cite this exact accepted source; and
- no product UI exposes agent-system vocabulary.

Source existence or this accepted ADR alone proves none of those outcomes.

## Alternatives considered

### Keep the existing eight items as equivalent loops

Rejected. They have different ownership, artifacts, evaluators, and success
conditions. Treating all of them as loops leaves outcomes subjective.

### Adopt PR #14 wholesale

Rejected. It conflicts with the active branch, duplicates process authority,
collides with ADR 0004, replaces the richer exact-worktree instructions, and
creates an incompatible evidence packet family. Its verified slices remain
valuable and are explicitly preserved for integration.

### Make KGv2 the core architecture

Rejected. Knowledge backends change. The durable requirement is cited,
freshness-aware, exact-scope recall with record/readback semantics.

### Start with Temporal, LangGraph, or an operated database

Deferred. Durable event, effect, lease, and resume semantics are required;
framework adoption is not. Wave 8 measurements may justify a later adapter.

### Use documentation and agent good judgment without executable contracts

Rejected. A predictable outcome requires machine validation, environmental
observation, explicit evidence, bounded repair, and finite terminal states.

## Consequences

- Agent work gains explicit outcomes, evidence boundaries, retry budgets, and
  resumable handoffs.
- Operator intent gains one inspectable routing receipt before the loop
  contract, without introducing a new loop type or packet family.
- Gates and release pipelines stop masquerading as completed agent work.
- KG upgrades become adapter changes rather than governance migrations.
- PR #14 can contribute strong controls without becoming a competing source of
  truth.
- Initial packages carry additional contract and evidence overhead. Trivial,
  deterministic tasks may use a declared exemption; pilot metrics determine
  whether the system is proportionate.
- Accepted packets remain readable even if the first runner is rolled back.

## Verification and evidence

Wave 0 requires:

- JSON parsing of `governance/agent-system/taxonomy.json`;
- schema and adversarial validation of `TaskRouteV1`, including route-to-contract
  and route-readback checks;
- a complete, one-row-per-file PR #14 reconciliation with source hashes;
- confirmation that `PRODUCT_TRUTH.md` and the P-035 Cockpit source did not
  change;
- `npm run context:validate`;
- focused structural checks for the five types, six terminal states, and one
  packet family; and
- independent architecture review before Wave 0 is called accepted as an
  implementation slice.

Later waves must satisfy the verification matrix in the governing plan. CI
presence and branch enforcement remain separate verdicts.

## Revisit trigger

Reopen this ADR if any of the following occurs:

- a second same-level contract, packet family, terminal-state vocabulary, or
  process authority is introduced;
- a knowledge backend change requires core loop changes;
- event-ledger recovery cannot pass interruption and corruption tests;
- external-effect reconciliation cannot prevent blind redispatch;
- pilot measurements show the contract costs more than the outcomes justify;
- provider or platform semantics invalidate exact-head or evidence identity;
  or
- independent review finds that agent governance can alter product authority.
