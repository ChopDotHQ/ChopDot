# Portable agent outcomes

**Kind:** guardrail
**Status:** active
**Owner:** agent-systems integrator
**Last reviewed:** 2026-08-26
**Applies to:** `chopdot-v1-launch`
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

Creator identity is also explicit evidence. Contract creation requires an
actor ID and actor kind together; delegated work uses `kind: agent`. Missing or
unknown kinds fail closed so a self-authored run cannot gain apparent
independence by being mislabeled as the human operator.

Deterministic commands are hard acceptance gates, not informational attachments
to a measurement score. Every declared command must pass with its expected
exit code; a failure rejects evaluation even when all typed assertions pass.
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
