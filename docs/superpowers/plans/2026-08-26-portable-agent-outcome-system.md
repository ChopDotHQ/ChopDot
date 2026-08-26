# Portable Agent Outcome System — build, integration, and adoption plan

**Kind:** decision
**Status:** active
**Owner:** agent-systems integrator
**Last reviewed:** 2026-08-26
**Applies to:** `chopdot-v1-launch`
**Authority:** current bounded agent-system implementation plan; never product law, participant authority, product priority, or release proof

**Independent assurance owner:** product assurance
**Decision date:** 2026-08-26
**Exact target:** `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`
**Branch at plan creation:** `codex/chopdot-v1-launch`
**HEAD at plan creation:** `74d81cba8edd7200246b837c5a31ec4f00456409`
**Tree at plan creation:** `fc000c64fe3eeb0362ac11905d0d6afaadfb74c9`

## 1. Outcome

Build, integrate, and adopt a provider-neutral agent execution system that
makes ChopDot work packages produce predictable, inspectable outcomes.

The finished system is not another document describing good behavior. It is a
working set of contracts, validators, runners, durable checkpoints, effect
records, evaluators, regression cases, knowledge adapters, CI checks, and
cross-agent instructions. It must support these agent-created outcomes:

1. cited research and decision packets;
2. accepted product cards, specs, and journeys;
3. verified code patches;
4. accepted real-screen UX journeys;
5. security and authority verdicts;
6. reproduced and repaired live incidents;
7. immutable, independently verified release outcomes.

Every supported loop must end in one of a finite set of explicit terminal
states and must emit evidence that explains why. A loop is not successful
because an agent stopped talking, tests happened to pass once, or a knowledge
system remembered a claim.

### Completion verdicts

Report these independently:

`architecture_decided`, `contracts_built`, `runner_built`,
`durable_resume_proven`, `effects_reconciled`, `evaluators_built`,
`loop_profiles_built`, `knowledge_portable`, `kg_adapter_verified`,
`repo_graph_adapter_verified`, `cockpit_integrated`, `ci_enforced`,
`branch_protected`, `pilots_passed`, `documentation_coherent`,
`independently_reviewed`, and `adopted`.

Planning, source existence, local tests, CI presence, branch enforcement, and
real adoption are separate verdicts.

## 2. Current truth to preserve

- `PRODUCT_TRUTH.md` remains the only product-law source. This system may
  retrieve, cite, test, and protect it; it may not rewrite or outrank it.
- The Product Cockpit remains the current product-priority source. This plan is
  an agent-workflow package and does not replace P-035 or select a new product
  feature.
- Participant signatures and the Chop event model remain product authority.
  Agent ledgers, KGs, Repo Graph, CI, and evidence indexes are operational
  provenance only.
- Application, release, and user-proof verdicts remain separate.
- Agent providers, models, orchestration engines, and knowledge backends remain
  replaceable.
- Normal ChopDot UI must never expose agent, KG, Repo Graph, checkpoint,
  evaluator, SDK, host, or orchestration vocabulary.
- Human approval remains mandatory for credential use, external publication,
  deployment, branch-setting mutations, merging, or other actions outside the
  active approval envelope.
- The first implementation adds no operated backend and no new runtime
  dependency. It uses the repo's existing Node ESM and JSON facilities.

## 3. What an agent loop means here

An **agent loop** is a bounded create-observe-evaluate-repair process operated
by an agent role to produce a declared artifact with an objectively testable
outcome:

```text
intent and authority
-> context preflight
-> outcome contract
-> create or change artifact
-> observe the real environment
-> evaluate assertions and trajectory
-> repair with changed evidence or hypothesis
-> succeed, fail verification, block, request approval, exhaust budget, or cancel
```

The path may adapt. The required artifact, assertions, evidence boundary,
authority, budget, and terminal-state semantics may not silently adapt.

### Taxonomy lock

| Type | Purpose | Examples | May claim success when |
|---|---|---|---|
| Agent loop | Creates and repairs a bounded artifact | research, implementation, UX | its evaluator accepts the artifact and required evidence |
| Gate | Allows or stops entry to a later activity | context preflight, integration | every declared assertion passes |
| Pipeline | Advances immutable state through ordered stages | release | each stage has exact input/output identity and readback |
| Adapter | Replaces a provider behind a stable port | KGv2, KGv3, Repo Graph | conformance tests pass; adapter name never leaks into core semantics |
| Eval flywheel | Converts accepted failures/successes into regression cases | trajectory and task suites | a case is reproducible, versioned, and included in the appropriate suite |

The current operating concepts migrate as follows:

| Current name | Target classification |
|---|---|
| Context loop | Context Preflight Gate |
| Agent execution contract | Agent Loop Contract V1 |
| Product package loop | Product Definition plus Implementation/UX loop composition |
| Live failure loop | Incident Repair Agent Loop |
| Release loop | Release Outcome Pipeline |
| KGv2/Repo Graph loop | Knowledge Context Port and provider adapters |
| Review loop | Independent Evaluator and Repair Loop |
| Agent regression evidence | Evaluation Flywheel |

## 4. Scope

### In scope

- machine-readable agent contracts and JSON Schemas;
- deterministic validation and lifecycle commands;
- local durable run, checkpoint, effect, approval, artifact, and evidence logs;
- resume, cancellation, budget, lease, corruption, and reconciliation behavior;
- independent evaluator contracts and trajectory grading;
- seven agent-specific loop profiles and their default objective outcomes;
- representative golden, adversarial, stale-context, wrong-root, false-success,
  and interruption cases;
- a provider-neutral knowledge context interface;
- adapters for exact-source/Repo Graph and the current KGv2 bridge, plus a fake
  KGv3 adapter used to prove portability;
- Product Cockpit, context-authority, PR, CI, and release integration;
- reconciliation of the useful parts of PR #14 without adding a second
  supervision authority;
- portable instructions for Codex, Claude, and other agents;
- documentation consolidation, ADR, migration, and deprecation markings;
- branch protection/ruleset definition and readback after explicit approval;
- observability, evaluation metrics, pilot runs, and independent acceptance.

