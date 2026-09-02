# ChopDot portable agent outcome system

**Kind:** operating architecture
**Status:** executable router and outcome system implemented locally; remote adoption remains evidence-gated
**Owner:** agent-systems integrator
**Independent assurance owner:** product assurance
**Last reviewed:** 2026-08-31
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

## Complete steering-surface registry

`steering-surface-registry.v1.json` is the intentional source registry for
everything known to shape an agent's ChopDot decisions or execution: product
authority, decision records, methods, profiles, schemas, rubrics, policies,
executors, hooks, workflows, generated context, machine-local skills, external
agents, knowledge bridges, and runtime-injected classes. Its purpose is to make
cognitive influence visible, owned, lifecycle-bound, and reviewable. It is not
a second product cockpit and cannot choose what ChopDot should build.

The registry covers **agent instruction and control surfaces only** — the files
an agent obeys. It is deliberately not an inventory of ChopDot documentation.
Editing an ordinary document under `docs/`, `product/`, `proof/` or `plans/`
does not rebuild a governance artifact; changing `AGENTS.md`, `CLAUDE.md`,
`PRODUCT_TRUTH.md`, a tracked judgment method, or an agent policy does.

Drift is detected two ways, both from the registry itself:

- **Content** — each group pins `trusted_manifest_sha256`. A mismatch means an
  instruction changed without the registry acknowledging it. The registry is
  excluded from every group manifest, since a file cannot contain its own hash.
- **Discovery** — a file under a declared root that no group claims is an
  undeclared steering surface.

The monitor in `scripts/agent-governance/steering-surfaces.mjs` also writes two
read models. Both are **derived, not durable evidence**: they build into the
gitignored `.governance-build/` directory and upload as CI artifacts.

- `.governance-build/steering-surface-catalog.v1.json` — the path, kind,
  lifecycle, owner, activation mode, and SHA-256 census;
- `.governance-build/STEERING_SURFACE_HEALTH.md` — the human-readable
  aggregate, lifecycle, and expected-verdict view.

Machine-local material (`.claude/`, `.cursor/`, `.agents/`, `.local-private/`)
is never inventoried here and is never required for normal repository
operation.

Run:

```bash
npm run agent:steering:report
npm run agent:steering:check
```

Use `npm run agent:steering:build` only after an intentional registry or
steering-source change, then review both generated diffs and rerun the check.
Check mode is read-only and must never rewrite authority to make itself pass.

The monitor's outcomes are deliberately bounded:

- `pass` — the registry, catalog, hashes, framework/profile bindings, freshness,
  and required local identities are coherent;
- `degraded` — only optional unavailable or deliberately guarded/degraded
  surfaces remain, and their IDs are explicit;
- `blocked` — schema or semantic validation failed, a controlled file is
  uncatalogued, a generated output is stale, a required surface is missing, an
  external digest changed, or the registry review is overdue.

None of these outcomes proves product correctness, implementation, testing,
deployment, reachability, ownership, or live-user acceptance. A passing
catalog says that the declared steering system is internally accounted for;
the applicable product and release gates still decide their own claims.

Machine-local and cross-root surfaces are never silently treated as current
worktree truth. Quarantined or retired surfaces have activation disabled. An
optional missing surface appears as unavailable/degraded rather than making a
portable clone unusable. The canonical-checkout AgentOps context and the two
AutoBots ChopDot agents currently remain quarantined and must not be automatic
read or execution routes.

## Definition framework versus profile

The portable
`frameworks/evidence-bound-definition-loop.v1.json` defines the generic
Evidence-Bound Definition Loop. It requires a decision target, authoritative
inputs, observable expected outcome, evaluation criteria, proving evidence,
failure/blocker behavior, owner/authority, and retry/exit rule. It structures
how an answer is defined and verified; it must not supply the answer, product
law, priority, taste, approval, or release verdict.

`profiles/experience-definition.v1.json` is the Experience Definition profile
over that framework. It selects domain-specific outputs and evidence for
people, jobs, permissions, information architecture, navigation, states,
brand, interaction, responsive behavior, accessibility, and real-screen
review. It must not turn one earlier product choice—such as a home pattern,
dashboard prohibition, or universal first action—into a reusable method rule.
Other domains should add their own profiles while keeping the framework
unchanged.

## Lifecycle, upgrade, and retirement

