# ChopDot operating loops

**Kind:** guardrail
**Status:** active
**Owner:** product assurance
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** process only; never product law or deployment evidence

The canonical classifications, profiles, evidence levels, and packet family are
defined by `governance/agent-system/taxonomy.json` and ADR 0005. The word
"loop" below always means an agent creation-and-evaluation loop. Gates decide
entry, pipelines preserve ordered identity, adapters implement replaceable
ports, and the evaluation flywheel owns regression cases.

## 1. Context Preflight Gate

```text
resolve Git root/branch/HEAD/status
-> validate product/context-authority.json
-> read product law
-> read Cockpit source and explicit next card
-> read only task-relevant conditional routes
-> label stale, missing, cross-worktree, or conflicting material
-> stop the affected work until same-level conflicts are resolved
```

Rules:

- More documentation is not more authority.
- A generated page, KG fact, old plan, skill, or external checkout cannot
  override the declared source hierarchy.
- A measurement must name when and how it was taken.
- A decision needs date, owner, scope, reason, and falsifier.
- A historical document remains discoverable but leaves the default read path.

Expected outcome:

- one `ContextReceiptV1` bound to the exact root, branch, HEAD, tree, complete
  status, active governing-source hashes, active product card, and current
  knowledge state; and
- verdict `governed`, or an explicit `unverified` blocker that prevents every
  later acceptance surface.

Proving evidence is the schema-valid receipt from
`npm run agent:context:receipt`. The owner is the acting agent or integrator.
Retry is allowed only after the named context mismatch changes. Exit occurs
when the receipt is governed or the task terminates with the blocker.

## 2. Portable Agent Loop contract

Product proof and agent-process proof are different evidence. Before a
non-trivial package, create and validate an `AgentLoopContractV1`:

- task, bounded outcome, requirement IDs, in-scope and out-of-scope work;
- exact root, branch, HEAD, attributed dirty paths, governing sources, and
  unresolved same-level conflicts;
- read, write, external-action, credential, and human-approval boundaries;
- execution architecture: `deterministic`, `single-agent`,
  `parallel-workers`, `orchestrator-workers`, or `evaluator-optimizer`;
- why that is the simplest architecture adequate for the measured task;
- maximum iterations, retries, wall time, tool calls, and external cost when
  any can be material;
- success, failure, blocker, approval, and budget-exhaustion exits;
- baseline checks, focused cases, production-entrypoint proof, and independent
  review owner.

Architecture complexity is earned by evaluation. Parallel work requires
independent file or responsibility ownership and one integration owner. A
retry must change the hypothesis, inputs, or implementation; repeating the
same failed action consumes the declared retry budget but is not progress.

The durable runner records an append-only digest chain under ignored
`output/agent-runs/<run-id>/`. Its disposable snapshot is rebuilt from that
ledger. The agent trajectory is graded separately from the product result:

```text
correct exact root and authority
-> relevant context without hidden competing sources
-> least-privilege tools and correct parameters
-> approval boundaries respected
-> observations checked against environmental truth
-> bounded repair or explicit escalation
-> end-to-end and regression proof
-> clean, cited checkpoint
```

`trajectory_checked` is agent-package evidence. It does not make
`implemented`, `tested`, `promoted`, `reachable`, or `user_proven` true.

### Acceptance adoption gate

`governance/agent-system/policies/adoption-boundary.v1.json` maps every tracked
path to an allowed loop profile and maps each acceptance surface to mandatory
proof. The default disposition is governed. Generated build/output directories
are explicitly non-promotable rather than silently exempt.

```text
fresh ContextReceiptV1
-> applicable AgentLoopContractV1
-> exact-candidate OutcomePacketV1
-> hashed EvaluationV1 whose assertions align exactly with the contract
-> replayable RunnerProvenanceV1 and its digest-chained run directory
-> GitHub OIDC execution attestation with exact-run readback
-> cited evidence bytes re-hash correctly
-> Knowledge Context exact-digest verify-recall receipt
-> canonical Git changed-path manifest from the applicable bound range
-> AcceptanceReceiptV1 = governed
```

The applicable range is contract start through outcome end for ordinary
surfaces. PR merge acceptance uses the pull-request base/head range recorded by
same-run PR evidence; the CI-created acceptance contract is a post-hoc verifier
and is never presented as proof that the original implementation began under
that contract. Runner replay proves independent deterministic execution. Human
or agent product, security, and release review remain separate claims that need
protected evidence outside candidate-authored files.

Expected outcome: a governed product finish, hosted PR merge, or release has one
schema-valid receipt binding the same root, branch, commit, tree, profile,
contract digest, outcome digest, runner provenance, external execution,
evidence hashes, and durable knowledge recall.
Proving evidence: the receipt plus the cited immutable inputs. Failure outcome:
`unverified` with typed reasons and non-zero exit. Owner: release integrator;
the affected profile owner repairs the named failure. Retry only after a cited
input or candidate identity changes. Exit when `governed`, or terminate with a
continuation packet. No prose, retry, hook bypass, or backend substitution can
change the verdict.

