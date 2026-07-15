---
title: KG Is Index Not Source Of Truth
status: current
owner: Dev
last_reviewed: 2026-07-05
review_frequency: quarterly
source_of_truth: true
related_code: []
related_docs:
  - docs/wiki/README.md
  - docs/agentops_kg_bridge.md
tags:
  - adr
  - kg
  - agentops
---

# ADR 0002: KG Is Index Not Source Of Truth

## Decision

Knowledge graphs, generated indexes, and agent context files may route agents to truth, but they must not become canonical truth.

## Context

Generated or retrieved context can drift. ChopDot needs agents to find current files while preserving repo-local product, engineering, and evidence discipline.

## Consequences

- Source truth lives in repo docs, code, tests, product cards, journey reviews, and ADRs.
- Generated wiki files must carry generated markers.
- Agents must follow links back to source files before making claims or changes.