Every registered surface declares an accountable owner, allowed and forbidden
influence, activation mode, lifecycle, expected outcome, evidence, failure
behavior, and retry/exit condition. Lifecycle changes are reviewed source
changes, never monitor side effects:

1. `candidate` surfaces remain explicit-only until their intended outcome and
   evidence are reviewed.
2. `active` surfaces may activate only through their declared route.
3. `degraded` surfaces stay bounded while an owner records the limitation and
   repair or replacement.
4. `quarantined`, `superseded`, and `retired` surfaces have activation disabled;
   historical evidence remains discoverable but cannot steer current work.
5. An upgrade names the changed capability or assumption, supplies new evidence,
   updates compatibility and trusted identity where applicable, regenerates the
   catalog, and passes hostile monitor tests before activation.
6. A retirement disables activation first, records the replacement or reason,
   preserves audit history, and only then advances the lifecycle.

## System shape

```text
operator intent
  -> TaskRouteV1 admission receipt
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

`TaskRouteV1` is an admission receipt, not a sixth taxonomy type. Run it with:

```bash
npm run agent:route -- \
  --output output/agent-routes/<route-id>.json \
  --task-domain implementation \
  --expected-outcome "Produce the bounded verified implementation outcome."

npm run agent:contract:new -- \
  --route output/agent-routes/<route-id>.json \
  --output output/agent-contracts/<run-id>.json \
  --run-id <run-id>