### Out of scope

- changing `PRODUCT_TRUTH.md`;
- implementing a ChopDot end-user feature under this process plan;
- making KGv2, KGv3, LangGraph, Temporal, OpenAI, Anthropic, Google, or any
  provider mandatory;
- using agent checkpoints as product persistence or participant authority;
- silently merging PR #14 or another branch wholesale;
- merging PRs, changing repository settings, publishing, or deploying during
  the planning task;
- claiming arbitrary external effects are exactly once. The system provides
  idempotency, at-most-once dispatch where possible, readback, and reconciliation.

## 5. Architecture

```text
Operator intent
  |
  v
Context Preflight Gate -----> Knowledge Context Port -----> adapter(s)
  |                               |                         KGv2 / KGv3 /
  v                               |                         Repo Graph / flat
Agent Loop Contract V1 <----------+
  |
  v
Durable Run Controller ---> append-only run/effect/approval ledger
  |
  +--> specialized creator/executor
  |
  +--> real environment observation
  |
  +--> independent or deterministic evaluator
  |
  +--> bounded repair directive --+
  |                                |
  +--------------------------------+
  |
  v
Integration Gate ---> Release Pipeline when applicable
  |
  v
Outcome Packet + Evidence Index
  |
  +--> Cockpit/PR/CI/read models
  +--> Knowledge Context Port record + recall verification
  +--> Evaluation Flywheel regression case
```

### Architecture decisions

1. **Node ESM core.** Implement deterministic controls in `.mjs` so the
   governance system runs before `npm ci` and does not depend on a model SDK.
2. **JSON Schema boundary.** Every persisted packet is versioned and validated
   before use. Unknown major versions fail closed. Unknown optional fields are
   preserved by read/write round trips.
3. **Append-only local ledger.** Run-time state lives under ignored
   `output/agent-runs/<run-id>/`; accepted redacted evidence may be promoted to
   `artifacts/agentops/outcomes/<run-id>/`.
4. **Derived snapshots.** `snapshot.json` is rebuilt from `events.jsonl`; it is
   never authoritative over the event ledger.
5. **Effect reconciliation.** External writes require an effect record,
   idempotency key, approval evidence when applicable, dispatch record,
   environmental readback, and final reconciliation state.
6. **Evaluator separation.** Deterministic checks may run in-process. Critical
   security, authority, money, privacy, recovery, or release acceptance also
   requires a separately identified reviewer or evaluator run.
7. **Portable knowledge.** Core code depends only on the Knowledge Context
   Port. Backend name/version appear in evidence metadata, never branching
   logic outside adapters.
8. **No hidden retry.** Every repair increments an iteration, names the failed
   assertion and changed hypothesis, and consumes the declared budget.
9. **Fail closed on ambiguity.** Wrong root, stale authority, malformed ledger,
   unverifiable side effect, expired approval, or conflicting product law ends
   in `blocked` or `approval_required`, not synthetic success.

## 6. Repository layout to create

```text
governance/agent-system/
  README.md
  taxonomy.json
  contracts/
    agent-loop-contract.v1.schema.json
    agent-run-event.v1.schema.json
    artifact.v1.schema.json
    evaluation.v1.schema.json
    repair-directive.v1.schema.json
    effect-record.v1.schema.json
    approval-record.v1.schema.json
    continuation-packet.v1.schema.json
    outcome-packet.v1.schema.json
    knowledge-context.v1.schema.json
    knowledge-receipt.v1.schema.json
  policies/
    authority-boundaries.json
    evidence-levels.json
    terminal-states.json
    retry-budgets.json
  loops/
    research.v1.json
    product-definition.v1.json
    implementation.v1.json
    ux-creation.v1.json
    security-authority.v1.json
    incident-repair.v1.json
    release-outcome.v1.json
  evals/
    suites/*.json
    cases/golden/*.json
    cases/adversarial/*.json
    cases/regression/*.json
    rubrics/*.json

scripts/agent-system/
  cli.mjs
  validate.mjs
  contract.mjs
  ledger.mjs
  effects.mjs
  approvals.mjs
  runner.mjs
  evaluator.mjs
  outcome.mjs
  metrics.mjs
  redact.mjs
  adapters/
    exact-source.mjs
    repo-graph.mjs
    kgv2.mjs
    mock-kgv3.mjs
  tests/*.test.mjs

artifacts/agentops/outcomes/
  README.md

.github/
  CODEOWNERS
  pull_request_template.md
  workflows/agent-governance.yml

docs/adr/0005-portable-agent-outcome-system.md
docs/CHOPDOT_OPERATING_LOOPS.md
docs/CHOPDOT_LOOP_RUNNER.md
CLAUDE.md
```

`output/agent-runs/` is added to `.gitignore`. No run trace, prompt, credential,
receipt, personal content, or secret is committed. Accepted outcome packets
must pass the redaction policy before promotion into `artifacts/`.

## 7. Core contracts

### 7.1 Agent Loop Contract V1

Every non-trivial run SHALL declare:

- `contract_version`, `run_id`, `created_at`, `created_by`;
- `loop_profile`, `task`, `intent_type`, `requirement_ids`;
- `artifact_contract`: type, required paths, format, version, hash rules;
- `expected_outcome`: plain statement plus objective assertions;
- `scope`: exact root, branch, starting HEAD/tree, in/out paths;
- `authority`: allowed reads/writes/tools/external effects and required approvals;
- `context`: governing source identities, freshness limits, conflict policy;
- `architecture`: deterministic, single-agent, workers, or evaluator-optimizer;
- `budgets`: iterations, retries, wall time, tool calls, model cost, external cost;
- `evaluator`: deterministic commands, rubrics, reviewer independence, thresholds;
- `environment_observations`: required real surfaces and readback fields;
- `failure_outcome`: required blocker/failure packet fields;
- `terminal_states`: allowed exits;
- `knowledge_policy`: required read, record, recall, and fallback behavior;
- `privacy_policy`: prohibited content, redaction, retention, and export rules.

The validator SHALL reject subjective outcomes such as “looks good,” “improve
quality,” or “finish the task” unless they are accompanied by assertions and an
evaluator capable of producing pass/fail evidence.

