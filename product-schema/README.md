# ChopDot Product Schema V1

Status: **Claude-round-2 hardened candidate — schema checks may PASS while Gate B readiness is BLOCKED**

Current authored schema:
- `frozen-baseline.json`
- `semantic-core.json`
- `composition-graph.json`
- `gate-b-authority-oracle.json`

Current review note:
- `SCHEMA_CLAUDE_ROUND2_HARDENING.md`

Recovered approved evidence:
- `recovered-evidence/j05-v1-approved-candidate.html`

Generated Gate B construction:
- `generated/gate-b-construction.json`
- `generated/GATE_B_CONSTRUCTION.md`
- `generated/completeness-report.json`

A schema PASS means the model is internally/provenance consistent under the current checks. Gate B readiness is derived separately from authority blockers and unresolved product-decision gaps. The current intended readiness after this pass is **BLOCKED** only by `POLICY-EXPENSE-LOCK-SCOPE` until the human product owner chooses the lock boundary.
