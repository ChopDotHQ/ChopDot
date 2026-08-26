# ChopDot loop runner

**Kind:** guardrail
**Status:** active
**Owner:** release integrator
**Last reviewed:** 2026-08-26
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

## Declare and start a bounded agent run

Before code or documentation writes, create a contract from a reviewed example
or explicit parameters, then validate and start it:

```bash
npm run agent:contract:new -- \
  --run-id=run_example_0001 \
  --output=output/working_memory/example-contract.json \
  --root="$(git rev-parse --show-toplevel)" \
  --branch="$(git branch --show-current)" \
  --starting-head="$(git rev-parse HEAD)" \
  --starting-tree="$(git rev-parse 'HEAD^{tree}')" \
  --loop-profile=implementation \
  --intent-type=implementation \
  --requirements=REQ-001 \
  --in-paths=scripts/example.mjs \
  --out-paths=PRODUCT_TRUTH.md \
  --allowed-writes=scripts/example.mjs \
  --deterministic-commands="node --test scripts/example.test.mjs"
npm run agent:validate -- --contract=output/working_memory/example-contract.json
npm run agent:run:start -- --contract=output/working_memory/example-contract.json
npm run agent:run:status -- \
  --run-dir=output/agent-runs/run_example_0001
```

Use deterministic commands for known control flow. Start with one agent for a
coherent package. Use parallel workers only for independently owned work that
reduces wall time without creating integration ambiguity. Stop at the declared
budget; report the remaining blocker instead of silently extending the run.

Use the command's `--json` output for machine consumers. Effectful commands
must support `--dry-run`; a missing capability or failed/blocking state exits
non-zero.

## Durable checkpoint, observation, and repair

Use the runner lifecycle commands exposed by `npm run agent:*` to record
checkpoints, observations, artifacts, budget consumption, changed hypotheses,
approval records, effect plans, and effect readback. Then prove that resume
rebuilds the same snapshot:

```bash
npm run agent:run:checkpoint -- \
  --run-dir=output/agent-runs/run_example_0001 --json
npm run agent:run:status -- \
  --run-dir=output/agent-runs/run_example_0001 --json
npm run agent:run:resume -- \
  --run-dir=output/agent-runs/run_example_0001 --json
```

Do not edit the JSONL ledger or derived snapshot by hand. A digest-chain error,
active conflicting lease, expired approval, exhausted budget, or unknown effect
is a terminal blocker until reconciled.

When a run cannot succeed honestly, terminate it in an allowed non-success
state and promote a redacted continuation packet:

```bash
npm run agent:run:terminate -- \
  --run-dir=output/agent-runs/run_example_0001 \
  --state=blocked \
  --details-json='{"blocker":"external capability unavailable"}' --json
npm run agent:continuation:promote -- \
  --run-dir=output/agent-runs/run_example_0001 \
  --output=artifacts/agentops/outcomes/example-continuation.json \
  --next-bounded-task="Re-run the named capability preflight" --json
```

Direct `succeeded` termination is forbidden. Success is reachable only through
accepted evaluation, trajectory grading, a clean ending candidate, and outcome
promotion.

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

The measurement file is typed and evidence-bound. A bare scalar is invalid.
Each rubric subject names its value, canonical evidence level, and one or more
artifact IDs already recorded by the same run, for example:

```json
{
  "correctness": {
    "value": 1,
    "evidence_level": "exact-candidate",
    "evidence_artifact_ids": ["artifact_exact_candidate_tests"]
  }
}
```

The cited artifact bytes, SHA-256, exact root/branch/HEAD/tree, and evidence
rank must all validate. Missing, stale, wrong-candidate, or weak artifacts make
the assertion blocked or failed; they cannot be replaced with a manually
entered score.

Run the deterministic and profile evaluator, then promote only an accepted,
independently reviewed outcome:

```bash
npm run agent:evaluate -- \
  --run-dir=output/agent-runs/run_example_0001 \
  --evaluator-identity=reviewer_001 \
  --measurements-file=output/working_memory/example-measurements.json \
  --finalize --json
npm run agent:outcome:promote -- \
  --run-dir=output/agent-runs/run_example_0001 \
  --output=artifacts/agentops/outcomes/example.json --json
```

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