### 7.2 Terminal states

| State | Meaning | Required evidence |
|---|---|---|
| `succeeded` | All required assertions accepted | evaluation, artifact hashes, environment readback, final status |
| `failed_verification` | Artifact exists but required checks failed | failed assertions, commands/counts, repair history |
| `blocked` | Same-level conflict or external condition prevents progress | blocker identity, checks exhausted, safe next action |
| `approval_required` | Next effect exceeds current authority | exact proposed effect, target, impact, rollback/readback plan |
| `budget_exhausted` | Declared iteration/time/tool/cost budget ended | consumption record, best known state, remaining gap |
| `cancelled` | Operator or orchestrator stopped the run | actor, reason, effect reconciliation status |

No unrecognized terminal state may be reported as success.

### 7.3 Run event and checkpoint

`events.jsonl` is monotonically sequenced. Each line contains `run_id`,
`sequence`, `event_id`, `event_type`, `timestamp`, `actor`, `previous_digest`,
`payload_digest`, and `event_digest`. Required events include:

`declared`, `preflight_passed`, `preflight_failed`, `work_started`,
`observation_recorded`, `artifact_recorded`, `evaluation_started`,
`evaluation_finished`, `repair_directed`, `approval_requested`,
`approval_recorded`, `effect_planned`, `effect_dispatched`, `effect_read_back`,
`checkpointed`, and `terminated`.

Resume SHALL verify the digest chain, rebuild the snapshot, reconcile unfinished
effects, and refuse work if the same run has an unexpired active lease.

### 7.4 Effect record

Every effect SHALL record:

- exact type, target, normalized parameters, scope, risk, and expected change;
- deterministic `idempotency_key` derived from run, requirement, effect type,
  target identity, and intended payload digest;
- authority source and approval ID/expiry when required;
- `planned`, `approved`, `dispatching`, `observed`, `verified`, `failed`, or
  `unknown_needs_reconciliation` state;
- before/after readback and rollback or forward-repair strategy.

If a process dies after dispatch and before readback, resume SHALL reconcile
the environment before retrying. It may not redispatch an unknown effect.

### 7.5 Evaluation and repair

An evaluation contains assertion IDs, evidence level, command or rubric,
candidate identity, exact pass/fail counts, evaluator identity/version,
independence status, and cited artifacts. A repair directive names:

- failed assertion;
- evidence that falsified the prior result;
- changed hypothesis or implementation target;
- allowed paths/effects;
- remaining iteration budget;
- required regression scope.

Repeating the same operation without a changed hypothesis is recorded as a
consumed retry and cannot be called progress.

### 7.6 Outcome and continuation packets

The accepted `OutcomePacketV1` includes contract/run IDs, root, branch, starting
and ending commit/tree/status, requirement disposition, artifact hashes,
evaluation summary, effect reconciliation, approvals, evidence index,
limitations, terminal state, and knowledge receipts.

The `ContinuationPacketV1` includes the same exact identity fields plus open
requirements, last safe checkpoint, unresolved conflicts, failed hypotheses,
remaining budget, pending approvals/effects, and the single next bounded task.

## 8. Specialized agent loops

Each profile below is a configured use of the same core runner, not a separate
authority system.

### 8.1 Research Agent Loop

- **Creates:** `ResearchDecisionPacketV1` with question, source catalog,
  primary evidence, claims, citations, disagreements, uncertainty, and decision
  implications.
- **Expected outcome:** every material claim is supported by an admissible
  primary source or labelled inference/unknown; the catalog answers the scoped
  question and records coverage limits.
- **Evaluator:** citation resolver, source-identity/freshness checks, claim-to-
  citation coverage, counterevidence review, and independent synthesis review.
- **Default budget:** two creator iterations and one independent recheck.
- **Failure output:** unsupported claims, missing source classes, inaccessible
  evidence, conflicts, and the smallest research step that would change the
  decision.
- **Stop:** no “extensive” or “complete” claim without a declared universe and
  measurable coverage.

### 8.2 Product Definition Agent Loop

- **Creates:** accepted Cockpit card/spec with user journey, one next action,
  product score, SHALL requirements, GIVEN/WHEN/THEN cases, authority/privacy/
  failure boundaries, screenshot acceptance, and evidence plan.
- **Expected outcome:** score at least 8/10, no product-law conflict, each
  requirement maps to a scenario and proof method, and scope is implementable
  without hidden architecture changes.
- **Evaluator:** product judgment plus engineering feasibility and conflict
  validator; founder approval when product law or strategy changes.
- **Default budget:** two author revisions.
- **Failure output:** rejected assumptions, unresolved product decision,
  missing failure path, or explicit founder decision request.

### 8.3 Implementation Agent Loop

- **Creates:** a bounded patch, tests, documentation-impact result, evidence
  packet, and clean logical commit candidate.
- **Expected outcome:** all declared requirements pass focused tests and the
  production entrypoint where applicable; no unrelated paths; no authority,
  privacy, or release regression; diff is reviewable.
- **Evaluator:** schema/static checks, focused tests, regression suite, diff
  review, environment observation, and independent reviewer for critical code.
- **Default budget:** three repair iterations; scope expansion requires a new
  contract.
- **Failure output:** exact failing assertions/tests, partial artifact hashes,
  dirty-path attribution, and continuation packet.

### 8.4 UX Creation Agent Loop

- **Creates:** implemented real screens, interaction states, screenshot set,
  accessibility evidence, and user-journey acceptance report.
- **Expected outcome:** one obvious next action; first/action/error/recovery/
  after states work through `src/main.tsx` at required mobile/desktop sizes;
  normal language contains no infrastructure diagnosis; required accessibility
  assertions pass.
- **Evaluator:** production-entrypoint Playwright, visual validator, product
  judgment, accessibility audit, and independent real-screen review.
- **Default budget:** two design/repair rounds after the first rendered review.
- **Failure output:** annotated screens, failed journey step, viewport/actor,
  severity, and precise correction target.

### 8.5 Security and Authority Review Loop

