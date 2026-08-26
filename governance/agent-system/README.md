# ChopDot portable agent outcome system

**Kind:** operating architecture
**Status:** Wave 0 taxonomy accepted; executable system not yet complete
**Owner:** agent-systems integrator
**Independent assurance owner:** product assurance
**Last reviewed:** 2026-08-26
**Authority:** process and provenance only; never product law, participant
authority, product priority, or release proof

This directory is the stable home for ChopDot's machine-readable agent outcome
system. It converts a bounded operator intent into an inspectable artifact,
objective evaluation, finite terminal state, and evidence-bearing handoff.

The governing decision is
[`docs/adr/0005-portable-agent-outcome-system.md`](../../docs/adr/0005-portable-agent-outcome-system.md).
The implementation sequence and acceptance matrix are in
[`docs/superpowers/plans/2026-08-26-portable-agent-outcome-system.md`](../../docs/superpowers/plans/2026-08-26-portable-agent-outcome-system.md).

## Authority boundary

This system may:

- validate agent contracts and exact-worktree context;
- coordinate bounded creation, observation, evaluation, and repair;
- record operational checkpoints, effects, approvals, and evidence;
- prevent a claim from exceeding its evidence;
- block integration or release when a declared gate fails; and
- provide cited operational provenance to Cockpit, PR, CI, and knowledge
  adapters.

It may not:

- modify or outrank `PRODUCT_TRUTH.md`;
- reprioritize Product Cockpit source `product/cards.md` or displace P-035;
- create membership, money, payment, recovery, or organizer authority;
- treat an agent ledger or knowledge graph as Chop event authority;
- publish, deploy, merge, use credentials, or change repository settings without
  the applicable human approval; or
- describe source existence as implementation, live use, or release proof.

## System shape

```text
operator intent
  -> Context Preflight Gate
  -> AgentLoopContractV1
  -> specialized Agent Loop
       create -> observe -> evaluate -> bounded repair
  -> Integration Gate
  -> Release Pipeline when applicable
  -> OutcomePacketV1 or ContinuationPacketV1
  -> Knowledge Context Adapter and Evaluation Flywheel
```

The classification rules are machine-readable in `taxonomy.json`:

| Type | Owns | Success condition |
|---|---|---|
| Agent Loop | a bounded created or changed artifact | evaluator accepts all required assertions and evidence |
| Gate | an entry decision | every declared assertion passes |
| Pipeline | an ordered identity transition | every stage preserves exact input/output identity and readback |
| Adapter | a stable port implementation | conformance tests pass without core semantic changes |
| Evaluation Flywheel | versioned regression cases | the case reproduces and is included in a named suite |

## Supported Agent Loops

All profiles use the same contract, terminal states, evidence vocabulary, and
packet family.

| Profile | Required artifact | Objective outcome | Critical independent review |
|---|---|---|---|
| Research | cited decision or research packet | every material claim has admissible citations and uncertainty labels | required when a product, security, legal, or release decision depends on it |
| Product Definition | accepted card/spec/journey | score at least 8/10, no product-law conflict, testable scenarios and failure path | product assurance |
| Implementation | verified patch | requirements pass focused and production-entrypoint checks with attributed dirty paths | required for critical authority, money, privacy, recovery, or release code |
| UX Creation | accepted real-screen journey | one obvious next action plus first/action/error/recovery/after evidence | product and accessibility assurance |
| Security and Authority | threat/finding/verdict packet | zero unresolved critical/high findings in affected boundaries | reviewer must differ from implementer |
| Incident Repair | reproduction and repair packet | reported failure is reproduced or honestly bounded, fixed, and live-regressed | independent readback for release-impacting incidents |
| Release Outcome | immutable release packet | reviewed bytes remain identical through stage, promotion, reachability, and ownership readback | independent release assurance |

## Canonical packets and evidence

`OutcomePacketV1` is the sole successful/final packet family.
`ContinuationPacketV1` is the sole incomplete/interrupted handoff family. An
outcome records exact root, branch, starting and ending source identity,
requirements, artifact hashes, evaluations, effect reconciliation, approvals,
limitations, terminal state, evidence, and knowledge receipts.

The ordered promotable evidence levels are:

```text
source-only
< unit
< simulated-integration
< simulated-host
< exact-candidate
< real-host-chain
< live-user
< release
```

`local-blocked` is non-promotable evidence for an honest blocker. Skipped jobs,
ancestor commits, simulated hosts, Vercel status, registry snapshots, payer
transactions, and KGs must not be relabelled as stronger evidence.

## Terminal states

Every run ends as exactly one of:

