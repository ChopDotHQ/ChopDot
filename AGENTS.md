# AGENTS — ChopDot launch worktree

**Kind:** guardrail
**Status:** active
**Owner:** release integrator
**Last reviewed:** 2026-08-24
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
6. `product/decisions.md`
7. `product/decision-contracts.md`
8. `product/roadmap.md`
9. `docs/release/current-release-state.json`
10. `docs/superpowers/plans/2026-08-24-context-authority-and-live-first-use-repair.md`
11. `docs/CHOPDOT_OPERATING_LOOPS.md`
12. `docs/CHOPDOT_LOOP_RUNNER.md`
13. `docs/wiki/agent-context.generated.md`

## Read-order gate

Run `npm run context:validate` before relying on this order. Generated files
are navigation/read models and must never be edited as authority.

## Routing law

- `PRODUCT_TRUTH.md`: invariants only.
- Cockpit source files: current revocable product intent and priority.
- Source/tests: exact-commit implementation evidence.
- Release artifacts and live readback: deployment evidence.
- Repo Graph/KGv2: cited recall only; cross-root/branch/commit means
  `kg_known=false`.
- Research, ADRs, old plans, `.knowns/tasks`, and agent skills: supporting or
  derived context only, according to their declared kind.

If two sources at the same authority level conflict, stop the affected work,
record the conflict in the governing card/decision, and resolve it there. Do
not silently choose the newer-looking or more detailed file.

## Product/release loop

Follow `docs/CHOPDOT_OPERATING_LOOPS.md`. For every meaningful package:

```text
context validation
-> active card and decision contract
-> exact source change
-> focused and production-entrypoint tests
-> real-screen review
-> independent review
-> regression
-> evidence and checkpoint
-> logical commit/push
-> Repo Graph/KGv2 refresh
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