- **Creates:** threat-boundary review, findings with severity and exploit path,
  authority-delta map, verification evidence, and accept/hold verdict.
- **Expected outcome:** zero unresolved critical/high findings in affected
  authority, money, membership, recovery, privacy, credential, release, or
  supply-chain boundaries; all claims bounded by evidence.
- **Evaluator:** independent security owner; the author cannot close their own
  critical package.
- **Default budget:** two owner repair cycles, followed by independent recheck.
- **Failure output:** finding IDs, affected assets/actors/files, reproduction,
  impact, required remediation, and blocked promotion state.

### 8.6 Incident Repair Agent Loop

- **Creates:** incident packet, reproduction, source-vs-environment diagnosis,
  repair, regression case, and live readback when authorized.
- **Expected outcome:** the reported failure is reproduced or explicitly marked
  observation-only; the originating defect is repaired; the exact path passes
  locally and on the affected surface; no immutable candidate is silently
  changed or retried into success.
- **Evaluator:** incident assertions, source/candidate identity, original
  reporter evidence when available, local regression, and independent live
  verification.
- **Default budget:** three changed hypotheses. Three identical blockers end in
  `blocked` with a packet.
- **Failure output:** disproved hypotheses, unreconciled environment state,
  current user impact, workaround boundaries, and next authority needed.

### 8.7 Release Outcome Loop and Pipeline

- **Creates:** clean immutable candidate, release manifest, deterministic build,
  CAR/CID or equivalent artifact identity, stage/promote/readback evidence,
  ownership result, rollback identity, and separate user-proof status.
- **Expected outcome:** the exact same reviewed bytes are staged and promoted;
  all required surfaces read back the expected build/CID/owner; live smoke and
  user acceptance are reported independently.
- **Evaluator:** deterministic rebuild, release tooling, real-host readback,
  security/privacy checks, independent release reviewer, and real participants
  for `user_proven`.
- **Budget:** one promotion attempt per immutable candidate. A source or byte
  failure requires a new commit and candidate, never a retry-labelled pass.
- **Failure output:** last known safe release, exact failed stage/surface,
  candidate identity, rollback/forward-fix choice, and approval requirement.

## 9. Knowledge Context Port

The permanent interface is named `KnowledgeContextPortV1`. It SHALL expose:

```text
health()
  -> backend, backend_version, runtime, capabilities, active_read_path,
     fallback_status, freshness, warnings

read_context(scope, question, authority_policy)
  -> facts, citations, cited_source_identities, freshness, confidence,
     backend, backend_version, active_read_path, fallback_status, stale_reasons

record_outcome(outcome_packet)
  -> accepted, rejected_reasons, durable_record_id, stored_packet_digest,
     stored_artifact_digests, backend, backend_version

verify_recall(expected_scope, expected_outcome_digest)
  -> recalled_facts, citations, source_identities, mismatches, stale_reasons,
     backend, backend_version, active_read_path, fallback_status
```

### Required semantics

- Direct repo inspection is a repo fact, not a KG fact.
- A knowledge backend cannot make an outcome implemented, tested, deployed, or
  user-proven.
- `knowledge_verified=true` requires the configured backend's conformance
  policy, exact-root/source citations, accepted outcome digest, and no
  disallowed fallback or stale reason.
- A backend failure may degrade contextual recall but cannot erase local
  evidence. The run reports `knowledge_verified=false` and continues only if
  the contract permits degraded context.
- Adapter swaps require no changes to loop profiles, runner states, evaluators,
  Cockpit semantics, or outcome packets.

### Adapters to build

1. **Exact Source adapter:** deterministic context manifest, file hashes, Git
   identity, and citations. It is the conformance baseline.
2. **Repo Graph adapter:** reads/writes exact-root graph packets and verifies
   root, branch, commit, digest, dirty evidence, and staleness.
3. **KGv2 adapter:** wraps the current AgentOps runtime and maps requested/read
   path, runtime, fallback, facts, citations, and recall fields into the port.
4. **Mock KGv3 adapter:** intentionally different backend/version fixture used
   to prove the core has no KGv2-specific branching.

The plan is not complete until all four pass the same adapter conformance suite.

## 10. Command surface

Add these package commands:

```json
{
  "agent:validate": "node scripts/agent-system/cli.mjs validate",
  "agent:contract:new": "node scripts/agent-system/cli.mjs contract-new",
  "agent:run:start": "node scripts/agent-system/cli.mjs run-start",
  "agent:run:resume": "node scripts/agent-system/cli.mjs run-resume",
  "agent:run:status": "node scripts/agent-system/cli.mjs run-status",
  "agent:run:cancel": "node scripts/agent-system/cli.mjs run-cancel",
  "agent:evaluate": "node scripts/agent-system/cli.mjs evaluate",
  "agent:outcome:promote": "node scripts/agent-system/cli.mjs outcome-promote",
  "agent:knowledge:preflight": "node scripts/agent-system/cli.mjs knowledge-preflight",
  "agent:knowledge:record": "node scripts/agent-system/cli.mjs knowledge-record",
  "agent:knowledge:verify": "node scripts/agent-system/cli.mjs knowledge-verify",
  "agent:eval": "node scripts/agent-system/cli.mjs eval",
  "agent:ci": "node scripts/agent-system/cli.mjs ci"
}
```

Every command SHALL support `--json`, use non-zero exits for failed, blocked, or
malformed states, print the exact root and run ID, and never convert a missing
capability into a green skip. `--dry-run` SHALL be available for effectful
commands and SHALL emit the proposed effect record.

## 11. Integration points

### 11.1 Product Cockpit

- Add optional `agent_run_id`, `outcome_packet`, `evidence_level`, and
  `independent_review` references to checkpoints.
- Do not let run status reprioritize cards or alter product score.
- `product:finish` SHALL reject a referenced outcome packet that is malformed,
  wrong-root, unsuccessful, stale, or missing required evidence.
- Cockpit validation SHALL remain usable when no knowledge backend is online.

### 11.2 Context authority

- Update `product/context-authority.json` only after the ADR and operating docs
  are accepted.
- Rename backend-specific authority language from “Repo Graph/KGv2” to
  “cited knowledge recall,” while preserving exact backend identity in evidence.