- `succeeded` — every required assertion and readback passed;
- `failed_verification` — an artifact exists but required checks failed;
- `blocked` — a same-level conflict or external condition prevents safe work;
- `approval_required` — the next effect exceeds current authority;
- `budget_exhausted` — the declared iteration, time, tool, or cost budget ended;
- `cancelled` — an operator or orchestrator stopped the run.

An unknown terminal state, missing evaluator, subjective expected outcome,
unattributed dirty path, unknown external effect, or cross-root context must fail
closed.

## Stable knowledge boundary

Core code uses a Knowledge Context Port rather than KGv2, KGv3, Repo Graph, or
another provider directly:

```text
read_context(scope, question)
  -> facts, citations, source identities, freshness, confidence,
     backend, version, runtime, read path, fallback

record_outcome(outcome_packet)
  -> accepted/rejected, durable record ID, stored digests

verify_recall(expected_scope)
  -> recalled facts/citations, mismatch, stale reasons
```

Provider identity stays in evidence. An adapter is usable only after the shared
conformance suite passes. Direct source inspection is not a knowledge-backend
fact, and a KG citation from another root, branch, or commit does not make the
current outcome known.

## Durable execution boundary

The initial implementation uses Node ESM and an append-only JSONL run ledger in
ignored `output/agent-runs/<run-id>/`. Derived snapshots are disposable. Resume
must verify the digest chain, rebuild state, respect an active lease, and
reconcile unfinished effects before new work.

Every external effect records:

- normalized type, target, intended payload digest, risk, and scope;
- deterministic idempotency key;
- authority source and approval identity/expiry when required;
- planned, approval, dispatch, readback, and reconciliation states; and
- rollback or forward-repair strategy.

The system provides idempotency, at-most-once dispatch where possible, and
readback. It does not claim arbitrary external side effects are exactly once.

## Current-to-target routing

| Existing term/surface | Target route |
|---|---|
| `docs/CHOPDOT_OPERATING_LOOPS.md` context loop | Context Preflight Gate |
| agent execution contract prose | `AgentLoopContractV1` |
| product package loop | Product Definition, Implementation, and UX Loop composition |
| live failure loop | Incident Repair Agent Loop |
| release loop | Release Outcome Pipeline |
| KGv2/Repo Graph loop | Knowledge Context Port plus adapters |
| review loop | independent evaluator plus bounded repair |
| agent regression evidence | Evaluation Flywheel |
| Product Cockpit | current product priority and outcome references; never runner authority |
| `.knowns/tasks` | generated read model only; runner-independent |

Existing documents remain available during migration. This table controls their
classification; it does not claim their executable replacements already exist.

## PR #14 reconciliation

PR #14 is not merged wholesale. Its exact-head checks, invariant catalog,
evidence semantics, negative tests, PR traceability, and provider scan are
retained for adaptation. Competing authority prose, packet types, workflow, and
ADR numbering are superseded by the single architecture here. See
[`docs/investigations/2026-08-26-pr-14-agent-supervision-reconciliation.md`](../../docs/investigations/2026-08-26-pr-14-agent-supervision-reconciliation.md).

## Ownership and CODEOWNERS boundary

| Paths | Responsible role | Required independent role |
|---|---|---|
| `governance/agent-system/contracts/**` | agent-systems integrator | product assurance |
| `governance/agent-system/policies/**` | agent-systems integrator | security/authority assurance for critical policies |
| `governance/agent-system/loops/**` | loop profile owner | product assurance |
| `governance/agent-system/evals/**` | product assurance | affected domain owner |
| `scripts/agent-system/**` | agent-systems integrator | product assurance for runner/effect changes |
| `.github/workflows/agent-governance.yml` | release integrator | independent release assurance |
| `PRODUCT_TRUTH.md` | founder/product authority | explicit founder review |
| money, membership, recovery, privacy, and release paths | affected domain owner | independent security/authority review |

`.github/CODEOWNERS` now maps these paths to the only verified repository
administrator. That routing does not by itself establish reviewer independence.
Until the repository ruleset and its required checks are present and read back,
review ownership remains a declared process requirement rather than enforced
repository state.

## Implementation status

Wave 0 establishes the ADR, taxonomy, ownership targets, and PR reconciliation.
The following remain false until later waves provide their named proof:

`contracts_built`, `runner_built`, `durable_resume_proven`,
`effects_reconciled`, `evaluators_built`, `loop_profiles_built`,
`knowledge_portable`, `kg_adapter_verified`, `repo_graph_adapter_verified`,
`cockpit_integrated`, `ci_enforced`, `branch_protected`, `pilots_passed`,
`documentation_coherent`, `independently_reviewed`, and `adopted`.

The source files in this directory must never be used to report those verdicts
true without the corresponding command results, environmental observations,
and evidence packets.
