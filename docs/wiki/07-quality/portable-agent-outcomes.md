# Portable agent outcomes

**Kind:** guardrail
**Status:** active
**Owner:** agent-systems integrator
**Last reviewed:** 2026-08-27
**Applies to:** `chopdot-v1-launch`
**Authority:** scoped agent-process guardrail subordinate to Product Truth, current Cockpit decisions and contracts, ADRs, and exact outcome evidence; it grants no product, participant, or release authority
**Sources:** ADR 0005, agent-system taxonomy, portable execution plan

Material agent work starts from a versioned `AgentLoopContractV1` with a
bounded artifact, objective assertions, exact-worktree scope, authority and
effect limits, a finite repair budget, an evaluator, and six finite terminal
states. The runner stores a digest-chained local ledger and can resume only
after rebuilding the same state and reconciling unknown effects.

Agent loops create artifacts. Gates decide entry. Pipelines preserve ordered
identity. Adapters implement replaceable ports. The evaluation flywheel owns
versioned regression cases. These distinctions keep a successful check from
being mistaken for a successful product or release outcome.

`OutcomePacketV1` is the accepted packet family;
`ContinuationPacketV1` preserves incomplete or interrupted work. Evidence uses
the canonical progression from source-only through release, with
`local-blocked` remaining non-promotable. Reviewer independence is recorded
separately from evidence strength.

Acceptance is governed by the versioned adoption policy. A material path is
not complete because an agent says it followed a loop: Product Cockpit finish,
the tracked pre-push check, exact-head PR acceptance, and release enforcement
require a fresh context receipt, applicable contract, exact candidate outcome,
hashed aligned `EvaluationV1` verdict, a replayable `RunnerProvenanceV1`, a
GitHub OIDC execution attestation, re-hashed cited evidence, the canonical Git
changed-path manifest, and exact-digest knowledge recall. Normal work uses the
contract-start-to-outcome-end range. Pull-request acceptance uses the
event-bound base-to-head range recorded by the same-run PR evidence because its
acceptance contract is explicitly a post-hoc verifier, not evidence that the
original implementation began from that contract.
The resulting acceptance receipt is `governed`, `ungoverned`, or `unverified`;
only `governed` is promotable. The remote PR/release gate remains authoritative
because a local Git hook can always be bypassed.

The adoption policy is pinned by digest inside the guard and cannot disable
these requirements. Exact recall may supersede an older release-state snapshot
only when the recall itself is durable, current, exact-candidate bound, and its
citation bytes re-hash to a durable exact-source record outside the supplied
outcome. Product completion stores the full receipt in history, including the
fresh context, runner and external-execution bindings, and requires exactly one
completion checkpoint for each done card. Validation reopens those referenced
bytes and replays the digest-chained runner proof; a plausible receipt summary
is not durable proof.

Creator identity is also explicit evidence. Contract creation requires an
actor ID and actor kind together; delegated work uses `kind: agent`. Missing or
unknown kinds fail closed so a self-authored run cannot gain apparent
independence by being mislabeled as the human operator.

Deterministic commands are hard acceptance gates, not informational attachments
to a measurement score. Every declared command must pass with its expected
exit code; a failure rejects evaluation even when all typed assertions pass.
This proves independent deterministic execution only. A human or agent product,
security, or release review is a separate claim and requires evidence outside
candidate-authored bytes, such as protected GitHub review or protected-
environment readback.
The generated `output/` evidence workspace is excluded from the production
TypeScript project, so ignored pilot scripts cannot accidentally expand lint's
source surface.

Artifact hashing uses two named domains. A manifest entry stores one file's raw
SHA-256, while `ArtifactV1.sha256` stores the SHA-256 of the ordered
`path + NUL + raw-file-hash` manifest. Verification compares like with like:
raw bytes to the manifest entry, then the reconstructed ordered manifest to the
aggregate. A raw hash differing from the aggregate is expected and is not, by
itself, mutation evidence.

Product Cockpit checkpoints may cite reviewed outcome packets but the runner
cannot reprioritize cards, alter product scores, or change `PRODUCT_TRUTH.md`.
The packet binds a clean product candidate. A later evidence-only commit may
carry the packet, cited evidence, bounded named-card status metadata, generated
Cockpit read models, and the append-only checkpoint; candidate ancestry and
path/field restrictions prevent self-referential Git evidence and stale-source
promotion.
Strict release output verifies the external outcome through the exact GitHub
repository, pinned workflow identity, OIDC issuer, SLSA predicate, hosted
runner, and source commit. It then embeds only a minimal public receipt bound to
the clean source branch/commit/tree and the packet/attestation digests. The raw
packet, absolute worktree root, paths, prompts, limitations, and arbitrary text
do not enter release bytes. The packet is not committed back into the source
candidate whose identity it proves.
KGv2, Repo Graph, exact-source, and future knowledge backends operate behind
the Knowledge Context Port. Backend identity, runtime, fallback, freshness,
facts, citations, and exact scope remain visible in receipts.

GitHub's ordinary pull-request event is immutable. When it is stale or no fresh
run attaches, an operator may dispatch `pr_validation` on the exact PR head
branch with its positive PR number. The workflow accepts only a live open PR in
the same repository whose head SHA and branch match that dispatch, then gives
the same context artifact to repo governance and PR outcome. This mode cannot
activate the separate environment-gated `release_enforcement` path.

Local run ledgers and unredacted traces are ignored and excluded from product
release bytes. Built text assets also undergo secret, absolute-path,
prompt/session, email, transcript, and runtime-ledger signature scans. Every
asset path must equal the exact Vite-emitted build graph; undeclared post-build
files fail before release manifest creation. Built JavaScript receives bounded
AST-based static string evaluation across constants, arrays/joins,
concatenation, templates, `atob`, and `String.fromCharCode`, plus canonical
printable Base64 inspection. Only reviewed redacted outcome packets may be
promoted into `artifacts/agentops/outcomes/` for durable citation.