- Add freshness and conformance status for the active knowledge adapter.
- Regenerate the wiki read model and hashes in the same logical change.

### 11.3 PR #14 supervision work

Before implementing overlapping governance code, create a reconciliation table
for every PR #14 file. Default decisions:

- retain and adapt the invariant catalog, evidence levels, negative tests,
  exact-head checkout assertion, PR claim-to-evidence table, and provider scan;
- merge its evidence packet fields into `OutcomePacketV1` instead of maintaining
  two incompatible packet types;
- preserve the exact worktree's current `AGENTS.md` read order; do not replace
  it with PR #14's shorter file;
- renumber or supersede PR #14's ADR 0004 because ADR 0004 already governs
  context authority in this worktree;
- fold the supervision workflow into one `agent-governance.yml` required check;
- map its invariant states to evidence assertions, not a competing product
  priority or release truth source;
- close or retarget PR #14 only after the integrated commit has equivalent or
  stronger tests and its author-visible history is preserved.

### 11.4 Agent instruction surfaces

- Keep `AGENTS.md` as portable operating scaffolding and point it to the
  machine command, not duplicated prose.
- Add a minimal tracked `CLAUDE.md` that imports or redirects to `AGENTS.md` and
  contains no independent product/stack claims.
- Reconcile `.cursor/rules` and installed ChopDot skills against the same
  contract. Skills may select a loop profile; they may not redefine terminal
  states, product law, or evidence levels.
- Add an instruction-surface test that extracts required commands and source
  identities from all active agent entrypoints and fails on contradiction.

### 11.5 `.knowns` compatibility

- Treat `.knowns/tasks` as a generated read model file.
- Add a compatibility probe that fails non-zero when a configured tool expects
  a directory, or change the configured target to a supported path.
- Regression-test `ENOTDIR`, missing binary, false exit zero, stale output, and
  conflicting priority behavior.
- The portable agent runner must not depend on the `knowns` CLI.

### 11.6 Release tooling

- Candidate builds SHALL exclude local run ledgers and unredacted traces.
- `release.json` may cite accepted outcome packet digests and evaluator results.
- Release commands must verify no unknown or unreconciled effect exists for the
  candidate run.
- Knowledge recording occurs after the accepted commit and immutable readback;
  it cannot modify candidate bytes.

## 12. CI and repository enforcement

Create `.github/workflows/agent-governance.yml` with exact-head checkout and
these required jobs:

1. **Agent contract:** schemas, profiles, policy references, instruction-surface
   consistency, and negative fixtures.
2. **Agent runner:** ledger, resume, leases, corruption, budgets, effects,
   approval, cancellation, and redaction tests.
3. **Knowledge adapters:** conformance suite for exact-source, Repo Graph, KGv2
   fixture/runtime preflight, and mock KGv3.
4. **Repo governance:** context, Cockpit, wiki, invariant catalog, PR
   claim-to-evidence, provider independence, and exact candidate identity.
5. **Application fast assurance:** typecheck, build, focused Node suite, and
   security baseline appropriate to the changed paths.
6. **Release enforcement:** manual/approved job only; it may not report green
   when release evidence is absent.

### Branch/ruleset target

After the workflow is green on the integration branch and the user explicitly
approves the GitHub mutation:

- protect `main` and the active release branch;
- require pull requests and the named agent-governance checks;
- require conversation resolution and fresh approval after critical changes;
- prevent force push and deletion;
- require CODEOWNERS review for product law, governance schemas, security,
  money, membership, recovery, release, and workflows;
- read the settings back through GitHub API and record the ruleset identity.

Until readback proves enforcement, `ci_enforced=false` and
`branch_protected=false` even if the workflow file exists.

## 13. Evaluation system

### Evaluation dimensions

Every material run grades both the artifact and the trajectory:

- outcome correctness and requirement coverage;
- exact root, branch, commit/tree, and authority use;
- tool choice, parameter correctness, ordering, and least privilege;
- observation of the real environment rather than source-only inference;
- approval and external-effect discipline;
- retry quality and changed hypotheses;
- evidence strength, citations, hashes, and redaction;
- handoff/resume completeness;
- time, tool calls, model cost, human interventions, and context size;
- regression and escaped-defect results.

### Initial eval suites

| Suite | Required cases | Objective outcome |
|---|---|---|
| Hydration | exact worktree, wrong checkout, dirty paths, stale hash, same-level conflict | wrong/stale/conflicting context never enters execution |
| Contract | missing artifact, subjective outcome, no evaluator, unbounded retry, missing authority | validator rejects every malformed fixture |
| Durable run | crash before/after checkpoint, corrupt line, stale lease, compaction, resume | state rebuilds or fails closed without lost/duplicated work |
| Effects | duplicate request, expired approval, crash after dispatch, mismatched readback | no blind redispatch; unresolved effects block success |
| Knowledge | KGv2 healthy, fallback, stale packet, cross-root citation, mock KGv3 | core semantics identical; bad recall keeps `knowledge_verified=false` |
| Product | conflicting card, score below 8, missing failure path | no implementation loop starts |
| Implementation | false green, skipped test, unrelated dirty file, failing production path | outcome cannot promote beyond evidence |
| UX | selector pass but broken screen, dashboard first screen, mobile overflow, missing label | visual/accessibility evaluator rejects |
| Security | self-review, secret in artifact, authority expansion, unreviewed external effect | critical package remains blocked |
| Incident | screen-only report, immutable candidate retry, third identical hypothesis | evidence boundary and blocker semantics remain honest |
| Release | different rebuilt bytes, wrong CID/owner/genesis, partial gateway, missing user proof | release dimensions remain independently false |

### Promotion thresholds

- Deterministic validators: 100% of golden and adversarial cases pass.
- Core run/effect invariants: 100% pass across at least 100 randomized event
  sequences and all interruption points.
- Specialized loop pilots: all required assertions pass in three fresh runs;
  report pass@1 and consistency, not only best-of retries.
- No unresolved critical/high finding in runner, authority, evidence,
  knowledge-port, CI, or release integration.
