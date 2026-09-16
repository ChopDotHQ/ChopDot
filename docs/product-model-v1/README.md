# ChopDot Product Model V1

Status: **planning / bounded experiment**  
Base authority inspected: `ux/experience-workbench@9128bb55d8aed29b5c31fb6d769af39f2651cb76`  
Branch: `research/product-model-v1`

This package records the research, reasoning, decision and implementation plan for adding **graph capabilities without graph infrastructure** to ChopDot.

It does **not** change product semantics, the 28 approved Goldens, Phase C1 contracts, production implementation authority, Product Integrator state, payment/provider choices, deployment state, or runtime behavior.

## Read in this order

1. [`RESEARCH.md`](RESEARCH.md) — external patterns, ChopDot evidence, and lessons from the earlier AgentOps KG Workbench.
2. [`DECISION.md`](DECISION.md) — the chosen architecture and hard guardrails.
3. [`PLAN.md`](PLAN.md) — bounded Product Model V1 execution plan, measurements, acceptance criteria, and stop rules.

## Decision in one sentence

**Use graph techniques as a disposable, generated index over existing authoritative ChopDot files; do not build or operate a knowledge-graph platform.**

## Why now

ChopDot has reached 28/28 approved journeys plus Phase C1 product-contract work. The next challenge is integration: understanding impact across journeys, contracts, implementation, tests and recovery without forcing each agent to rediscover the same relationships repeatedly.

The Product Model V1 is only justified if it makes those tasks faster and safer. It must be removable without losing product truth.
