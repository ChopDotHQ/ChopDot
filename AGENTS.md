# AGENTS — ChopDot launch worktree

**Kind:** guardrail
**Status:** active
**Owner:** release integrator
**Last reviewed:** 2026-08-27
**Applies to:** `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch`

This is work scaffolding, never product law. Do not use another ChopDot checkout
as current truth. External AgentOps/AutoBots material may supply doctrine or
tools, but every product, source, test, or release claim must be re-established
against this exact worktree and commit.

## Required read order

1. `product/context-authority.json`
2. `PRODUCT_TRUTH.md`
3. `README.md`
4. `PROJECT_DIRECTIVES.md`
5. `product/cards.md`
6. `product/benchmark-baseline.md`
7. `product/decisions.md`
8. `product/decision-contracts.md`
9. `product/roadmap.md`
10. `docs/release/current-release-state.json`
11. `docs/superpowers/plans/2026-08-27-chopdot-full-product-public-testnet-execution.md`
12. `docs/CHOPDOT_OPERATING_LOOPS.md`
13. `docs/CHOPDOT_LOOP_RUNNER.md`
14. `docs/wiki/agent-context.generated.md`

## Read-order gate

Before entering the required product read order, inspect the steering registry
and its generated health report, then run:

```bash
npm run agent:steering:check
npm run context:validate
```

The steering check proves that the declared catalog, hashes, lifecycle states,
framework/profile bindings, and required local identities remain coherent. A
`blocked` result stops governed work until the named drift is resolved. A
`degraded` result permits work only after the unavailable, guarded, or
explicitly degraded surfaces are recorded in the task evidence and none is
required by the selected route. A `pass` is a routing precondition, not proof
that a product decision is right, code works, or a release is deployed.

The generated catalog and health report are navigation/read models and must
never be edited as authority. Change the source registry deliberately, run
`npm run agent:steering:build`, review the generated diff, and then rerun the
check.

Canonical-checkout `.local-private/agentops/**` context and the AutoBots
`chopdot-daily-operator` and `chopdot-product-systems-steward` definitions are
quarantined cross-root surfaces in the registry. Do not read, invoke, or route
through them automatically. They remain supporting evidence only until their
exact-root identity, freshness, authority, and replacement route are reviewed
and their lifecycle is deliberately upgraded in the registry.

Create a machine-readable context receipt before non-trivial work:

```bash
npm run agent:context:receipt -- --require-governed --profile=PROFILE \
  --json-out=output/working_memory/context-receipt.json
```

This receipt does not approve the work. It proves which exact root, branch,
commit, tree, governing-source hashes, active card, and knowledge state the
agent actually entered with. A missing or unverified receipt makes later
acceptance `unverified`.

## Routing law

- `PRODUCT_TRUTH.md`: invariants only.
- Cockpit source files: current revocable product intent and priority.
- `product/benchmark-baseline.md`: the dated category floor and evidence grade;
  it cannot select priority or claim E2/E3 proof.
- Source/tests: exact-commit implementation evidence.
- Release artifacts and live readback: deployment evidence.
- Knowledge Context adapters: cited recall only; backend identity remains in
  evidence, and cross-root/branch/commit means knowledge is not verified.
- Research, ADRs, old plans, `.knowns/tasks`, and agent skills: supporting or
  derived context only, according to their declared kind.

If two sources at the same authority level conflict, stop the affected work,
record the conflict in the governing card/decision, and resolve it there. Do
not silently choose the newer-looking or more detailed file.

Before accepting the Cockpit's ranked card as the right priority, run the
Product Portfolio Judgment loop in `docs/CHOPDOT_OPERATING_LOOPS.md`: record an
independent first view, compare the eligible alternatives, and require the
selected card's expected outcome, evidence, failure outcome, owner, exit
condition, priority basis, audience, action scope, delivery phase, applicable
baseline IDs, named differentiator, and honest evidence grade. Numeric priority is an
explicit reviewed ordering, not self-proving truth. Product score is an
admission gate, not a rank. A card action is never a universal user action.
The durable judgment methods are
`governance/agent-system/instructions/chopdot-product-judgment.md` and, for
user-facing work,
`governance/agent-system/instructions/chopdot-frontend-design.md`; installed
machine-local skills are loaders and may not replace these tracked sources.