```

`contract-new --route` rejects non-`routed`, stale, wrong-root, or
digest-invalid receipts and forbids a second `--loop-profile` choice. Run
preflight reopens the receipt and compares its digest, candidate identity,
profile, execution mode, agents, skills, expected outcome, evidence gates,
authority boundary, effect types, and budgets with the contract binding.
The runtime also compares `contract.json` with the immutable declared digest
before it plans or dispatches an effect.

| Risk | Default execution | Minimum route proof | Additional boundary |
|---|---|---|---|
| low | deterministic turn | source or unit | independent review only when the selected profile requires it |
| moderate | bounded single-agent package | focused plus integration | screenshots for user-facing work |
| critical | bounded owner plus separate evaluator | exact candidate | approval and readback for mutation or external effect |

The route uses provider-neutral roles (`task-owner`, `independent-evaluator`,
and bounded worker roles). It never hard-codes a contributor or username as
project authority. Skill eligibility comes from the active steering registry;
disabled, quarantined, degraded, or merely platform-injected skills cannot be
selected for acceptance.

For a mutation requiring prior operator authority, the route accepts only a
digest-bound `approval_ref` with human actor, exact root, effect class, source
message/envelope, candidate HEAD/tree, purpose, exact effect types, and expiry.
This is a structured operator attestation: TaskRouteV1 does not authenticate
the claimed human identity or evidence reference, so it is not cryptographic or
independently verified person proof. External effects still require a separate
run-ledger approval record and verified readback. Repository effects
(`commit`, `push`, `pr_create`, `pr_update`) and public/testnet effects are
explicitly selected; a profile template cannot silently grant them.

Routed evidence fields become hard contract assertions. This prevents their
silent omission, while the current generic measurement artifact proves
candidate binding and required evidence fields—not semantic authorship of a
screenshot or production-entrypoint run. Typed media and journey predicates
remain an evaluator responsibility; do not overclaim a status string as visual
or live-user proof.

## Supported Agent Loops

All profiles use the same contract, terminal states, evidence vocabulary, and
packet family.

| Profile | Required artifact | Objective outcome | Critical independent review |
|---|---|---|---|
| Research | cited decision or research packet | every material claim has admissible citations and uncertainty labels | required when a product, security, legal, or release decision depends on it |
| Product Definition | comparative priority verdict plus accepted card/spec/journey | independent first view, contextual action and complete outcome contract; score at least 8/10 as admission only; no product-law conflict; testable scenarios and failure path | product assurance |
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
| unstructured task/process choice | `TaskRouteV1`, then `AgentLoopContractV1` |
| product package loop | Product Portfolio Judgment, then Product Definition, Implementation, and UX Loop composition |
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

## Ownership, identity mode, and CODEOWNERS boundary

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

`project-authority.v1.json` is the repository-owned identity and delegation
profile. Generic runner and verification code consumes its roles and must not
hard-code project usernames. `.github/CODEOWNERS` maps these paths to the human
project owner for routing only; it establishes no reviewer independence.

In `delegated-owner-principal` mode, authorized agents act through the same
GitHub principal as the human project owner. The governed merge boundary uses
the exact-candidate hosted checks and does not invent an impossible self-review
or require an unrelated collaborator. Deterministic evaluator separation is
reported as such, never as independent human review. A future separated bot/App
mode may add owner review if the owner explicitly adopts it. Changing mode is a
governed configuration migration requiring source, workflow, ruleset,
environment, and live readback agreement.

## Adoption boundary

`policies/adoption-boundary.v1.json` is the executable routing policy for
acceptance, not a product-priority source. It defaults tracked repository paths
to governed profiles and requires context, contract, exact-candidate outcome,
runner provenance, external execution, evidence-byte, and knowledge-recall
proof at the applicable Product Cockpit, hosted PR, and release surfaces.

`scripts/agent-governance/adoption-guard.mjs` emits `ContextReceiptV1` and
`AcceptanceReceiptV1`. The tracked pre-push hook provides bounded local
feedback only: exactly one matching ref, a clean checked-out fast-forward
candidate, and governed paths. Steering may be `pass` or a drift-free,
fresh, active-registry `degraded` result whose exact IDs are fully explained by
declared degraded repository/external surfaces or disabled/unavailable optional
external surfaces;
that result remains `local_preflight_degraded`, never pass. The hook never
emits or claims governed acceptance. Product Cockpit, the exact-head hosted
`pr_merge` job, and release enforcement call the acceptance guard; hosted
`pr_merge` alone authoritatively accepts repository code. The guard pins the
reviewed routing-policy digest, derives the
changed-path manifest from the applicable Git range, and requires a hashed
`EvaluationV1`, replayable `RunnerProvenanceV1`, GitHub OIDC execution
attestation, and byte-valid exact-outcome recall backed by a durable cited
record. Ordinary surfaces use contract start through outcome end; PR merge
uses the same-run event-bound pull-request base through candidate head.
A stale legacy release snapshot cannot override a valid exact-candidate recall;
an absent, rejected, stale, cross-candidate, or citation-invalid recall still
fails closed.

PR acceptance generates a real, schema-validated **implementation** verifier
contract at the exact candidate. It is explicitly post-hoc: it does not prove
that the underlying work started from that contract, pretend the CI runner
authored the product work, or fabricate a product, UX, security, research, or
release profile from generic CI checks. Original task-contract lineage is a
separate future-work requirement and cannot be retroactively asserted for this
bootstrap adoption change. Specialized work must arrive with its own aligned
evaluated outcome before that separate claim can be accepted.

Product completion writes the full immutable `AcceptanceReceiptV1` into the
append-only Cockpit checkpoint. Validation re-hashes that receipt, reopens its
cited evidence, replays the digest-chained runner proof, binds it to the
checkpoint candidate and outcome, and requires an exact one-to-one mapping
between every `done` card and one completed checkpoint.

Deterministic evaluator separation proves independent execution, not human
review. Delegated-owner authorization and independent human review are separate
claims; neither may be inferred from a reviewer username. Product, security,
and release review require the evidence declared by the active profile. Files below
`docs/release/` are documentation and historical evidence; editing them is not
a live release effect. The executable release boundary is the protected GitHub
environment plus the release-enforcement workflow and external readback.

## Implementation status

Source implementation and local verification are separate from remote
adoption. The router, runner, contracts, profiles, evaluators, knowledge adapters,
Cockpit integration, workflow validation, and adoption guard exist in this
worktree. They become remotely enforced only when the accepted commit is pushed
and the protected required checks/ruleset are read back against that commit.
They become operationally adopted only when real packages repeatedly produce
governed receipts and escaped-drift cases enter the evaluation suite.

Never infer `branch_protected`, `ci_enforced`, `adopted`, `kg_known`, or any
product/release verdict from these source files alone. Cite the current command,
workflow run, ruleset readback, and exact outcome evidence.

The Phase 1 replay at
`docs/evidence/agent-pilots/2026-08-31-task-route-replays.v1.json` records 37
storage directories, 27 run-named directories, but only 26 contract run IDs
and 26 complete top-level ledgers. Home, authority-key repair, and hosted assurance are classified
retrospectively with Git/PR duration, artifact counts, and confirmed defects.
Tool-call and interruption counts remain explicitly unavailable because those
packages predate native route telemetry; they are not inferred.
