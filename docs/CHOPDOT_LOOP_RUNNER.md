# ChopDot loop runner

**Kind:** guardrail
**Status:** active
**Owner:** release integrator
**Last reviewed:** 2026-08-24
**Applies to:** `chopdot-v1-launch`
**Authority:** commands and stop conditions only

Run from:

```text
/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch
```

## Start / rehydrate

```bash
git rev-parse --show-toplevel
git branch --show-current
git rev-parse HEAD
git status --short --branch
npm run context:validate
npm run product:query -- "next"
npm run product:validate
npm run wiki:validate
```

Stop if the root/branch differs, context validation fails, generated views are
stale, the selected next card disagrees with explicit priority, or dirty paths
cannot be attributed.

## Declare the bounded agent run

Before code or documentation writes, add this block to the active plan or
checkpoint; do not create another authority document:

```text
Task / requirement IDs:
Outcome and proof:
Scope in / scope out:
Read / write / external-action boundaries:
Human approvals still required:
Architecture: deterministic | single-agent | parallel-workers |
  orchestrator-workers | evaluator-optimizer
Why this is the simplest adequate architecture:
Budget: iterations / retries / wall time / tool calls / external cost
Exit: success / failed verification / blocker / approval / budget exhaustion
Baseline and regression cases:
Independent reviewer:
```

Use deterministic commands for known control flow. Start with one agent for a
coherent package. Use parallel workers only for independently owned work that
reduces wall time without creating integration ambiguity. Stop at the declared
budget; report the remaining blocker instead of silently extending the run.

## Focused package

Use the package's exact tests plus:

```bash
npx tsc --noEmit
npm run build
```

For user-facing work also run the production-entrypoint Playwright file, open
the actual app, and capture mobile and desktop first/action/error/after states.
Selectors alone do not close a product card.

## Grade the execution trajectory

For a material package, the checkpoint must answer:

```text
Did the run use the exact root, branch, and governing sources?
Were unrelated/stale sources excluded or explicitly labelled?
Were tools, parameters, ordering, and handoffs appropriate?
Were writes and external actions inside the approval envelope?
Did each retry use a changed hypothesis?
Did environmental observations support the claimed outcome?
Did focused, production-entrypoint, regression, and independent review run?
Did the handoff preserve exact state, failures, blockers, and next action?
```

Record this as `trajectory_checked: pass|fail|partial` with cited evidence.
It is not a substitute for application tests or release/user verdicts.

## Wiki and Cockpit source change

```bash
npm run product:refresh
npm run product:validate
npm run wiki:generate
npm run wiki:validate
npm run product:cockpit:screenshot
npm run product:cockpit:visual-review
```

Generated files are outputs. Update their source and regenerate them.

## Candidate assurance

```bash
npm ci
npx tsc --noEmit
npm run build
npm run build:dot-host
npm run e2e:dot-host-preview
npm run security:baseline
npm run test:node
npx playwright test
npm run test:recovery-contract
npm run test:release-tooling
```

The release-specific evidence record may require additional focused commands.
Do not omit a failing test, retry a flaky failure into a pass, or use ancestor
`node_modules` to satisfy an isolated release gate.

## Native release

Before any write:

```bash
npm run deploy:tool:verify
npm run deploy:preflight:devnet
npm run deploy:preflight:paseo
```

Require explicit environment, genesis, signer, owner, name, contract code,
commit/tree, build ID, CAR hash, CID, rollback target, and exact clean tooling
identity. Read back every external mutation. A candidate with a live P0/P1
first-use failure is not eligible for promotion even when the release tooling
itself passes.

## Commit and graph handoff

```bash
git diff --check
git status --short --branch
```

Commit one reviewed logical slice. Push only after verification. Then run the
exact-worktree Repo Graph/KGv2 workflow named by the accepted release evidence.
Report Repo Graph facts, KG facts, direct observations, and newly executed
verification separately.

## Long-running checkpoint

Before pausing, compaction, agent handoff, or package completion, record:

```text
root / branch / HEAD / tree / complete status
completed and open requirement IDs
files changed and owner
commands, exit codes, exact pass/fail counts, artifacts, hashes
failed hypotheses and remaining blockers
budget used and any exhaustion
approvals consumed and still required
next one bounded action
```

A checkpoint with unexplained dirty paths, an unbounded retry, or a completion
claim unsupported by the named evidence is a failed checkpoint.
