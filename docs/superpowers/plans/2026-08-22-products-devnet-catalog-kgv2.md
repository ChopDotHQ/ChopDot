# Products Devnet Catalog and KGv2 Provenance Gate

**Kind:** historical research plan
**Status:** complete time-sliced catalog and KGv2 gate; deployment remained out of scope
**Owner:** product-research
**Observed at:** 2026-08-22
**Applies to:** the source identities and KGv2 runtime recorded by the resulting packet
**Authority:** historical research provenance only; portable current knowledge routing is resolved at read time

**Programme:** B — native capability research and provenance support

## Goal

Create a reproducible, source-grounded catalog of the Parity repositories and
live Products Devnet applications relevant to ChopDot, turn the findings into
bounded architecture decisions, and prove that AgentOps Context Graph v2 can
recall those decisions with citations to this exact worktree.

This plan does not claim a native runtime gate, deployment readiness, or user
reachability.

## Current truth to preserve

- ChopDot's money states remain distinct: claimed, received/cleared,
  approved/released, and closed are not interchangeable.
- Normal users never meet SDK, host, adapter, protocol, proof, or chain
  plumbing.
- The chain is a replaceable rail, never ChopDot's product substrate.
- Participant-signed events are authority; carriers, hosts, databases, and
  graph projections cannot forge product truth.
- The exact implementation target is
  `/Users/devinsonpena/ChopDot/.worktrees/chopdot-v1-launch` on branch
  `codex/chopdot-v1-launch` at starting HEAD
  `3519a894efbcee5144ecb0bcb9ebc44b888a0e7f`.
- Existing untracked verified-contact files belong to their current slice and
  SHALL NOT be edited by this research task.

## Scope in

1. Enumerate every public repository returned by the official GitHub API for
   the `paritytech` organization at the observation time.
2. Classify every repository without dropping records: relevant platform,
   relevant product/reference, adjacent, core/infrastructure, archived,
   generated/test, or excluded-with-reason.
3. Capture every application/name exposed by the live Products Devnet registry
   source used by DotMetrics at a pinned observation time and network context.
4. Record provenance, source URL, immutable revision where available,
   retrieved timestamp, license signal, maintenance signal, confidence, and
   verification limits.
5. Deep-audit the platform capabilities and application donors that can affect
   ChopDot persistence, recovery, identity, delivery, payment, deployment, and
   host compatibility.
6. Record `ADOPT`, `ADOPT_AS_ADAPTER`, `INVESTIGATE`, `DEFER`, or
   `REJECT_FOR_V1` decisions with prerequisites and falsifiers.
7. Land human-readable and machine-readable artifacts in this worktree.
8. Generate a Repo Graph packet describing this exact root, branch, commit,
   and dirty-path state.
9. Ingest verified observations into Context Graph v2 and run citation-bearing
   recall for the catalog decisions.

## Scope out

- UI or runtime source changes.
- Package or lockfile changes.
- Installing dependencies.
- Wallet, payment, contract, registry, publication, or deployment writes.
- Choosing Supabase, Postgres, a contract, Statement Store, Bulletin, or any
  other persistence system before the catalog evidence is evaluated.
- Treating registry descriptions, README claims, simulator output, or a copied
  catalog as runtime proof.
- Editing or copying catalog claims from another ChopDot checkout.

## Required artifacts

- `docs/research/RESEARCH-002_PARITY_PRODUCTS_DEVNET_CAPABILITY_CATALOG.md`
- `docs/research/PARITY_PRODUCTS_DEVNET_CATALOG.json`
- `docs/research/CHOPDOT_PLATFORM_OPPORTUNITY_MATRIX.md`
- `docs/research/LIVE_DEVNET_REGISTRY_REFRESH.md`
- `docs/research/devnet-registry-snapshots/<timestamp>.json`
- `docs/research/parity-repository-snapshots/<timestamp>.json`
- `docs/research/evidence/primary-source-ledger.json`
- `docs/research/README.md`
- `docs/CODEX_PLATFORM_CATALOG_ADDENDUM.md`
- `docs/CHOPDOT_V1_EXECUTION_BOARD.md`
- `artifacts/agentops/catalog-kgv2-recall.json`
- `artifacts/agentops/catalog-repo-graph-packet.json`
- `artifacts/agentops/catalog-verification-report.md`