## Portable agent outcome route

For every non-trivial agent-created artifact, use the profile selected from
`governance/agent-system/loops/`, create an `AgentLoopContractV1`, and execute
it through `scripts/agent-system/cli.mjs`. The stable core is provider-neutral;
KGv2, Repo Graph, exact-source, and mock KGv3 are adapters.

Run these routing gates before claiming the agent system is usable:

- `npm run agent:validate`
- `npm run agent:instructions:validate`
- `npm run agent:knowns:probe`
- `npm run agent:knowledge:conformance`
- `npm run agent:eval`
- `npm run agent:ci`

Outcome packets may supply evidence to Cockpit, PR, CI, release, and knowledge
surfaces. They may not change product priority, product score, participant
authority, or product law.

## Definition framework and domain profiles

The portable Evidence-Bound Definition Loop at
`governance/agent-system/frameworks/evidence-bound-definition-loop.v1.json`
is a method contract, not a source of answers. It requires every definition
task to name its decision target, authoritative inputs, observable expected
outcome, evaluation criteria, proving evidence, failure/blocker behavior,
owner/authority, and retry/exit rule. It may be reused in another domain
without carrying ChopDot product choices with it.

The Experience Definition file at
`governance/agent-system/profiles/experience-definition.v1.json` is one domain
profile over that framework. It adds the evidence needed for user experience,
information architecture, navigation, brand, interaction, responsive, and
accessibility work. It cannot declare a universal home pattern, primary action,
visual style, or feature priority. Those answers must trace to current product
authority and measured category evidence.

## Unavoidable acceptance boundary

Governed work may be explored while incomplete, but it cannot be marked done,
accepted by Product Cockpit, merged through the required PR check, or released
without the applicable contract, exact-candidate `OutcomePacketV1`, independent
verdict, and exact-digest knowledge recall required by
`governance/agent-system/policies/adoption-boundary.v1.json`.

The tracked pre-push hook is bounded early feedback only. It consumes exactly
one Git ref update and proves a clean checked-out fast-forward candidate and
governed changed paths. Steering must be either `pass` or drift-free
`degraded` whose exact IDs are already explained by declared degraded
repository/external surfaces or disabled/unavailable optional external
surfaces. The latter emits
`local_preflight_degraded`, never a pass. It cannot emit or claim governed
acceptance. Hosted `pr_merge` is the authoritative
repository-code acceptance surface; release acceptance remains separate.
`--no-verify` can skip local feedback, but cannot satisfy the required hosted
check. A scratch artifact may remain `ungoverned` or `unverified`; those
verdicts are never promotable.

## Product/release loop

Follow `docs/CHOPDOT_OPERATING_LOOPS.md`. For every meaningful package:

```text
context validation
-> Product Portfolio Judgment verdict
-> active card and decision contract
-> applicable category baseline -> named ChopDot differentiation -> bounded experiments
-> exact source change
-> focused and production-entrypoint tests
-> real-screen review
-> independent review
-> regression
-> evidence and checkpoint
-> logical commit/push
-> Knowledge Context record and exact-citation verification
```

The current frozen public candidate has a live first-use blocker and must not
be promoted. Fix source, then create and prove a new immutable candidate.

## Verification entrypoints

- `npm run context:validate`
- `npm run product:validate`
- `npm run wiki:validate`
- `npx tsc --noEmit`
- `npm run build`
- `npm run build:dot-host`
- `npm run e2e:dot-host-preview`
- `npm run security:baseline`
- `npx playwright test`

The exact bounded command set and stop conditions live in
`docs/CHOPDOT_LOOP_RUNNER.md`.