The adoption routing policy is schema-validated and pinned by digest in the
guard, so editing policy fields cannot turn off contract, outcome, evaluation,
recall, or exact-candidate requirements. Generic task-start context reports
stale repository knowledge as `unverified`. At acceptance, only a byte-valid
exact-outcome recall with durable source identity can establish current
candidate knowledge; a prose claim or an older release-state snapshot cannot.

The local pre-push loop is deliberately smaller and non-authoritative. It
consumes exactly one Git-supplied same-name, non-default branch update, proves a
clean checked-out fast-forward candidate and governed paths. Steering may be a
`pass`, or a drift-free, fresh, active-registry `degraded` result only when
every exact degraded ID is already explained by a declared degraded
repository/external surface or a disabled/unavailable optional external
surface. That outcome is
`local_preflight_degraded`, not pass. Missing, malformed, deletion, multi-ref,
rewritten-ref, non-fast-forward, unresolved-remote-HEAD, ungoverned-path,
dirty, stale, drifted, unexplained-degraded, or blocked input fails closed.
Every allowed outcome keeps `governed_acceptance: false`; hosted `pr_merge`
remains the only authoritative repository-code acceptance surface.

Every long-running checkpoint records exact root/branch/HEAD/tree/status,
completed and open requirement IDs, files changed, tests and exact counts,
failures and changed hypotheses, remaining blockers, next bounded task, and
anything still requiring human authority. Context compaction must preserve
decisions, falsifiers, attributed dirty paths, and unresolved blockers.

The only successful/final packet family is `OutcomePacketV1`; incomplete,
interrupted, approval, blocker, and exhausted work uses
`ContinuationPacketV1`. Every run terminates as `succeeded`,
`failed_verification`, `blocked`, `approval_required`, `budget_exhausted`, or
`cancelled`.

## 3. Product Portfolio Judgment Loop

This loop decides which product package deserves attention. It runs before a
card is activated or reprioritized. The implementation loop cannot substitute
for it.

```text
resolve exact root and current evidence
-> read product law without reading the ranked recommendation as truth
-> record an independent first view of user state, job, action, outcome,
   authority, risk, strongest conventional or null workflow, and likely priority
-> read Cockpit cards, decisions, blockers, dependencies, and release state
-> read the applicable stable outcomes and evidence grade in
   product/benchmark-baseline.md
-> identify same-level conflicts and unsupported assumptions
-> compare every eligible card on category-floor coverage, expected user
   outcome, named ChopDot differentiation, trust/risk, dependency leverage,
   evidence confidence, effort, and opportunity cost
-> explain why the selected card is now and at least the next two alternatives
   are not now
-> record audience, action scope, expected outcome, proving evidence, failure
   outcome, owner, exit condition, priority basis, and alternatives not now
-> independent product review
-> accept, repair once with a changed hypothesis, or escalate for product-owner
   approval
```

Expected outcome:

- one comparative priority verdict with no product-law or same-level conflict;
- one bounded action for the observed user or operator state, never one action
  silently applied to every state;
- applicable category-baseline IDs, a named differentiated outcome, delivery
  phase, and an honest E1/E2/E3 evidence state;
- a complete outcome contract for the selected card; and
- explicit reasons the next two eligible alternatives are not now.

Proving evidence:

- the independent-first assessment and Cockpit comparison;
- exact source identities and conflict count;
- card fields validated by `npm run product:validate`;
- benchmark source freshness and same-task evidence at the grade actually
  claimed;
- the comparison set and reviewer verdict; and
- when the priority depends on live behavior, the cited live measurement rather
  than a score or assertion alone.

Failure and blocker outcomes:

- missing outcome, evidence, owner, exit, audience, scope, or alternatives makes
  the card ineligible for `next`;
- missing, stale, unknown, or intentionally hidden category-floor coverage
  blocks experience-complete and release-complete claims; E1 cannot close E2;
- a same-level conflict terminates `blocked` until the governing decision is
  reconciled;
- a product-law or strategy change terminates `approval_required` for the
  product owner; and
- one repair may change the hypothesis or evidence. Repeating the same ranking
  claim is not progress.

The Cockpit's numeric `priority` is a reviewed ordering field, not an objective
score. The `/10` product score is an admission gate for a bounded definition,
not ranking evidence. A P0 repair can outrank a broader product opportunity, but
that does not make the repair action the universal first action in the app.

## 4. Product loop composition

```text
activate/update governing card
-> map applicable category baseline outcomes and current evidence grade
-> name the ChopDot differentiated outcome
-> identify bounded experiments that may fail without replacing the baseline
-> user journey and one next action
-> score >= 8/10
-> GIVEN/WHEN/THEN contract
-> scope/authority/privacy/failure path
-> implement coherent journey
-> focused state tests
-> src/main.tsx production-entrypoint test
-> first/action/error/after screenshots
-> independent product/security review
-> repair and regression
-> card evidence/checkpoint
-> documentation impact
-> logical commit and push
```

Hard stops:

- a user-facing package lacks applicable baseline IDs, a named differentiator,
  delivery phase, or honest evidence state;
