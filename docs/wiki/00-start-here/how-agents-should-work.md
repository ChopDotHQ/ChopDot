---
title: How Agents Should Work
status: current
owner: Dev
last_reviewed: 2026-07-05
review_frequency: monthly
source_of_truth: false
related_code:
  - scripts/chopdot-product-cockpit.mjs
  - scripts/validate-journey-reviews.mjs
related_docs:
  - AGENTS.md
  - product/story-map.md
  - product/cards.md
  - product/journey-review-plan.md
tags:
  - start-here
  - agents
  - workflow
---

# How Agents Should Work

Agents should build from product truth, not from whichever file is easiest to find.

## Default Route

1. Read the relevant wiki page.
2. Follow links to source truth.
3. Check the story map for product sequence.
4. Check the product card for execution state.
5. Apply the product gate and effortless app gate.
6. Implement only the requested slice.
7. Run tests and screenshot/user-flow review when user-facing.
8. State documentation impact before calling the work done.

## Do Not

- Treat generated files as source truth.
- Use Polkadot/native terms in normal UI.
- Add screens before locking state.
- Promote happy-path tests without hard-path evidence.

## Source Truth

- `AGENTS.md`
- `product/product-principles.md`
- `product/journey-review-plan.md`

