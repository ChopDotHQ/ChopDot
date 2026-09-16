# Plan — ChopDot Product Model V1

Status: **bounded implementation plan; no production authority change**

## Goal

Make ChopDot easier for humans and agents to understand and change by adding a lightweight, generated traceability graph over existing product authority.

The V1 must improve:

- impact analysis;
- task-scoped agent context;
- product → implementation → test traceability;
- detection of stale duplicate projections.

It must not become a new product platform.

---

## Delivery strategy

The Product Model V1 runs **alongside**, not ahead of, the Integrated Product Preview.

Do not hold the preview waiting for a perfect graph. Build only enough model capability to help the next real tasks.

---

## Phase 0 — Benchmark before adding machinery

Create five representative tasks from real ChopDot work:

1. change a Participant/guest rule;
2. change an expense behavior;
3. change payment-method behavior;
4. investigate a recovery/failure path;
5. implement one integrated-preview transition.

For each baseline task record approximately:

- files inspected;
- context/tokens supplied to the agent;
- time to locate relevant product/code/test surfaces;
- irrelevant files read;
- dependencies missed;
- reviewer corrections caused by missed context.

This gives Product Model V1 a falsifiable success test.

---

## Phase 1 — Normalize authority and remove duplicate truth

### 1.1 Authority inventory

Declare exact owners for:

- journey status and routing;
- feature membership;
- product contracts/invariants;
- Phase C1 guest/spend contracts;
- implementation mapping;
- tests/evidence;
- approvals.

### 1.2 Drift cleanup

Resolve stale duplicated projections such as `registry/state-snapshot.json` by either:

- generating them from canonical authority; or
- removing/deprecating them as authority-bearing surfaces.

Do not manually synchronize duplicate status files indefinitely.

### Acceptance

`npm run gate` plus a new authority-consistency check can identify stale projections rather than silently allowing them.

---

## Phase 2 — Minimal traceability compiler

### Inputs

Reuse existing authoritative files first:

- `registry/journeys.json`
- `registry/features.json`
- `registry/progress.json`
- approved specs/contracts/Goldens
- Phase C1 contract/acceptance records
- implementation map
- test/config metadata where mechanically discoverable

Allow **at most one** supplemental human-edited registry for semantic relationships not represented anywhere else, e.g.:

`prototypes/experience-workbench/registry/traceability.json`

That file must reference stable IDs and must not duplicate full node definitions.

### Compiler

Add a deterministic script, tentatively:

`tools/build-product-model.mjs`

Responsibilities:

- load canonical sources;
- normalize stable IDs;
- build nodes/edges;
- label provenance (`DECLARED`, `DERIVED`, `APPROVED`);
- reject dangling references;
- reject duplicate semantic ownership;
- produce deterministic output;
- expose enough metadata to trace every generated relation back to its source.

### Generated outputs

Tentative non-authoritative outputs:

- `.generated/product-model.json`
- `.generated/product-model.mmd`
- `.generated/product-traceability.json`

Generated outputs may be committed for inspection only if existing repo conventions benefit from it; otherwise generate in CI/on demand.

### V1 node types

- Journey
- Feature
- ContractOrInvariant
- Implementation
- Test

### V1 relations

- LEADS_TO
- USES
- GOVERNED_BY
- IMPLEMENTED_BY
- TESTED_BY
- RECOVERS_VIA

No additional type/relation without a concrete query that needs it.

---

## Phase 3 — Three user-facing commands only

### Impact

`npm run product:impact -- Participant`

Returns affected journeys, contracts, implementation surfaces and tests with provenance.

### Context

`npm run product:context -- J14`

Returns a compact task packet containing the relevant graph neighborhood, exact authority files, implementation owners, tests and known recovery relationships.

### Trace

`npm run product:trace -- J04`

Returns the chain from approved product authority through implementation to verification evidence where known.

These are the only required V1 query surfaces.

No general graph query language is required.

---

## Phase 4 — Generated views

