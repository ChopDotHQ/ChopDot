# Research — Product Model, Traceability and Graph Techniques

## Question

Would a product/knowledge graph help ChopDot build smarter, or would it recreate the complexity tax experienced in the earlier AgentOps KG Workbench?

## Current ChopDot evidence

ChopDot already has several graph-shaped assets:

- `prototypes/experience-workbench/registry/journeys.json` — 28 journeys and explicit `next` relationships.
- `registry/features.json` — features mapped to journeys.
- `journey-map.html` — generated human-readable product map.
- journey specs, contracts, decisions, edge cases and Golden artifacts.
- Phase C1 product-contract artifacts for stable Participant identity and rail-neutral SpendIntent semantics.
- `docs/implementation-map.md` — journey-to-production targets.
- tests, workflow runs, evidence artifacts and approval records.

This means the useful semantic facts already exist. The main problem is **joining them reliably** and preventing duplicated/stale projections.

A concrete drift example already exists: current `registry/progress.json` says 28/28 journeys are complete and `current_journey=null`, while the older `registry/state-snapshot.json` still describes seven Goldens and Journey 10 as current. This is not a reason to add another authority source; it is evidence that **a fact must have one owner and all other views should be derived**.

---

## External patterns reviewed

### 1. Software catalogs: stable mental model, ownership and high-level relations

Backstage models software using first-class entities such as Components, APIs, Resources, Systems and Domains. Catalog metadata is commonly stored with source code and harvested into a discoverable catalog. The important pattern is not the Backstage product itself; it is a **small, stable human mental model** with explicit relationships and ownership.

Sources:
- https://backstage.io/docs/features/software-catalog/system-model/
- https://backstage.io/docs/features/software-catalog/
- https://backstage.io/docs/features/software-catalog/extending-the-model/

Implication for ChopDot: model only product concepts humans need to reason about. Do not inventory every possible fact.

### 2. Derived dependency graphs: compute what code can prove

Nx builds a project graph from the workspace and source, uses it for affected analysis and task ordering, and can export the graph as JSON. GitHub builds dependency graphs from manifests, lock files and submitted build information, including direct and transitive dependencies.

Sources:
- https://nx.dev/docs/features/explore-graph
- https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-graph
- https://docs.github.com/en/code-security/concepts/supply-chain-security/dependency-graph-data

Implication for ChopDot: **never manually maintain relationships that source code, manifests or CI can derive reliably**.

### 3. Models as code: one model, many views

Structurizr is designed around one architecture model that generates multiple C4 views and can export to formats such as Mermaid. The key lesson is that diagrams should be projections, not independent truth.

Sources:
- https://docs.structurizr.com/
- https://docs.structurizr.com/getting-started
- https://docs.structurizr.com/as-code

Implication for ChopDot: Mermaid, HTML journey maps, impact views and agent packets should be regenerated from the model and be disposable.

### 4. Decision records: graph edges should not carry all rationale

Architecture Decision Records preserve a decision, its context and consequences. A later decision supersedes rather than rewrites the historical record.

Source:
- https://martinfowler.com/bliki/ArchitectureDecisionRecord.html

Implication for ChopDot: a relation such as `SpendIntent MUST_NOT_REUSE PaymentIntent` can point to a decision record; the graph should not become a prose database.

### 5. State machines are different from product graphs

XState represents application logic as state machines/statecharts. Its graph utilities can traverse machines, generate paths, support model-based testing and test reachable states/transitions.

Sources:
- https://stately.ai/docs/xstate
- https://stately.ai/docs/graph
- https://stately.ai/docs/testing

Implication for ChopDot: use a product/traceability graph to answer **what relates to what**; use state machines for money/identity flows to answer **what may legally happen next**. Do not collapse both concerns into one abstraction.

---

## Lessons from `Devpen787/agentops-kg-workbench`

The earlier Workbench solved a much larger problem than ChopDot needs. Its architecture included:

1. Repository Graph extraction.
2. AgentOps Knowledge Graph projection.
3. append-only/bitemporal Context Graph authority in PostgreSQL.
4. rebuildable AGE, Neo4j, Jena and file-backed projections.
5. context hydration across repositories, agents, skills, tasks, gates and evidence.
6. a read-only MCP surface.

The snapshot contained hundreds of graph entities and relations, multiple memory classes, authority/projection separation, temporal truth and cross-repository learning concerns.

What was valuable:

- structured context instead of pure search;
- requirement/code/test traceability;
- explicit provenance and authority boundaries;
- generated projections;
- evaluation instead of assuming graph complexity automatically helps.

What created drag:

- operating persistent authority and projection layers;
- projection consistency and migration concerns;
- ontology expansion;
- multiple storage/query technologies;
- event sourcing and bitemporal semantics;
- cross-repository and agent-memory requirements;
- platform work that was only indirectly related to shipping an end product.

The Workbench's own due diligence records a key lesson: graph-shaped hydration improved tested cases, but graph storage alone did not prove retrieval quality, and several speed/token benefits were incomplete or estimated. Evaluation had to remain separate from storage choice.

Relevant internal reference:
- `Devpen787/agentops-kg-workbench/current/architecture.md`
- `Devpen787/agentops-kg-workbench/current/source/openspec/changes/upgrade-agentops-context-graph-v2/due-diligence.md`

---

## Synthesis

The research supports a **hybrid** approach:

### Human-authored / approved facts

- journeys;
- product capabilities/features;
- domain concepts;
- product contracts;
- invariants;
- explicit product dependencies;
- decisions and authority boundaries;
- required recovery semantics.

### Machine-derived facts

- imports/module dependencies;
- package dependencies;
- route ownership;
- test references;
- workflow status and evidence identifiers;
- code ownership where mechanically known;
- Git ancestry/checksums;
- later, observed runtime calls/telemetry.

### Generated views

- Mermaid graph;
- HTML experience map;
- impact report;
- agent context packet;
- traceability/coverage report;
- integrated-preview routing metadata.

The graph itself should be a **rebuildable index**, not a new source of product truth.

---

## Main research conclusion

The right move for ChopDot is **not** a general-purpose product knowledge-graph platform.

The right move is to add **graph techniques** to the existing Git-native product authority:

- keep existing authoritative files as owners of facts;
- add the smallest amount of explicit traceability metadata that cannot be derived;
- generate a disposable graph/index;
- use it for impact analysis, agent context and traceability;
- measure whether it reduces discovery time, context size and missed dependencies;
- stop if graph maintenance becomes its own workstream.