- No false-green fixture may exit zero.

Metrics are useful only with their suite, version, candidate SHA, environment,
and sample count.

## 14. Ordered implementation waves

Each wave follows:

```text
verify exact state
-> activate this plan package
-> implement bounded files
-> focused positive and negative tests
-> independent review where required
-> repair within budget
-> regression
-> documentation impact
-> logical commit
-> outcome packet
-> knowledge record and recall verification when configured
```

### Wave 0 — Reconcile and lock one governance design

**Build/create**

- write ADR 0005 and the taxonomy manifest;
- inventory current loop documents, AgentOps bridges, skills, instruction
  surfaces, `.knowns`, PR #14, and any competing governance branch;
- create the PR #14 file-by-file disposition table;
- choose one canonical evidence-level vocabulary and one packet family;
- declare ownership and CODEOWNERS targets.

**Integrate**

- leave P-035 and `PRODUCT_TRUTH.md` unchanged;
- route current process docs to the new taxonomy without yet removing history;
- resolve the ADR 0004 collision and AGENTS read-order conflict.

**Expected outcome**

One accepted ADR and manifest define Agent Loop, Gate, Pipeline, Adapter, and
Flywheel; every existing governance artifact has keep/merge/supersede/archive
disposition; no same-level conflict remains.

**Proof**

`context:validate`, taxonomy validator, PR #14 disposition completeness, exact
source hashes, and independent architecture review.

**Failure/stop**

Any unresolved product-law, evidence-level, instruction, or PR ownership
conflict ends the wave `blocked`. Maximum two reconciliation revisions.

### Wave 1 — Build contracts and fail-closed validation

**Build/create**

- all V1 schemas, policy catalogs, seven loop-profile files, validators, and
  positive/negative fixtures;
- normalized digests and stable canonical JSON serialization;
- command exit/status conventions and `--json` output.

**Integrate**

- add `agent:validate` and `agent:contract:new`;
- validate references among profiles, schemas, policies, evaluators, and
  knowledge requirements.

**Expected outcome**

A missing artifact, expected outcome, evaluator, authority, evidence rule,
budget, failure packet, or terminal state is rejected deterministically.

**Proof**

100% golden/adversarial schema cases; snapshot tests for canonical digests;
non-zero exits for every malformed fixture. Two repair iterations.

### Wave 2 — Build durable execution and effect safety

**Build/create**

- append-only event ledger, digest chain, snapshot reducer, checkpoints,
  leases, resume, cancel, and budget counters;
- effect/approval ledger, idempotency keys, dispatch/readback reconciliation;
- artifact hashing, evidence index, redaction, outcome and continuation packets.

**Integrate**

- add run start/resume/status/cancel and outcome promotion commands;
- add ignored runtime path and candidate exclusion checks.

**Expected outcome**

An interrupted run resumes to the same derived state; corrupted or conflicting
state fails closed; an unknown external effect is reconciled before any retry;
no sensitive runtime trace enters the candidate.

**Proof**

All interruption-point tests, 100 randomized sequences, duplicate effect and
expired approval cases, artifact/redaction scan, and independent security
review. Maximum three implementation repair iterations.

### Wave 3 — Build evaluators and the regression flywheel

**Build/create**

- deterministic command evaluator, rubric evaluator contract, reviewer
  independence check, trajectory grader, metrics aggregator, and suite runner;
- initial golden, adversarial, and regression case library;
- conversion command from accepted incident/failure packet to proposed
  regression case, requiring review before suite inclusion.

**Integrate**

- add `agent:evaluate` and `agent:eval`;
- make outcome promotion depend on required evaluator acceptance;
- connect critical invariant IDs from the reconciled supervision catalog.

**Expected outcome**

The same candidate/evidence produces the same deterministic verdict; critical
self-review is rejected; false green, skipped, and ancestor-dependency cases
fail; metrics include sample and suite identity.

**Proof**

All initial suites pass, negative cases return non-zero, and an independent
reviewer reproduces the result. Two repair iterations.

### Wave 4 — Build all seven agent-specific loop profiles

**Build/create**

- profile-specific artifact templates, assertions, evaluator composition,
  evidence levels, budgets, stop states, and example contracts;
- one golden and at least two adversarial end-to-end cases per profile.

**Integrate**

- connect Product Definition to Cockpit card/checkpoint formats;
- connect Implementation/UX to focused and production-entrypoint commands;
- connect Security to invariant/finding evidence;
- connect Incident to live-failure and regression packets;
- connect Release to immutable-candidate and readback tooling.

**Expected outcome**

Each profile can start, produce its declared artifact, be independently or
deterministically evaluated, repair within budget, and terminate with a valid
outcome or continuation packet.

**Proof**

Three fresh pilot runs per profile, reported as pass@1 and final pass rate;
every adversarial case rejected. Maximum two profile repairs after core is
stable.

### Wave 5 — Build the portable Knowledge Context Port

**Build/create**

- port schemas, capability negotiation, health/preflight, record, and recall
  verification;
- exact-source, Repo Graph, KGv2, and mock KGv3 adapters;
- common conformance suite and backend receipts.

**Integrate**

- replace core references to KGv2/Repo Graph with port calls;
- retain backend/version/runtime/read-path/fallback facts in receipts;
- add knowledge commands and degraded-mode policy.

**Expected outcome**

Switching from KGv2 to mock KGv3 changes only adapter configuration; the same
contract, run, evaluation, and outcome packet remain valid. Cross-root, stale,
fallback, or uncited recall cannot set `knowledge_verified=true`.

**Proof**

All adapters pass one conformance suite; a recorded accepted packet is recalled
with its exact digest and citations; deliberate cross-root and fallback cases
fail. Three adapter repair iterations because external runtime mismatches are
plausible; repeated external blockers produce a blocker packet.

### Wave 6 — Integrate Cockpit, context, instructions, knowns, and release

**Build/create**

- Cockpit outcome references and validation;
- context-authority adapter metadata;
- portable `CLAUDE.md`, reconciled AGENTS/rules/skill routes;
- `.knowns` compatibility probe;
- release candidate exclusion and outcome-digest checks;
- updated wiki source, generated read model, loop docs, and runner commands.

