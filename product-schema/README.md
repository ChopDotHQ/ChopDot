# ChopDot Product Schema V1

Status: **adversarially hardened candidate — schema PASS, Gate B BLOCKED on explicit authority/product-decision items**

Authored schema:
- `frozen-baseline.json` — frozen authority/provenance, resolved artifact pointers and authority blockers.
- `semantic-core.json` — semantic objects, operations, laws and explicit known gaps.
- `composition-graph.json` — contexts, journey wiring, single-owner composition units and gate references.
- `gate-b-authority-oracle.json` — independent frozen-authority expectations used only for hostile verification.

Generated views:
- `generated/completeness-report.json`
- `generated/gate-b-construction.json`
- `generated/GATE_B_CONSTRUCTION.md`

Verification:
- Stages 1–4
- `verify-schema-hardening.mjs`
- `mutation-battery.mjs`

The schema never authorizes Gate B, production, Product Integrator, protected merge or deployment. Current generated Gate B readiness is intentionally BLOCKED until its explicit authority/product-decision blockers are resolved.
