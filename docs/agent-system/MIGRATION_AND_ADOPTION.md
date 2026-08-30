# Portable Agent Outcome System migration and adoption

**Kind:** guardrail

**Status:** proposed

**Owner:** agent-systems integrator

**Last reviewed:** 2026-08-26

**Applies to:** `chopdot-v1-launch`

**Authority:** process migration only; never product law, product priority, or
release evidence

## Migration order

1. Accept ADR 0005 and the taxonomy before routing agents to the new commands.
2. Establish `governance/agent-system/steering-surface-registry.v1.json` as the
   inventory and lifecycle source, build its generated catalog/health report,
   and resolve every `blocked` monitor finding before new governed work.
3. Validate the schemas, policies, profiles, and negative fixtures.
4. Prove the local event/effect ledger, resume, redaction, and evaluator.
5. Reconcile PR #14's invariant and exact-head enforcement into the same packet
   family; do not install a second supervision contract.
6. Add optional outcome references to Cockpit checkpoints without rewriting
   history or allowing agent state to reprioritize cards.
7. Move KGv2 and Repo Graph behind the Knowledge Context Port. Preserve the
   legacy release measurement until a fresh accepted outcome replaces it.
8. Align active agent entrypoints and remove backend-specific core language.
9. Keep the canonical-checkout AgentOps context and the two AutoBots ChopDot
   agents quarantined until exact-worktree provenance, freshness, authority,
   and replacement routing are independently reviewed. Do not leave them in an
   automatic read order or execution path.
10. Enable CI and repository rules only after exact-head proof and settings
   readback.
11. Pilot each profile, record overhead and failures, and promote adoption only
   after the declared observation window.

## Steering monitor adoption

Run `npm run agent:steering:check` before non-trivial product or agent work and
in the applicable local hook, pull-request check, and scheduled verification.
Its expected outcomes are:

- `pass`: the declared census, SHA-256 identities, lifecycle/activation rules,
  framework/profile links, review interval, and required external identities
  are current;
- `degraded`: only optional unavailable or explicitly guarded/degraded surfaces
  remain, and the affected IDs are carried into task evidence;
- `blocked`: a registry/schema rule fails, a controlled path is uncatalogued,
  a generated output is stale, an external identity drifts, a required surface
  is absent, or review freshness expires.

`degraded` is not a generic waiver. Work may continue only when none of the
named surfaces is required for the selected route. `blocked` stops governed
work; retry must change the registry/source/evidence hypothesis rather than
rerun the same command. `pass` is a routing and integrity result only. It does
not decide product priority, accept an implementation, prove deployment, or
replace live readback.

The generated catalog and health report are read models. The registry is the
only file that intentionally changes lifecycle, ownership, activation, or
trusted external identity. A monitor run must never make those decisions.

## Definition-loop migration boundary

The Evidence-Bound Definition Loop is the portable framework. It defines the
required shape of a bounded decision task: target, authority, expected outcome,
criteria, evidence, failure/blocker, owner, and retry/exit. It cannot encode a
ChopDot answer.

Experience Definition is a domain profile over that framework. It adds the
people/state/job map, category coverage, information architecture, navigation,
brand and visual rationale, interaction states, responsive/accessibility
behavior, and real-screen evidence required for experience work. Its adoption
does not authorize a universal home pattern, first action, or feature priority.

Add or upgrade future profiles by changing only domain-specific requirements,
proving them against the generic framework contract, and passing the registry
monitor. Do not fork the framework to preserve a one-off product assumption.

## Registry lifecycle changes

1. Propose the surface with a stable ID, accountable owner, allowed/forbidden
   influence, activation mode, expected outcome, evidence, failure behavior,
   and retry/exit condition.
2. Keep a `candidate` explicit-only while it is evaluated against representative
   and hostile cases.
3. Promote to `active` only after compatibility, provenance, and required
   evidence pass and the generated catalog diff is reviewed.
4. Mark `degraded` when a still-needed surface has a bounded known limitation;
   name the owner, repair/replacement, and expiry rather than normalizing it.
5. Disable activation before `quarantined`, `superseded`, or `retired`; record
   the replacement or reason and preserve the prior identity as audit evidence.
6. Rebuild the catalog, run the full check and adversarial suite, and record the
   exact verdict after every lifecycle or trusted-identity change.

## Documentation impact

This package implements the provider-neutral execution, evidence, and
Knowledge Context Port boundaries already accepted in ADR 0005. It does not
change ChopDot product law, participant authority, money semantics, release
architecture, or user-facing product behavior, so it does not create a new ADR
or product-wiki source. The source documentation for this change lives here,
in `governance/agent-system/README.md`, and in the dated steering-surface audit.
Generated wiki and Product Cockpit views therefore remain unchanged. A future
change that alters an accepted architecture or product decision must update the
applicable source ADR/wiki page and regenerate its read models; this statement
must not be reused as a blanket documentation waiver.

## Compatibility rules

- Existing `chopdot.product.checkpoint.v1` and `.v2` events remain valid.
- Outcome-backed Cockpit checkpoints use a candidate-then-evidence-commit
  sequence. The packet binds the clean product candidate; the later commit is
  restricted to the cited packet/evidence, named card status metadata,
  generated Cockpit read models, and the append-only checkpoint. Candidate
  ancestry, field-level card changes, path scope, and post-introduction
  immutability are validated. No commit is asked to contain its own SHA.
- Existing `kgv2` release fields remain readable through a legacy adapter; new
  core code must not branch on KGv2 outside that adapter.
- `.knowns/tasks` remains a generated file. The new runner does not require the
  `knowns` CLI.
- Old loop documents remain historical evidence until their supersession is
  validated and their default routing is updated.
- V1 outcome packets remain readable even if the runner implementation or
  knowledge backend changes.
- Moving PRs use a same-workflow external outcome artifact generated only after
  every required exact-head job passes. The pinned workflow signs the packet
  with GitHub build provenance and retains an offline bundle. Immutable release
  evidence never accepts the unauthenticated `CI_GENERATED` token.
- A normal PR run uses its immutable GitHub event. A manual `pr_validation`
  dispatch is the bounded recovery route for a stale or missing run: it fetches
  one live open same-repository PR, binds its number/head/branch/repositories to
  the exact dispatched commit, and supplies one same-run event artifact to repo
  governance and PR outcome. It cannot overlap `release_enforcement`, which
  rejects any PR number and remains environment-gated.
- Strict release preparation accepts the external packet only with that
  attestation bundle. It verifies the exact repository, workflow, OIDC issuer,
  SLSA predicate, hosted runner, source commit, branch, tree, clean status, and
  outcome semantics. The immutable output receives a minimal redacted receipt,
  not the raw packet; `release.json` binds the receipt, packet, and attestation
  hashes. Publication still requires the separate scoped release approval and
  live readback gates.

## Rollback

If the agent system blocks safe product delivery or corrupts its own state:

1. stop new agent runs and reconcile all effects with state
   `unknown_needs_reconciliation`;
2. disable the new npm and CI entrypoints without changing product runtime;
3. retain ledgers and accepted packets read-only for diagnosis;
4. restore the previously read-back GitHub ruleset only with explicit external
   authorization;
5. repair forward with a new schema/runner version—never rewrite accepted
   packets or weaken evidence thresholds.

Product source, participant data, release bytes, and Product Cockpit history
must remain unchanged by an agent-system rollback.

## Adoption verdict

`adopted=true` requires all loop-profile pilots, independent review, enforced
CI readback, adapter portability, and the observation window defined in the
execution plan. Source existence or a green local suite is insufficient.