## Evidence schema

Every catalog record SHALL include:

- stable record ID and canonical name;
- source URL and source owner;
- observation timestamp;
- immutable commit, content hash, block/hash, CID, or an explicit reason none
  was obtainable;
- classification and inclusion/exclusion reason;
- capability and authority boundary;
- persistence and recovery behavior when relevant;
- network, contract, SDK, and host version when relevant;
- license and maintenance signals;
- verification method and verification status;
- confidence and limitations;
- ChopDot decision, prerequisites, falsifier, and next check.

## Requirements

### R1 — Complete repository universe

The machine catalog SHALL preserve every repository returned by the official
organization API. Pagination counts and response digests SHALL be recorded.

### R2 — Complete observed registry universe

The live snapshot SHALL preserve every row exposed by the selected official or
application-owned registry read path. Counts by deployment/publication state
SHALL reconcile to the snapshot total.

### R3 — No discovery-as-proof

Registry descriptions and repository topics SHALL be labeled discovery
evidence. Architecture claims SHALL cite inspected source, official docs, or a
newly executed runtime check.

### R4 — Network and version specificity

Every adoption candidate SHALL state the observed network/genesis, contract or
service identity, package family, host compatibility, and freshness boundary,
or explicitly remain `INVESTIGATE`.

### R5 — Reuse diligence

Every source donor SHALL state license, maintenance status, security/audit
signal, and whether ChopDot may copy code, adapt a pattern, or only use it as a
research lead.

### R6 — Exact-worktree graph identity

The Repo Graph packet SHALL report the launch worktree root, branch, HEAD,
dirty-path evidence, packet digest, and citations to the new artifacts. A
packet for `/Users/devinsonpena/ChopDot` does not satisfy this requirement.

### R7 — KGv2 cited recall

Context Graph v2 SHALL return non-empty verified facts for the exact branch,
including the catalog boundary and at least two ChopDot adoption decisions.
Every returned fact SHALL retain a source path and source hash from this
worktree. Automatic KGv1 fallback does not satisfy this requirement.

## Scenarios

### Scenario: repository census reconciles

GIVEN the official organization API reports a public-repository total
WHEN all pages are fetched and normalized
THEN the snapshot contains exactly that many unique repository records and no
record disappears because it was judged irrelevant.

### Scenario: registry census reconciles

GIVEN DotMetrics or its application-owned registry source exposes live rows
WHEN the bounded read-only refresh runs
THEN each observed row is stored once with network and observation context and
the category counts equal the total.

### Scenario: source claim remains bounded

GIVEN a registry description says an app uses a capability
WHEN no source commit or runtime proof confirms the implementation
THEN the catalog labels the claim `discovery_only` and does not promote an
adoption decision from it.

### Scenario: KG knows the exact outcome

GIVEN the catalog artifacts exist only as dirty files in the launch worktree
WHEN Repo Graph ingests them and KGv2 compiles a branch-specific context packet
THEN recalled facts cite those exact paths and hashes and report the worktree's
actual dirty identity rather than the canonical checkout.

## Verification

1. Validate JSON syntax and schema-required fields.
2. Reconcile repository and registry counts and uniqueness.
3. Verify every cited local path and source hash.
4. Run the bounded AgentOps integration preflight.
5. Build the Repo Graph packet for the exact worktree.
6. Ingest only verified catalog observations into KGv2.
7. Run branch-specific KGv2 recall and assert non-empty cited facts with no
   fallback.
8. Confirm `package.json`, `package-lock.json`, UI, membership, money, payment,
   protected-key, and verified-contact files were not changed by this task.

## Falsifiers

Stop and leave the gate open if:

- source universes cannot be enumerated or reconciled;
- a live registry read cannot be pinned to a network and observation time;
- source ownership, license, or version cannot be distinguished from inference;
- the graph packet points to another checkout;
- KGv2 is degraded, empty, uncited, or falls back to KGv1;
- completing the task would require a deployment, payment, registry write, or
  package installation.

## Documentation impact

This task creates architecture/research source documents and an execution-board
entry. The launch worktree does not contain the current `docs/wiki/` or
`docs/adr/` system, so no generated wiki files will be copied from another
checkout. The verification report SHALL record that gap for reconciliation
when this branch is integrated into the current canonical source.
