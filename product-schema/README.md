# ChopDot Product Schema V1

Status: **Stage 4 — completeness audit PASS; Gate B construction view derived**

This branch is a derived composable schema over the already-approved ChopDot product. It is not product authority and does not itself authorize Gate B implementation.

## Program

1. **Frozen inventory — complete.**
2. **Semantic normalization — complete.**
3. **Composition wiring — complete.**
4. **Completeness / Gate B derivation — PASS.** Audit the graph and mechanically derive the Gate B construction packet.

## Canonical authored schema

- `frozen-baseline.json` — Stage 1 provenance/inventory.
- `semantic-core.json` — Stage 2 product meaning.
- `composition-graph.json` — Stage 3 wiring/gates.

## Generated Stage 4 views

- `generated/completeness-report.json`
- `generated/gate-b-construction.json`
- `generated/GATE_B_CONSTRUCTION.md`

Run `node product-schema/derive-stage-4.mjs` to reproduce the generated views. The workflow verifies Stages 1–4 and generated-output determinism.

## Non-negotiable

- Frozen Goldens/journey semantics and accepted Gate A bytes remain unchanged.
- Gate integration status is separate from design approval.
- Schema-derived PASS is not implementation/deployment authorization.
- Research branches are lessons, not product authority.
- Unknown/unselected implementation policy remains explicit.