Use the same model/index to generate or validate:

1. Mermaid product graph;
2. existing `journey-map.html` relationships;
3. traceability/coverage report;
4. agent context packets.

The Mermaid/HTML views remain projections and can be deleted/regenerated.

The existing integrated preview may consume generated routing only after equivalence with canonical `journeys.json` is proven.

---

## Phase 5 — Targeted state-machine experiments

Do **not** convert the entire product to state machines.

Pick at most one high-value critical flow first, likely one of:

- guest → account linking; or
- SpendIntent execution/reconciliation.

Evaluate whether an explicit XState/statechart model materially improves:

- transition clarity;
- reachable-state validation;
- model-based path generation;
- fault/recovery test coverage.

If useful, keep state-machine logic as a separate behavioral model linked from the Product Model. Do not make the graph itself responsible for legal transition semantics.

---

## Success metrics

After V1, repeat the five Phase-0 benchmark task classes.

Targets are directional, not vanity metrics:

- **≥25% reduction** in files/context loaded for scoped agent tasks where the graph is relevant;
- no increase in missed dependencies;
- fewer reviewer corrections caused by omitted adjacent context;
- impact/context/trace commands answer the benchmark questions without full-repo archaeology;
- graph/model compilation adds negligible local/CI friction;
- normal product changes require little or no graph-specific manual maintenance beyond semantic links that cannot be derived.

A smaller measurable improvement is acceptable if maintenance cost is near zero. A large architecture with unclear benefit is not.

---

## Maintenance budget

Product Model V1 should fit inside a small bounded engineering increment, not become a programme.

Initial implementation checkpoint: roughly **4–8 engineering hours of focused work** before deciding whether to extend it.

A normal product change should not need more than a few minutes of graph-specific work. Ideally most changes need none because relationships are derived.

---

## Stop criteria

Shrink or remove Product Model V1 if, after the benchmark:

- context/discovery improves little or not at all;
- agents spend >10% of a normal scoped task repairing graph metadata;
- adding a product feature routinely requires touching multiple graph-only files;
- graph schema discussions become a critical-path dependency;
- the compiler requires a database/service for core functionality;
- generated views drift from authority and cannot be made deterministic;
- the graph becomes a second approval or product-truth surface.

Deleting the generated graph must never delete product truth.

---

## Explicit V1 non-goals

- knowledge graph database;
- Neo4j/AGE/Jena/Kuzu/Ladybug adoption;
- PostgreSQL event authority;
- embeddings/vector search;
- autonomous fuzzy fact extraction;
- cross-repository AgentOps memory;
- bitemporal fact lifecycle;
- MCP service;
- developer portal;
- runtime telemetry graph;
- general ontology platform;
- graph editor UI.

These require separate measured justification later.

---

## Relationship to Integrated Product Preview

The integrated J01–J28 preview remains the next product-facing objective.

Recommended sequence:

1. keep the sealed 28-Golden + C1 authority untouched;
2. start the Integrated Product Preview using existing canonical journey routing;
3. execute Product Model V1 Phase 0–3 in parallel;
4. use the graph/index immediately on preview implementation tasks;
5. benchmark whether it actually improves agent work;
6. only then add generated-view/state-machine refinements that proved useful;
7. use the resulting preview + traceability as inputs to the separate production-start decision.

---

## V1 acceptance checklist

- [ ] authority inventory documented;
- [ ] stale duplicate status projection handled;
- [ ] compiler is deterministic;
- [ ] no dangling graph references;
- [ ] graph relations expose source/provenance;
- [ ] `product:impact` works on at least the five benchmark concepts;
- [ ] `product:context` produces a bounded agent packet;
- [ ] `product:trace` links at least J04 and one money journey through implementation/tests;
- [ ] Mermaid can be generated from the index;
- [ ] existing journey map relationships remain equivalent;
- [ ] no database/service/new authority introduced;
- [ ] benchmark rerun completed;
- [ ] explicit keep/shrink/remove decision recorded from measured results.
