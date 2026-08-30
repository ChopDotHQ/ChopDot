# KGv2 AgentOps client

**Kind:** replaceable adapter documentation
**Authority:** knowledge evidence only; never product, release, membership, money,
or deployment authority
**Implementation:** `scripts/agent-system/adapters/kgv2-agentops-client.mjs`

## Boundary

The client implements the four `KnowledgeContextPortV1` operations required by
the existing KGv2 adapter:

- `health()` reads authority health;
- `read_context(scope, question, authority_policy)` returns only facts with a
  current source hash and accepted-event lineage for the exact root, branch,
  and commit;
- `record_outcome(outcome_packet)` records one deterministic fact for a valid,
  independently reviewed, clean-candidate `OutcomePacketV1`; and
- `verify_recall(scope, outcome_digest)` accepts only one matching durable fact
  with exact candidate identity and citations.

KGv2 does not decide whether an outcome is acceptable. The portable outcome
validator and evaluator decide that first. KGv2 can only durably record and
later recall the accepted packet digest and cited evidence.

## Pinned runtime

The default client uses:

- AutoBots Git object source:
  `/Users/devinsonpena/Documents/AutoBots`;
- immutable runtime commit:
  `15577d8e15ec98e14dc7f20ce1525ceb68d8ed75`; and
- Python:
  `/Users/devinsonpena/Documents/AutoBots/proofmap/.venv/bin/python`.

The source checkout may be on a newer branch or dirty; its working-tree bytes
are never executed. Every operation requires the pinned commit object, clones
a temporary, detached, clean snapshot of that exact commit, and executes Python
in isolated mode. The child receives only a bounded
environment, including `AGENTOPS_CG2_DSN` when explicitly configured. No new
dependency or service is introduced.

The paths may be replaced without changing core semantics:

```text
CHOPDOT_KGV2_AUTOBOTS_SOURCE
CHOPDOT_KGV2_AUTOBOTS_COMMIT
CHOPDOT_KGV2_PYTHON
CHOPDOT_KGV2_REPO_ID
AGENTOPS_CG2_DSN
```

Changing the source commit changes the reported backend version and requires
the same tests and live health/read proof again.

The exact-worktree Repo Graph refresher in
`scripts/research/agentops-release-kgv2.py` uses the same
`CHOPDOT_KGV2_AUTOBOTS_SOURCE` override and canonical checkout default. It
still verifies the immutable commit and the approved runner byte hashes before
cloning a detached clean snapshot; changing the checkout locator does not
permit working-tree AutoBots bytes to execute.

## Fail-closed gates

Recording is rejected before any KG write when any of these conditions holds:

- the outcome packet or its digest is invalid;
- independent review or evaluation is incomplete;
- the packet reports dirty Git state;
- the current root, branch, or HEAD differs from the packet;
- the current worktree is dirty;
- the exact contract, persisted runner provenance, or runner directory is
  absent, symlinked, cross-root, or fails ledger/evaluation replay;
- no declared single-file evidence artifact exists inside the exact root with
  its canonical runner aggregate SHA-256, including after real-path
  resolution; or
- the pinned runtime or authority is unavailable.

Reading and recall never use a v1, cross-root, or uncited fallback. Missing,
stale, wrong-commit, wrong-branch, wrong-root, or hash-mismatched citations
produce stale/rejected portable results.

## Bounded checks

Focused hermetic and hostile tests do not contact or mutate the live KG:

```bash
node --test scripts/agent-system/tests/kgv2-agentops-client.test.mjs
```

Read-only live health:

```bash
node scripts/agent-system/cli.mjs knowledge-preflight \
  --root /Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch \
  --adapter kgv2 \
  --client-module scripts/agent-system/adapters/kgv2-agentops-client.mjs \
  --json
```

Read-only exact-candidate recall query:

```bash
node scripts/agent-system/cli.mjs knowledge-read \
  --root /Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch \
  --adapter kgv2 \
  --client-module scripts/agent-system/adapters/kgv2-agentops-client.mjs \
  --question "What exact accepted portable outcome is current for this worktree?" \
  --authority-policy exact-root-cited-sources \
  --json
```

`knowledge-record` is an intentional durable KG write. Run it only with an
accepted outcome packet, its replayable proof bundle, and explicit action-time
authority:

```bash
node scripts/agent-system/cli.mjs knowledge-record \
  --adapter kgv2 \
  --client-module scripts/agent-system/adapters/kgv2-agentops-client.mjs \
  --outcome output/agent-runs/<run>/outcome.json \
  --contract output/agent-runs/<run>/acceptance-contract.json \
  --runner-provenance output/agent-runs/<run>/runner-provenance.json \
  --run-directory output/agent-runs/<run>/<runner-directory> \
  --json
```

The client replays the ledger, evaluation, command evidence, artifact hashes,
contract digest, and candidate identity before invoking KGv2. Follow a record
with `knowledge-verify` for the same digest; an upload or record receipt alone
does not prove recall.

Runner artifact records bind `hashArtifact(...).aggregate_sha256`, even for a
single file. The client verifies that canonical aggregate before a write, then
uses the verified manifest entry's raw file SHA-256 for KGv2 source lineage and
citation verification. A directory aggregate is evidence but is not itself a
citable file anchor. Symlinks and cross-root real paths remain rejected.

## Current live measurement

On 2026-08-30, the read-only health preflight accepted the pinned runtime with
`fallback_status=none`. A read-only query for the current
`codex/agent-loop-ci-hook-repair` candidate returned zero exact cited facts and
failed stale with `kgv2_no_exact_scope_cited_facts`. That is expected before a
clean accepted outcome is recorded; it is not evidence that this worktree is
already durably known.