**Expected outcome**

All active agent entrypoints resolve the same product law, priority source,
loop contract, terminal states, and commands; no stale stack or provider claim
survives; a broken knowns or knowledge tool is visible and non-green; release
bytes exclude run state.

**Proof**

Instruction-surface tests, context/Cockpit/wiki validation, candidate file
manifest, knowns negative fixtures, and independent documentation audit. Two
repair iterations.

### Wave 7 — Integrate CI and enforce merge boundaries

**Build/create**

- reconciled PR template, CODEOWNERS, exact-head workflow, job summaries, and
  artifacts;
- local `agent:ci` parity command;
- branch/ruleset change packet and readback script.

**Integrate**

- reuse the strong exact-head, evidence, and invariant tests from PR #14;
- remove duplicate checks and contradictory workflow authority;
- push the integration branch and verify pull-request runs.

**Expected outcome**

Malformed contracts, false evidence promotion, wrong candidate identity,
failing runner/adapters, and critical unreviewed changes cannot merge. After
explicit approval, GitHub itself requires those checks.

**Proof**

Green exact-head PR run, deliberate negative PR fixture, ruleset API readback,
and CODEOWNERS review. `branch_protected` remains false until readback. Two
workflow repair iterations; external GitHub outages end in `blocked`.

### Wave 8 — Pilot in real ChopDot work

Run one real bounded package through each relevant loop without using the
current product release as a disposable fixture:

1. research: refresh one contested platform-capability question;
2. product definition: refine an existing Cockpit card without reprioritizing;
3. implementation: a small non-critical correction with focused tests;
4. UX: one current real-screen defect with mobile/desktop evidence;
5. security: independent review of the runner/effect boundary;
6. incident: one historical live failure converted into a regression case;
7. release: dry-run candidate pipeline first, then real release only under its
   own active plan and action-time approval.

**Expected outcome**

Agents can use the contracts without infrastructure coaching; packets are
useful for resume/review; costs and friction are measured; no product work is
lost to process ceremony.

**Proof**

Seven accepted or honestly blocked packets, operator review, metrics, and at
least one compaction/handoff/resume demonstration. A profile that needs manual
interpretation not encoded in its contract returns to Wave 4.

### Wave 9 — Independent acceptance and adoption

**Build/create**

- final architecture, security, usability, and documentation audit;
- migration/rollback guide;
- deprecation notices for old loop names and KGv2-specific core language;
- baseline metrics report and maintenance ownership schedule.

**Integrate**

- make the system the default for new material agent packages;
- retain an escape hatch for trivial deterministic work;
- archive historical documents from default routing without deleting history;
- record the accepted outcome through the Knowledge Context Port and verify
  recall with exact citations.

**Expected outcome**

The repo has one coherent, executable agent operating system; every active
agent entrypoint uses it; adapters can be replaced; objective outcomes and stop
states are enforced; product priority and product law remain untouched.

**Proof**

Independent review, all CI/eval suites green, branch settings read back,
adapter-swap proof, successful real pilots, documentation consistency scan, and
knowledge recall verification. Adoption requires one week or five material
runs without an escaped false completion, whichever is later.

## 15. Verification matrix

The implementation is not complete until these classes are executed on the
exact candidate.

### Static and schema

- JSON parse/schema/reference/version validation;
- canonical serialization and digest fixtures;
- instruction-source consistency;
- secret/path/provider scans;
- `npx tsc --noEmit` and `npm run build` for application regression.

### Durable execution

- start, checkpoint, resume, terminate, cancel;
- crash before and after each event/effect phase;
- corrupt, truncated, duplicated, and out-of-order ledger records;
- stale/live lease and concurrent writer;
- budget and approval expiry;
- artifact change after evaluation;
- compaction/continuation packet equivalence.

### Effects and authority

- unauthorized target, overbroad scope, and expired approval;
- duplicate idempotency key with same and different payload;
- dispatch success/readback loss;
- dispatch failure with partial external state;
- rollback unavailable and forward repair;
- credential/redaction leak;
- external state changed by another actor.

### Knowledge portability

- healthy, fallback, and unavailable backend;
- correct and wrong root/branch/commit;
- source citation missing, stale, or from another checkout;
- recorded digest mismatch;
- KGv2 and mock KGv3 result normalization;
- no backend-specific code path outside adapters.

### Agent outcomes

- every profile's golden path;
- every declared failure, blocked, approval, and budget exit;
- critical self-review denial;
- false-green, skipped, and flaky retry;
- real environment disagreeing with source;
- unrelated dirty paths;
- handoff and independent re-evaluation.

### Repository and release

- PR exact-head identity;
- workflow permissions and artifact retention;
- required-check/ruleset readback;
- clean dependency isolation;
- deterministic build and candidate exclusion;
- immutable stage/promote identity and ownership readback when authorized.

## 16. Evidence and metrics

Every wave emits a redacted evidence index containing:

- root, branch, starting/ending HEAD/tree, and complete status;
- requirements and assertions with disposition;
- commands, environment, exit codes, exact pass/fail/skip counts;
- artifacts, hashes, screenshots where applicable, and reviewer identity;
- iterations, changed hypotheses, retries, tool calls, wall time, model cost if
  available, human interventions, and external effects;
- known gaps and completion verdicts;
- backend/runtime/read path/fallback and exact citations for knowledge receipts.

Program-level metrics:

- pass@1 and final pass rate by loop profile;
- false-success and escaped-defect count;
- median iterations and time to accepted outcome;
- resume success and unreconciled-effect count;
- percentage of material runs with valid outcome packets;
- citation coverage and stale/cross-root recall rate;
- human approval/intervention rate;
- CI rejection causes and regression recurrence;
- context bytes, tool calls, and cost per accepted outcome.

Targets are baselined during Wave 8. No numerical target is invented before a
measured baseline except the zero-tolerance correctness gates already stated.

## 17. Logical commits

Keep slices reviewable and do not mix product feature work into them:

