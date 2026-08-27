# ChopDot loop runner

**Kind:** guardrail
**Status:** active
**Owner:** release integrator
**Last reviewed:** 2026-08-27
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
npm run agent:context:receipt -- --require-governed --profile=implementation \
  --json-out=output/working_memory/context-receipt.json
```

Stop if the root/branch differs, context validation fails, generated views are
stale, the selected next card disagrees with explicit priority, or dirty paths
cannot be attributed.

The receipt command exits non-zero with `--require-governed` when the context
manifest, authority hash, root, branch, or freshness gate fails. Do not replace
it with a prose hydration claim.

For product or UI work, also inspect the selected card's `delivery_phase`,
`benchmark_requirements`, `differentiated_outcome`, and
`benchmark_evidence_state`. `product/benchmark-baseline.md` is the stable-ID
source. An E1 source row is a hypothesis/floor, not an E2 hands-on result or an
E3 ChopDot production result.

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

## Acceptance and push gate

Before Product Cockpit finish or a governed push, provide the exact accepted
inputs to the shared guard:

```bash
npm run agent:acceptance:guard -- \
  --surface=governed_push \
  --changed-paths="path/one,path/two" \
  --outcome=artifacts/agentops/outcomes/RUN/outcome.json \
  --contract=output/working_memory/RUN-contract.json \
  --knowledge-receipt=output/working_memory/RUN-recall.json \
  --context-receipt=output/working_memory/context-receipt.json \
  --profile=implementation \
  --evidence-level=exact-candidate \
  --expected-sha="$(git rev-parse HEAD)" \
  --expected-tree="$(git rev-parse 'HEAD^{tree}')" \
  --expected-branch="$(git branch --show-current)"
```

`npm install`/`npm ci` runs the tracked hook installer. Confirm it with
`npm run agent:hooks:check`. The pre-push hook consumes the same inputs through
`CHOPDOT_OUTCOME_PACKET`, `CHOPDOT_LOOP_CONTRACT`,
`CHOPDOT_KNOWLEDGE_RECEIPT`, `CHOPDOT_CONTEXT_RECEIPT`, and
`CHOPDOT_LOOP_PROFILE`, plus `CHOPDOT_EVIDENCE_LEVEL`. `--no-verify` can skip only this early local feedback;
the required PR job regenerates an exact-candidate acceptance contract and
OutcomePacket, recalls the exact digest, and runs the same guard remotely.

`--changed-paths` is not trusted classification input. It must equal the
ordered canonical Git diff for the applicable independently bound range;
mismatch is a typed failure and the manifest digest is recorded in the
acceptance receipt. Ordinary surfaces use contract start through outcome end.
PR merge acceptance instead uses the base/head range recorded in same-run PR
evidence, because the CI-generated contract is a post-hoc exact-candidate
verifier and cannot prove original task-start lineage. The verdict must bind a
schema-valid, hashed `EvaluationV1` artifact and replayable
`RunnerProvenanceV1`. A summary Boolean is not execution or review evidence.

For `product:finish`, also pass `--outcome-packet`, `--contract`,
`--knowledge-receipt`, `--runner-provenance`, `--run-directory`,
`--execution-attestation`, `--context-receipt`, `--agent-run-id`,
`--evidence-level`, and `--independent-review`. A done checkpoint without a
governed acceptance receipt fails `product:validate`. The full receipt, not
only its ID, is persisted in the append-only checkpoint. Validation re-hashes
and reopens its cited contract, outcome, durable recall, runner provenance,
run directory and execution attestation, then replays the runner ledger. A
`done` card must have exactly one completed checkpoint; a non-done card must
have none. Failed finish/checkpoint/refresh work restores the prior card state
and removes the just-created checkpoint.

## Focused package

Use the package's exact tests plus:

```bash
npx tsc --noEmit
npm run build
```

For user-facing work also run the production-entrypoint Playwright file, open
the actual app, and capture mobile and desktop first/action/error/after states.
Selectors alone do not close a product card.

Before that proof begins, map the bounded job to its applicable category
baseline IDs, name the ChopDot differentiated outcome, and isolate experiments
that may fail without removing the baseline. A conventional product or null
workflow that wins the same task is recorded as a product gap; it is not
explained away by a product score or infrastructure advantage.

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

Contract creator identity is part of the independence boundary. A delegated
agent run must declare both fields explicitly:

```bash
npm run agent:contract:new -- \
  --created-by=research-agent-01 \
  --created-by-kind=agent \
  # plus the bounded contract fields
```

`--created-by` and `--created-by-kind` are an inseparable pair. The CLI rejects
an omitted or unknown kind instead of silently labelling an agent as a human
operator. The later evaluator identity must be genuinely different when the
profile requires `different_actor` or `different_run`; changing only the label
does not establish independence.

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

Artifact hashes have two explicit domains. Each manifest entry records the
raw-byte SHA-256 of one file. `ArtifactV1.sha256` records the SHA-256 of the
ordered manifest, constructed from each `path + NUL + raw-file-hash` entry.
These values normally differ even for a one-file artifact. Verify immutability
by recomputing and comparing raw hashes to manifest entries, then recomputing
and comparing the ordered aggregate to `ArtifactV1.sha256`; never compare the
aggregate directly with a raw file hash.

Deterministic commands are hard gates, independent of the assertion score.
Every declared command must finish with its expected exit code. One failed,
timed-out, unsafe, or otherwise non-passing command makes the evaluation
`rejected` and the run `failed_verification`, even when all typed measurement
assertions pass. Generated run evidence under `output/` is excluded from the
production TypeScript project; a pilot script must be checked by its declared
command rather than entering `npm run lint` by filesystem discovery.

Run the deterministic and profile evaluator, then promote only an accepted,
runner-proven outcome. Do not describe a distinct evaluator identity as human
or agent review unless a protected external review record proves that claim:

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
Changes to the product baseline or delivery phase also require the relevant
P-013/card fields, dated decision contract, source wiki page, context-authority
hash, and deterministic benchmark-validation cases. Never edit generated Wiki,
Cockpit, or task read models as the repair.

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
The generated PR contract is deliberately restricted to the canonical
`implementation` profile because the five generic exact-head jobs do not prove
specialized product-definition, UX, security, research, incident, or release
outcomes. Those profiles require their own aligned contract and evaluation.

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
node scripts/agent-system/cli.mjs knowledge-read --adapter=repo-graph --packet=PATH --question="What exact candidate evidence is current?" --required-sources=PATH --json
npm run agent:knowledge:record -- --adapter=exact-source --outcome=PATH --json
npm run agent:knowledge:verify -- --adapter=exact-source --outcome-digest=SHA256 --json
```

`knowledge-read` validates the provider-neutral context schema, exact
root/branch/commit source identities, freshness, source hashes, and every
required citation before returning success. `knowledge-record` durably records
an accepted outcome packet. `knowledge-verify` proves recall of that packet by
its immutable outcome digest; an outcome file path is not a recall identity.

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

`agent:eval` runs the tracked default suite at
`governance/agent-system/evals/suites/core.v1.json`. Use
`node scripts/agent-system/cli.mjs eval --suite PATH` only for an explicitly
named additional suite; a missing suite is a failure, never a green skip.

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
