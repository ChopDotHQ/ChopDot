# Decision — Graph Techniques Without Graph Infrastructure

Status: **accepted direction for a bounded V1 experiment**  
Date: 2026-09-16

## Context

ChopDot now has 28/28 approved user journeys plus Phase C1 product-contract work. The next phase requires integrating those journeys into one coherent product and then implementing them safely in production.

The problem is no longer missing UX definitions. The problem is **context assembly and impact reasoning**:

- what depends on a changed product concept;
- which journeys consume a contract;
- which code owns the behavior;
- which tests/evidence verify it;
- what recovery semantics apply;
- what an agent needs to read for one task without loading the whole repository.

The earlier AgentOps KG Workbench proved that structured graph-shaped context can help, but also proved that a general knowledge-graph platform can become a second product to operate.

## Decision

ChopDot will use **graph techniques as a generated traceability/index layer over existing authoritative files**.

ChopDot will **not** build or adopt a persistent knowledge-graph platform for Product Model V1.

### V1 node classes

Only five first-class classes are required initially:

1. `Journey`
2. `Feature`
3. `ContractOrInvariant`
4. `Implementation`
5. `Test`

Additional classes require evidence that a concrete query cannot be answered cleanly without them.

### V1 relationship classes

Start with the smallest useful vocabulary:

- `LEADS_TO`
- `USES`
- `GOVERNED_BY`
- `IMPLEMENTED_BY`
- `TESTED_BY`
- `RECOVERS_VIA`

No ontology expansion is allowed merely for elegance.

## Authority model

A fact must have exactly one authoritative owner.

| Fact | Authority |
| --- | --- |
| journey identity/status/next edges | canonical journey/progress registries |
| feature-to-journey membership | canonical feature registry |
| product semantics | approved specs/contracts/Goldens |
| Phase C1 guest/spend law | approved Phase C1 contracts |
| implementation dependency | source code/build metadata where derivable |
| package dependency | manifest/lockfile/build evidence |
| test result | test runner / CI evidence |
| approval | exact approval record |
| generated graph / Mermaid / HTML view | **never authority** |

If the same fact appears in two hand-maintained places, V1 should remove or derive one of them rather than reconcile both forever.

## Provenance classes

Every graph relation should be distinguishable as one of:

- `DECLARED` — human-authored semantic relationship;
- `DERIVED` — calculated from code/config/build metadata;
- `APPROVED` — bound to explicit product/contract authority;
- `OBSERVED` — later, runtime evidence from telemetry.

`OBSERVED` is reserved for future production telemetry and is not required for Product Model V1.

## Separation of concerns

### Product graph

Answers: **what relates to what?**

Examples:

- J04 uses Membership.
- J04 is governed by GUEST-01.
- J04 recovers via J28.

### State machines

Answer: **what may legally happen next from this exact state?**

Identity linking, settlement, SpendIntent and recovery may use explicit state-machine models where useful. These machines can generate path/test coverage but do not replace the product traceability graph.

### Decision records

Answer: **why was this rule chosen?**

Reasoning should live in short decision records/docs and be referenced from the model rather than embedded as large prose fields in graph nodes.

## V1 storage/implementation decision

No graph database.

No new service.

No vector database.

No embeddings.

No MCP server.

No event-sourced graph authority.

No bitemporal database.

No cross-repository graph.

No interactive graph editor.

No manually maintained duplicate code-dependency graph.

Use the existing registries/contracts plus **at most one small supplemental traceability registry** for semantic links that are not already represented elsewhere.

A deterministic compiler creates generated graph/index outputs.

## Required V1 user value

Product Model V1 must earn its existence through three concrete capabilities:

1. **Impact** — what can break if concept X changes?
2. **Context** — what exact product/code/test neighborhood should an agent receive for task X?
3. **Traceability** — show product authority → implementation → verification for X.

Everything else is optional and deferred.

## Integrated Product Preview relationship

The Product Model V1 must **not block** the integrated J01–J28 product preview.

The preview and model work may proceed in parallel. The preview may consume existing journey routing immediately and adopt generated model output only when it is proven stable and useful.

## Hard stop rules

Stop or shrink the experiment if any of the following becomes true:

- it requires operating a database/service to provide basic value;
- graph maintenance becomes a recurring engineering lane;
- agents spend material time repairing metadata/ontology rather than product work;
- a generated projection starts being treated as product authority;
- humans must maintain edges that code can derive;
- the design starts requiring event sourcing, bitemporality, embeddings, MCP, distributed writers or backend bake-offs;
- benchmark tasks show no meaningful improvement in discovery/context/review quality.

## Revisit triggers for real graph infrastructure

A persistent graph backend may be reconsidered only when at least one measured need appears, such as:

- many repositories/teams publishing independent metadata;
- thousands to tens of thousands of useful graph entities;
- frequent arbitrary graph queries that are cumbersome in the generated index;
- historical/temporal graph queries become operationally necessary;
- runtime telemetry and deployment topology need interactive correlation;
- access-controlled graph subsets become a real organizational requirement.

Until then, graph storage is not the problem to solve.

## Consequence

This decision intentionally keeps the useful discipline learned from the AgentOps KG Workbench — structured context, provenance, traceability and evaluation — while rejecting most of the platform machinery that made the earlier system complicated.
