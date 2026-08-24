# ChopDot operating loops

**Kind:** guardrail
**Status:** active
**Owner:** product assurance
**Last reviewed:** 2026-08-24
**Applies to:** `chopdot-v1-launch`
**Authority:** process only; never product law or deployment evidence

## 1. Context loop

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

## 2. Agent execution contract

Product proof and agent-process proof are different evidence. Before a
non-trivial package, record:

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

The agent trajectory is graded separately from the product result:

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

Every long-running checkpoint records exact root/branch/HEAD/tree/status,
completed and open requirement IDs, files changed, tests and exact counts,
failures and changed hypotheses, remaining blockers, next bounded task, and
anything still requiring human authority. Context compaction must preserve
decisions, falsifiers, attributed dirty paths, and unresolved blockers.

## 3. Product package loop

```text
activate/update governing card
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

- first screen resembles a dashboard, lab, ledger, protocol console, admin
  panel, or generic form dump;
- the primary action cannot succeed and has no single working recovery action;
- internal account/host/chain/protocol language becomes the user's diagnosis;
- money, membership, privacy, recovery, or personhood boundaries blur;
- tests pass but the real screen fails the user journey.

## 4. Live failure loop

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

## 5. Release loop

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
-> Repo Graph/KGv2 refresh
```

Track these independently:

`implemented`, `tested`, `committed`, `pushed`, `candidate_built`, `staged`,
`promoted`, `reachable`, `user_owned`, `user_proven`, `kg_known`.

## 6. KGv2/Repo Graph loop

```text
accepted clean commit
-> generate exact-root Repo Graph packet
-> record root/branch/commit/digest/dirty evidence/stale reasons
-> AgentOps integration preflight
-> KGv2 recall query
-> record requested and active read paths/runtime/fallback/facts/citations
-> verify every cited source belongs to the exact accepted outcome
```

`kg_known=true` requires active v2, no fallback, non-empty cited facts, and an
exact root/branch/commit packet. Direct source inspection may establish a repo
fact, but it may not be substituted for a KG fact.

## 7. Review loop

The author cannot close their own security-, authority-, money-, privacy-,
recovery-, or release-critical package. Independent review reports P0/P1/P2,
exact files/lines, commands, counts, and evidence boundary. The original owner
repairs; the reviewer rechecks the repaired diff.

## 8. Agent regression and operational evidence

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

## 9. Research basis and boundary

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