1. `docs: decide portable agent outcome architecture`
2. `feat: validate agent loop contracts`
3. `feat: add durable agent run and effect ledger`
4. `feat: add evaluators and regression suites`
5. `feat: add specialized agent loop profiles`
6. `feat: add portable knowledge context adapters`
7. `chore: integrate cockpit instructions and release evidence`
8. `ci: enforce agent governance and exact candidate evidence`
9. `test: prove real agent-loop pilots and adapter portability`
10. `docs: complete adoption and migration evidence`

Each commit gets its own exact-candidate outcome packet. Push and PR mutation
occur only after the corresponding local gate passes.

## 18. Migration and rollback

### Migration

- Do not delete old documents on first adoption. Mark their type and
  supersession, remove them from default routing, and preserve history.
- Map existing Cockpit checkpoints and evidence into outcome references without
  rewriting append-only history.
- Import only validated PR #14 slices; preserve its commit/PR provenance in the
  reconciliation record.
- Keep KGv2 operational through its adapter while the core moves to portable
  names. A later KGv3 adapter is additive.

### Rollback

- Runner adoption is reversible by removing the npm/CI routes; product runtime
  and participant data are unaffected.
- V1 schemas and accepted outcome packets remain readable after rollback.
- Branch protection changes require a recorded prior ruleset and readback; any
  rollback is another explicit external mutation.
- Never roll back by weakening evidence thresholds or relabelling failures.

## 19. Documentation impact

This is a material agent-workflow, testing, security, release, and knowledge
architecture change. It requires updates to:

- `docs/adr/0005-portable-agent-outcome-system.md`;
- `docs/CHOPDOT_OPERATING_LOOPS.md`;
- `docs/CHOPDOT_LOOP_RUNNER.md`;
- `AGENTS.md`, a minimal tracked `CLAUDE.md`, and relevant `.cursor/rules`;
- ChopDot product/engineering/frontend skills that invoke these processes;
- the context-authority manifest and wiki source/read models;
- PR/invariant/evidence governance reconciled from PR #14;
- release evidence documentation.

`PRODUCT_TRUTH.md` must not change for this work. If implementation discovers a
real product-law decision, stop and create a separate founder decision rather
than smuggling it into process tooling.

## 20. Risks and controls

| Risk | Control |
|---|---|
| Process becomes heavier than the work | trivial deterministic exemption; measure time/context/tool overhead in pilots |
| A second governance authority appears | one ADR, taxonomy, packet family, and validator; reconcile PR #14 first |
| KGv2 becomes permanent coupling | stable port plus mock KGv3 adapter conformance |
| Agent claims success from source only | environment observations and evidence levels are required assertions |
| Retried external effect duplicates | idempotency, unknown-state reconciliation, no blind redispatch |
| Run ledger leaks secrets | ignored local storage, redaction gate, candidate exclusion, and secret scan |
| Self-review approves critical changes | independent evaluator identity and CODEOWNERS requirement |
| CI exists but is advisory | separate `ci_enforced` and branch-protection API readback |
| Historical docs tug agents backward | authority manifest, supersession, instruction-surface tests |
| Provider/framework churn | provider metadata only in adapters; contracts and packets remain stable |
| Metrics are gamed | preserve raw case/version/sample evidence and track escaped defects |

## 21. Hard stops

Stop the affected wave when:

- product law or current Cockpit priority would be changed implicitly;
- PR #14 or another active branch creates an unresolved same-level conflict;
- a loop lacks an objective expected outcome, evaluator, failure packet,
  authority boundary, retry budget, or terminal state;
- a knowledge backend is treated as product or release authority;
- a backend/provider name leaks into core contract semantics;
- a corrupt ledger, unknown effect, wrong root, stale approval, or cross-root
  citation is accepted;
- critical work is self-approved;
- a skipped, flaky retry, missing tool, or false exit zero is called pass;
- CI is claimed enforced without repository-settings readback;
- release or external mutations proceed without their action-time approval;
- accepted evidence contains credentials, reusable secrets, personal receipts,
  or unredacted private content.

## 22. Product and engineering judgment

### Product gate

Not applicable as a user-facing feature gate. This plan changes agent
infrastructure and must remain invisible to ChopDot users. Any pilot that
changes UI requires its own active Cockpit card, product score, journey, and
real-screen review.

### Engineering judgment

**Facts:** the exact worktree has strong prose guardrails and passing context,
Cockpit, and wiki validators, but no executable agent-loop contracts, runner,
durable state, evaluator harness, or tracked CI. `main` is unprotected. PR #14
contains useful but conflicting supervision work.

**Inference:** adding more prose would amplify the documentation problem. The
smallest architecture that satisfies predictable agent outcomes is a
deterministic contract/ledger/evaluator core with configured loop profiles and
replaceable knowledge adapters.

**Assumptions:** Node ESM and JSONL are sufficient for initial local concurrency
and run volume; external orchestrators remain optional. Wave 8 measures whether
that assumption holds. If concurrency, retention, or query needs exceed the
file ledger, implement a storage adapter without changing packet semantics.

**Risk:** the main danger is a parallel governance system that agents must
interpret manually. Reconciliation, one packet family, executable validation,
and independent pilots are the acceptance boundary.

## 23. Final acceptance

The plan is achieved only when all of the following are true:

- all V1 contracts, runner, ledger, effects, evaluator, profiles, adapters, and
  CLI commands exist and pass their positive/negative suites;
- interruption/resume and unknown-effect reconciliation are proven;
- every loop profile has completed real pilots with objective outcome packets;
- KGv2 and mock KGv3 pass one port conformance suite without core changes;
- Cockpit, context, instructions, knowns, evidence, and release tooling use one
  coherent vocabulary and packet family;
- useful PR #14 controls are integrated and competing parts are explicitly
  superseded or closed;
- CI passes on the exact PR head and required checks are enforced by read-back
  repository rules;
- documentation and generated views are current;
- independent product, engineering, security, and operator reviews accept the
  system;
- the adoption period completes without an escaped false-success claim;
- the accepted outcome is recorded and recalled through the active knowledge
  adapter with exact-root citations.

Until then, report the individual completion verdicts rather than saying the
agent-loop system is “done.”