For an outcome-backed Cockpit finish, first commit and verify the product
candidate. Generate the outcome for that clean candidate, stage the redacted
packet and cited evidence, then run `product:finish`. The resulting later
evidence commit may change only the cited packet/evidence, the named card's
status metadata, generated Cockpit read models, and the new append-only
checkpoint. Validation finds the checkpoint's introduction commit, requires
the candidate to be its ancestor, binds the canonical exact root/branch and
candidate tree, requires each completed card ID as an accepted packet
requirement, and rejects product/runtime changes, unrelated-card changes,
blocker removal during a building checkpoint, or later checkpoint rewriting.
This avoids requiring a Git commit to contain its own future SHA without
accepting stale or unrelated product work.

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

The strict release outcome is an external input to the clean source commit, not
a file committed into that same source tree. The exact-head `PR outcome` job
creates the packet only after all five required jobs pass, signs its bytes with
GitHub build provenance from the pinned governance workflow, and retains the
offline bundle. Set `RELEASE_AGENT_OUTCOME` to that packet and
`RELEASE_AGENT_OUTCOME_ATTESTATION` to its bundle. Release preparation verifies
the repository, workflow, OIDC issuer, SLSA predicate, hosted-runner boundary,
and exact source commit before accepting the outcome. It embeds only
`agent-outcome-receipt.json`: a minimal public receipt containing candidate and
digest/count identities, never the raw packet, absolute root, paths,
limitations, prompts, or arbitrary text. `release.json` binds the receipt,
packet, and attestation hashes. This removes Git self-reference and private
agent context while keeping stage and promotion on the same CAR/CID. Missing or
invalid attestation remains fail-closed. Every public asset must also appear in
the exact Vite-emitted build manifest; the manifest digest and asset hashes are
bound in `release.json`, and the manifest itself is removed from public bytes.
An undeclared post-build asset, prompt/session/structured-role payload,
instruction or conversation object, email address, credential, private key,
absolute user path, or agent ledger marker fails before the candidate manifest
is accepted. Built JavaScript is parsed as an AST and bounded static string
evaluation follows constant bindings, arrays/joins, concatenation, templates,
`atob`, and `String.fromCharCode`. The scan also inspects canonical printable
Base64/URL-safe Base64 so the named encoded and assembled evasions fail.

Ordinary pull-request runs consume GitHub's immutable event payload. If that
event is stale or GitHub does not attach a fresh run, the bounded fallback is a
manual **PR validation** dispatch against the exact PR head branch:

```bash
gh workflow run agent-governance.yml \
  --ref codex/chopdot-v1-launch \
  -f dispatch_mode=pr_validation \
  -f pull_request_number=13
```

The `PR context` job then reads the live open same-repository PR and requires
its number, head SHA, head branch, and base/head repository identities to match
the dispatched branch and commit. All jobs use full history while still
checking out and asserting the exact SHA. Repo governance and `PR outcome`
consume the same-run context artifact; the outcome still waits for every
required exact-head job and receives the same provenance attestation. A tag,
closed PR, fork, stale head, wrong branch, or invalid PR number fails closed.

Manual PR validation and `release_enforcement` are mutually exclusive dispatch
modes. PR validation cannot execute the release job. Release enforcement
requires an empty PR number, the protected `public-testnet-release`
environment, literal immutable outcome and approval records, and its existing
readback gates.

## Commit and graph handoff

```bash
git diff --check
git status --short --branch
```

Commit one reviewed logical slice. Push only after verification. Then use the
configured Knowledge Context adapter:

```bash
npm run agent:knowledge:preflight -- --adapter=exact-source --json
npm run agent:knowledge:record -- --adapter=exact-source --outcome=PATH --json
npm run agent:knowledge:verify -- --adapter=exact-source --outcome=PATH --json
```

Report backend receipts, direct observations, and newly executed verification
separately. KGv2 and Repo Graph remain named adapters; their results cannot be
substituted by direct source inspection.

## System and CI parity

```bash
npm run agent:instructions:validate
npm run agent:knowns:probe
npm run agent:knowledge:conformance
npm run agent:eval
npm run agent:ci
```

No green skip is allowed for a missing configured tool, stale output, malformed
contract, wrong candidate identity, or absent release evidence.

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
