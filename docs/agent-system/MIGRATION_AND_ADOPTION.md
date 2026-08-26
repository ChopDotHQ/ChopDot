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
2. Validate the schemas, policies, profiles, and negative fixtures.
3. Prove the local event/effect ledger, resume, redaction, and evaluator.
4. Reconcile PR #14's invariant and exact-head enforcement into the same packet
   family; do not install a second supervision contract.
5. Add optional outcome references to Cockpit checkpoints without rewriting
   history or allowing agent state to reprioritize cards.
6. Move KGv2 and Repo Graph behind the Knowledge Context Port. Preserve the
   legacy release measurement until a fresh accepted outcome replaces it.
7. Align active agent entrypoints and remove backend-specific core language.
8. Enable CI and repository rules only after exact-head proof and settings
   readback.
9. Pilot each profile, record overhead and failures, and promote adoption only
   after the declared observation window.

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
