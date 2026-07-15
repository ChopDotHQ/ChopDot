---
title: ChopDot Wiki
status: current
owner: Dev
last_reviewed: 2026-07-06
review_frequency: monthly
source_of_truth: true
related_code: []
related_docs:
  - product/product-principles.md
  - product/story-map.md
  - product/journey-review-plan.md
  - docs/wiki/08-context-intake/context-intake.md
tags:
  - wiki
  - agents
  - routing
---

# ChopDot Wiki

This is the repo-native routing layer for ChopDot.

The wiki helps humans and agents find product truth, state models, journey reviews, quality gates, and native Polkadot boundaries without treating generated status or old research as current truth.

## Rules

- Markdown in this folder is internal build guidance, not public docs.
- The wiki points to source truth; it does not replace `product/`, `docs/`, code, tests, or ADRs.
- Generated files are read models and must not be edited by hand.
- Meaningful product, architecture, native, quality, or agent-workflow changes must state whether wiki or ADR updates are needed.

## Start Here

- `docs/wiki/00-start-here/what-is-chopdot.md`
- `docs/wiki/00-start-here/current-product-state.md`
- `docs/wiki/00-start-here/how-agents-should-work.md`
- `docs/wiki/08-context-intake/context-intake.md`
- `docs/wiki/index.generated.md`
- `docs/wiki/agent-context.generated.md`

## Import Context

Use context intake when important work happens in another Codex thread, side agent, AI Studio run, or AgentOps report.

```bash
npm run wiki:ingest-thread -- --thread-id=THREAD --title="Title" --summary="Summary"
npm run wiki:sync
```

Thread imports route attention. They do not replace product cards, journey reviews, tests, screenshots, or ADRs.