- a product score, fixture, internal scenario, platform catalog, or E1 source
  review is used as proof of E2 hands-on parity or E3 ChopDot acceptance;
- differentiation or infrastructure hides a familiar job that the strongest
  relevant conventional or null workflow completes;
- first screen resembles a dashboard, lab, ledger, protocol console, admin
  panel, or generic form dump;
- the primary action cannot succeed and has no single working recovery action;
- internal account/host/chain/protocol language becomes the user's diagnosis;
- money, membership, privacy, recovery, or personhood boundaries blur;
- tests pass but the real screen fails the user journey.

This composition uses the Product Definition, Implementation, and UX Creation
profiles after Product Portfolio Judgment accepts the selected package. The
Cockpit may cite a reviewed outcome packet, but run status may not reprioritize
a card or alter its product score.

## 5. Incident Repair Agent Loop

```text
record URL/build/CID/actor/job/screen/blocker
-> reproduce or label screen-observed-only
-> compare deployed source with exact worktree
-> map to existing card/invariant
-> classify source vs deployment vs host/account vs copy/hierarchy
-> block promotion
-> repair original source
-> prove exact path locally and in host
-> freeze a new candidate
-> verify the same path live
```

Never repair a source defect by retrying or repointing the same immutable
candidate.

## 6. Release Outcome Pipeline

```text
clean exact commit/tree
-> isolated lockfile install
-> full assurance
-> deterministic build/rebuild equality
-> release.json + CAR/CID
-> local and real-host preview
-> stage
-> immutable byte readback
-> promote identical CAR
-> live CID/build/ownership readback
-> real-user acceptance
-> record the outcome and verify exact recall through the configured
   provider-neutral Knowledge Context adapter
```

Track these independently:

`implemented`, `tested`, `committed`, `pushed`, `candidate_built`, `staged`,
`promoted`, `reachable`, `user_owned`, `user_proven`, `kg_known`.

## 7. Knowledge Context Port adapters

```text
accepted clean commit
-> knowledge adapter health and capability preflight
-> record exact root/branch/commit/outcome digest
-> verify recall through the configured adapter
-> record backend/version/runtime/requested and active read paths/fallback
-> verify every fact and citation belongs to the exact accepted outcome
```

Knowledge verification requires an available conforming adapter, no disallowed
fallback, non-empty cited facts, and exact root/branch/commit/outcome identity.
The current KGv2 and Repo Graph integrations are adapters, not core semantics.
Direct source inspection may establish a repo fact, but it may not be
substituted for a knowledge-backend fact.

## 8. Independent Evaluation Gate and bounded repair

The author cannot close their own security-, authority-, money-, privacy-,
recovery-, or release-critical package. Independent review reports P0/P1/P2,
exact files/lines, commands, counts, and evidence boundary. The original owner
repairs; the reviewer rechecks the repaired diff.

## 9. Agent Evaluation Flywheel

Maintain representative golden and adversarial cases for exact-worktree
hydration, authority conflicts, stale generated context, dirty evidence,
product and frontend judgment, false completion, deployment approval, and KG
disagreement. Grade both the result and the tool/handoff trajectory. Record
success rate, failed gates, retries, tool errors, elapsed time, human
interventions, regressions, and escaped defects when the task is material
enough to compare runs.

Tool and skill changes require cases for discoverability, parameter clarity,
overlap, least privilege, error behavior, output relevance, and context cost.
Passing application tests cannot approve a broken agent-facing interface.

## 10. External-effect loop

```text
plan normalized effect and idempotency key
-> verify target, risk, scope, and authority source
-> require an unexpired approval when policy says so
-> dispatch at most once where the target permits
-> read back external state
-> reconcile unknown state before retry
-> record rollback or bounded forward repair
```

An effect is never successful merely because dispatch returned. Unknown
effects block outcome promotion; a retry with the same idempotency key but a
different payload fails closed.

## 11. Research basis and boundary

These controls were reconciled on 2026-08-24 with current primary guidance:

- OpenAI: [Agents SDK](https://developers.openai.com/api/docs/guides/agents),
  [agent workflow evaluation](https://developers.openai.com/api/docs/guides/agent-evals),
  [trace grading](https://developers.openai.com/api/docs/guides/trace-grading),
  and [iterating development workflows with Codex](https://developers.openai.com/cookbook/examples/codex/iterating-development-workflows-with-codex).
- Anthropic: [building effective agents](https://www.anthropic.com/engineering/building-effective-agents),
  [long-running agent harnesses](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents),
  [context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents),
  and [agent evaluations](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents).
- Google: [deterministic workflow agents](https://adk.dev/agents/workflow-agents/),
  [bounded loop agents](https://adk.dev/agents/workflow-agents/loop-agents/),
  [agent evaluation](https://adk.dev/evaluate/), and
  [agentic prompt controls](https://ai.google.dev/gemini-api/docs/prompting-strategies).

Provider guidance is supporting research, not ChopDot product law. This file
owns the reconciled process rule so later agents do not need to load every
provider page by default.
